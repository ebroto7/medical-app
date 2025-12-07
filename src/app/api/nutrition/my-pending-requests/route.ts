import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";

// GET - Pending requests SENT by the nutritionist to patients
export async function GET() {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Require nutritionist role
    await requireRole(user.id, ["nutritionist"]);

    // 3. Get pending requests sent by this nutritionist
    const supabase = await createClient();
    const { data: requests } = await supabase
      .from("nutritionist_requests")
      .select("id, status, created_at, patient_id")
      .eq("nutritionist_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!requests || requests.length === 0) {
      return Response.json({ data: [] });
    }

    // Get patient profiles
    const patientIds = requests.map((r) => r.patient_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", patientIds);

    const profileMap: Record<string, { id: string; full_name: string | null }> = {};
    (profiles || []).forEach((profile) => {
      profileMap[profile.id] = {
        id: profile.id,
        full_name: profile.full_name,
      };
    });

    const formattedRequests = requests.map((req) => ({
      id: req.id,
      createdAt: req.created_at,
      patient: profileMap[req.patient_id] || { id: req.patient_id, full_name: null },
    }));

    return Response.json({ data: formattedRequests });
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
