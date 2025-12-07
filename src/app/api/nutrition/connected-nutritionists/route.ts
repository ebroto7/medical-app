import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";

export async function GET() {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Require patient role
    await requireRole(user.id, ["patient"]);

    // 3. Get connected nutritionists for this patient
    const supabase = await createClient();
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

    const formattedNutritionists = (profiles || []).map((profile) => ({
      id: profile.id,
      fullName: profile.full_name || "Nutricionista",
    }));

    return Response.json({ data: formattedNutritionists });
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
