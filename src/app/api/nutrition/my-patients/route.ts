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

  const { data: connections } = await supabase
    .from("patient_nutritionist_connections")
    .select("id, patient_id, connected_at")
    .eq("nutritionist_id", user.id)
    .order("connected_at", { ascending: false });

  if (!connections || connections.length === 0) {
    return Response.json({ data: [] });
  }

  // Get patient profiles
  const patientIds = connections.map((c) => c.patient_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", patientIds);

  const profileMap: Record<string, { id: string; fullName: string }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (profiles || []).forEach((profile: any) => {
    profileMap[profile.id] = {
      id: profile.id,
      fullName: profile.full_name || "Paciente",
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedConnections = connections.map((conn: any) => ({
    connectionId: conn.id,
    patient: profileMap[conn.patient_id] || {
      id: conn.patient_id,
      fullName: "Paciente",
    },
    connectedAt: conn.connected_at,
  }));

  return Response.json({ data: formattedConnections });
}
