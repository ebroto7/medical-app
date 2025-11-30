import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: requests } = await supabase
    .from("nutritionist_requests")
    .select("id, status, created_at, nutritionist_id")
    .eq("patient_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!requests || requests.length === 0) {
    return Response.json({ data: [] });
  }

  // Get nutritionist profiles
  const nutritionistIds = requests.map((r) => r.nutritionist_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", nutritionistIds);

  const profileMap: Record<string, { id: string; email: string; full_name: string }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (profiles || []).forEach((profile: any) => {
    profileMap[profile.id] = {
      id: profile.id,
      full_name: profile.full_name,
      email: "",
    };
  });

  const formattedRequests = requests.map((req) => ({
    id: req.id,
    createdAt: req.created_at,
    nutritionist: {
      id: req.nutritionist_id,
      email: profileMap[req.nutritionist_id]?.email || "",
      fullName: profileMap[req.nutritionist_id]?.full_name || "",
    },
  }));

  return Response.json({ data: formattedRequests });
}
