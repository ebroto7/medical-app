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

  // Get connected nutritionists for this patient
  const { data: connections } = await supabase
    .from("patient_nutritionist_connections")
    .select("nutritionist_id")
    .eq("patient_id", user.id);

  if (!connections || connections.length === 0) {
    return Response.json({ data: [] });
  }

  const nutritionistIds = connections.map((c) => c.nutritionist_id);

  // Get nutritionist profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", nutritionistIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedNutritionists = (profiles || []).map((profile: any) => ({
    id: profile.id,
    fullName: profile.full_name || "Nutricionista",
  }));

  return Response.json({ data: formattedNutritionists });
}
