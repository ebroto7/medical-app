import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole, canAccessPatientData } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return Response.json({ error: "patientId required" }, { status: 400 });
    }

    // 1. Require authentication
    const user = await requireAuth();

    // 2. Require nutritionist role
    await requireRole(user.id, ["nutritionist"]);

    // 3. Check if nutritionist can access this patient's data
    const hasAccess = await canAccessPatientData(user.id, patientId);

    // For patient-status, nutritionist needs to check before connecting,
    // so we allow checking status even without existing connection
    // But we still verify the user is a nutritionist

    // 4. Get patient connection status
    const supabase = await createClient();
    const { data: connections } = await supabase
      .from("patient_nutritionist_connections")
      .select("nutritionist_id")
      .eq("patient_id", patientId);

    const hasNutritionist = connections && connections.length > 0;
    let linkedNutritionistId = null;
    let isMyPatient = false;

    if (hasNutritionist) {
      linkedNutritionistId = connections[0].nutritionist_id;
      isMyPatient = linkedNutritionistId === user.id;
    }

    return Response.json({
      data: {
        patientId,
        hasNutritionist,
        linkedNutritionistId: isMyPatient ? linkedNutritionistId : null, // Only show ID if it's their patient
        isMyPatient,
        canAccess: hasAccess,
      },
    });
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
