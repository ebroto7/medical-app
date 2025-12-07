import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";

export async function GET() {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Require nutritionist role
    await requireRole(user.id, ["nutritionist"]);

    // 3. Get patient connections
    const supabase = await createClient();
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
    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = {
        id: profile.id,
        fullName: profile.full_name || "Paciente",
      };
    });

    const formattedConnections = connections.map((conn) => ({
      connectionId: conn.id,
      patient: profileMap[conn.patient_id] || {
        id: conn.patient_id,
        fullName: "Paciente",
      },
      connectedAt: conn.connected_at,
    }));

    return Response.json({ data: formattedConnections });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Access denied: nutritionist role required" }, { status: 403 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
