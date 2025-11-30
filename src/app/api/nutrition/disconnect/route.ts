import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function DELETE(request: Request) {
  const body = await request.json();
  const { otherUserId } = body;

  if (!otherUserId) {
    return Response.json({ error: "otherUserId required" }, { status: 400 });
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

  await supabase
    .from("patient_nutritionist_connections")
    .delete()
    .or(`and(patient_id.eq.${user.id},nutritionist_id.eq.${otherUserId}),and(nutritionist_id.eq.${user.id},patient_id.eq.${otherUserId})`);

  return Response.json({ success: true, message: "Disconnected" }, { status: 200 });
}
