import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";

// GET - List all versions of a meal plan
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: mealPlanId } = await params;
    const supabase = await createClient();

    // Verify access to the meal plan
    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("nutritionist_id, patient_id")
      .eq("id", mealPlanId)
      .single();

    if (!mealPlan) {
      return Response.json({ error: "Pauta no encontrada" }, { status: 404 });
    }

    if (mealPlan.nutritionist_id !== user.id && mealPlan.patient_id !== user.id) {
      return Response.json({ error: "Sin acceso a esta pauta" }, { status: 403 });
    }

    // Get all versions
    const { data: versions, error } = await supabase
      .from("meal_plan_versions")
      .select("id, version_number, name, change_notes, created_at, created_by")
      .eq("meal_plan_id", mealPlanId)
      .order("version_number", { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data: versions || [] });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET a specific version's snapshot
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: mealPlanId } = await params;
    const { version_id } = await request.json();
    const supabase = await createClient();

    // Verify access
    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("nutritionist_id, patient_id")
      .eq("id", mealPlanId)
      .single();

    if (!mealPlan) {
      return Response.json({ error: "Pauta no encontrada" }, { status: 404 });
    }

    if (mealPlan.nutritionist_id !== user.id && mealPlan.patient_id !== user.id) {
      return Response.json({ error: "Sin acceso a esta pauta" }, { status: 403 });
    }

    // Get the version snapshot
    const { data: version, error } = await supabase
      .from("meal_plan_versions")
      .select("*")
      .eq("id", version_id)
      .eq("meal_plan_id", mealPlanId)
      .single();

    if (error || !version) {
      return Response.json({ error: "Versión no encontrada" }, { status: 404 });
    }

    return Response.json({ data: version });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
