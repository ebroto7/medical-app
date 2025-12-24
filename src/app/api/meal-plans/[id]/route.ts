import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ZodError } from "zod";

const updateMealPlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// GET - Get a single meal plan with all its slots
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const supabase = await createClient();

    // Get the meal plan
    const { data: mealPlan, error: planError } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("id", id)
      .single();

    if (planError || !mealPlan) {
      return Response.json({ error: "Pauta no encontrada" }, { status: 404 });
    }

    // Get profile info
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", [mealPlan.patient_id, mealPlan.nutritionist_id]);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const patient = profileMap.get(mealPlan.patient_id) || null;
    const nutritionist = profileMap.get(mealPlan.nutritionist_id) || null;

    // Verify access (nutritionist owner or patient assigned)
    if (mealPlan.nutritionist_id !== user.id && mealPlan.patient_id !== user.id) {
      return Response.json({ error: "Sin acceso a esta pauta" }, { status: 403 });
    }

    // Get slots based on type
    let slots = null;
    let situationalPlans = null;

    if (mealPlan.type === "weekly") {
      const { data } = await supabase
        .from("weekly_plan_slots")
        .select("*")
        .eq("meal_plan_id", id)
        .order("day_of_week")
        .order("sort_order");
      slots = data;
    } else {
      const { data: sitPlans } = await supabase
        .from("situational_plans")
        .select("*")
        .eq("meal_plan_id", id)
        .order("sort_order");

      if (sitPlans) {
        situationalPlans = await Promise.all(
          sitPlans.map(async (plan) => {
            const { data: planSlots } = await supabase
              .from("situational_plan_slots")
              .select("*")
              .eq("situational_plan_id", plan.id)
              .order("sort_order");
            return { ...plan, slots: planSlots || [] };
          })
        );
      }
    }

    return Response.json({
      data: {
        ...mealPlan,
        patient,
        nutritionist,
        weekly_slots: slots,
        situational_plans: situationalPlans,
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update meal plan metadata (nutritionist only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const nutritionist = await requireAuth();
    await requireRole(nutritionist.id, ["nutritionist"]);

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateMealPlanSchema.parse(body);

    const supabase = await createClient();

    // Verify ownership
    const { data: existingPlan } = await supabase
      .from("meal_plans")
      .select("nutritionist_id")
      .eq("id", id)
      .single();

    if (!existingPlan) {
      return Response.json({ error: "Pauta no encontrada" }, { status: 404 });
    }

    if (existingPlan.nutritionist_id !== nutritionist.id) {
      return Response.json({ error: "Sin permiso para editar esta pauta" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("meal_plans")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Solo nutricionistas pueden editar pautas" }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a meal plan (nutritionist only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const nutritionist = await requireAuth();
    await requireRole(nutritionist.id, ["nutritionist"]);

    const { id } = await params;
    const supabase = await createClient();

    // Verify ownership
    const { data: existingPlan } = await supabase
      .from("meal_plans")
      .select("nutritionist_id")
      .eq("id", id)
      .single();

    if (!existingPlan) {
      return Response.json({ error: "Pauta no encontrada" }, { status: 404 });
    }

    if (existingPlan.nutritionist_id !== nutritionist.id) {
      return Response.json({ error: "Sin permiso para eliminar esta pauta" }, { status: 403 });
    }

    // CASCADE will delete related slots
    const { error } = await supabase
      .from("meal_plans")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Solo nutricionistas pueden eliminar pautas" }, { status: 403 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
