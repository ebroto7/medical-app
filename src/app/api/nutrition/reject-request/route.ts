import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return Response.json({ error: "Request ID required" }, { status: 400 });
    }

    // 1. Require authentication
    const user = await requireAuth();

    // 2. Require patient role
    await requireRole(user.id, ["patient"]);

    // 3. Verify request belongs to this patient
    const supabase = await createClient();
    const { data: requestData } = await supabase
      .from("nutritionist_requests")
      .select("patient_id")
      .eq("id", requestId)
      .single();

    if (!requestData || requestData.patient_id !== user.id) {
      return Response.json({ error: "Request not found or unauthorized" }, { status: 403 });
    }

    // 4. Reject request
    await supabase
      .from("nutritionist_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    return Response.json({ success: true, message: "Rejected" }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Access denied: patient role required" }, { status: 403 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
