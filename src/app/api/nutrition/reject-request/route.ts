import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function POST(request: Request) {
  const body = await request.json();
  const { requestId } = body;

  if (!requestId) {
    return Response.json({ error: "Request ID required" }, { status: 400 });
  }

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

  const { data: requestData } = await supabase
    .from("nutritionist_requests")
    .select("patient_id")
    .eq("id", requestId)
    .single();

  if (!requestData || requestData.patient_id !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  await supabase.from("nutritionist_requests").update({ status: "rejected" }).eq("id", requestId);

  return Response.json({ success: true, message: "Rejected" }, { status: 200 });
}
