import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";

export async function GET() {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Require nutritionist role
    await requireRole(user.id, ["nutritionist"]);

    // 3. Get connection requests
    const supabase = await createClient();
    const { data: requests } = await supabase
      .from("nutritionist_requests")
      .select("id, status, created_at, patient_id")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    return Response.json({ success: true, data: requests || [] });
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
