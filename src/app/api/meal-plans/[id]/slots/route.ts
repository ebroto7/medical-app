import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { z } from "zod";
import { ZodError } from "zod";

const weeklySlotSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  meal_type: z.enum(["breakfast", "mid_morning", "lunch", "afternoon_snack", "dinner", "extra"]),
  meal_name: z.string().min(1),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  calories: z.number().optional().nullable(),
  protein: z.number().optional().nullable(),
  carbs: z.number().optional().nullable(),
  fat: z.number().optional().nullable(),
  sort_order: z.number().optional().nullable(),
}).passthrough();

const situationalSlotSchema = z.object({
  situational_plan_id: z.string().uuid(),
  meal_type: z.enum(["breakfast", "mid_morning", "lunch", "afternoon_snack", "dinner", "extra"]),
  meal_name: z.string().min(1),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  calories: z.number().optional().nullable(),
  protein: z.number().optional().nullable(),
  carbs: z.number().optional().nullable(),
  fat: z.number().optional().nullable(),
  sort_order: z.number().optional().nullable(),
}).passthrough();

// Schema for update - more permissive, allows extra DB fields
const weeklySlotUpdateSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  meal_type: z.enum(["breakfast", "mid_morning", "lunch", "afternoon_snack", "dinner", "extra"]),
  meal_name: z.string().min(1),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  calories: z.number().optional().nullable(),
  protein: z.number().optional().nullable(),
  carbs: z.number().optional().nullable(),
  fat: z.number().optional().nullable(),
  sort_order: z.number().optional().nullable(),
}).passthrough();

const situationalSlotUpdateSchema = z.object({
  meal_type: z.enum(["breakfast", "mid_morning", "lunch", "afternoon_snack", "dinner", "extra"]),
  meal_name: z.string().min(1),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  calories: z.number().optional().nullable(),
  protein: z.number().optional().nullable(),
  carbs: z.number().optional().nullable(),
  fat: z.number().optional().nullable(),
  sort_order: z.number().optional().nullable(),
}).passthrough();

const addSlotSchema = z.discriminatedUnion("slot_type", [
  z.object({
    slot_type: z.literal("weekly"),
    slot: weeklySlotSchema,
  }),
  z.object({
    slot_type: z.literal("situational"),
    slot: situationalSlotSchema,
  }),
]);

// POST - Add a slot to a meal plan
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const nutritionist = await requireAuth();
    await requireRole(nutritionist.id, ["nutritionist"]);

    const { id: mealPlanId } = await params;
    const body = await request.json();
    const validatedData = addSlotSchema.parse(body);

    const supabase = await createClient();

    // Verify meal plan ownership
    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("nutritionist_id, type")
      .eq("id", mealPlanId)
      .single();

    if (!mealPlan) {
      return Response.json({ error: "Pauta no encontrada" }, { status: 404 });
    }

    if (mealPlan.nutritionist_id !== nutritionist.id) {
      return Response.json({ error: "Sin permiso para editar esta pauta" }, { status: 403 });
    }

    // Verify slot type matches plan type
    if (
      (mealPlan.type === "weekly" && validatedData.slot_type !== "weekly") ||
      (mealPlan.type === "situational" && validatedData.slot_type !== "situational")
    ) {
      return Response.json(
        { error: "Tipo de slot no coincide con tipo de pauta" },
        { status: 400 }
      );
    }

    let data;
    let error;

    if (validatedData.slot_type === "weekly") {
      const result = await supabase
        .from("weekly_plan_slots")
        .insert({
          ...validatedData.slot,
          meal_plan_id: mealPlanId,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Verify situational_plan belongs to this meal plan
      const { data: sitPlan } = await supabase
        .from("situational_plans")
        .select("meal_plan_id")
        .eq("id", validatedData.slot.situational_plan_id)
        .single();

      if (!sitPlan || sitPlan.meal_plan_id !== mealPlanId) {
        return Response.json(
          { error: "Plan situacional no pertenece a esta pauta" },
          { status: 400 }
        );
      }

      const result = await supabase
        .from("situational_plan_slots")
        .insert(validatedData.slot)
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data }, { status: 201 });
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

const updateSlotsSchema = z.object({
  weekly_slots: z.array(
    weeklySlotUpdateSchema.extend({ id: z.string().uuid().optional() })
  ).optional(),
  situational_plans: z.array(
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      sort_order: z.number().optional().nullable(),
      slots: z.array(
        situationalSlotUpdateSchema.extend({
          id: z.string().uuid().optional()
        })
      ),
    }).passthrough()
  ).optional(),
  change_notes: z.string().optional(),
});

// Helper function to save current state as a version
async function saveVersionSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealPlanId: string,
  nutritionistId: string
) {
  // Get current meal plan data
  const { data: mealPlan } = await supabase
    .from("meal_plans")
    .select("name, description, type, current_version")
    .eq("id", mealPlanId)
    .single();

  if (!mealPlan) return null;

  // Get current slots based on type
  let snapshot: Record<string, unknown> = {};

  if (mealPlan.type === "weekly") {
    const { data: slots } = await supabase
      .from("weekly_plan_slots")
      .select("*")
      .eq("meal_plan_id", mealPlanId)
      .order("day_of_week")
      .order("sort_order");
    snapshot = { weekly_slots: slots || [] };
  } else {
    const { data: sitPlans } = await supabase
      .from("situational_plans")
      .select("*")
      .eq("meal_plan_id", mealPlanId)
      .order("sort_order");

    if (sitPlans) {
      const plansWithSlots = await Promise.all(
        sitPlans.map(async (plan) => {
          const { data: slots } = await supabase
            .from("situational_plan_slots")
            .select("*")
            .eq("situational_plan_id", plan.id)
            .order("sort_order");
          return { ...plan, slots: slots || [] };
        })
      );
      snapshot = { situational_plans: plansWithSlots };
    }
  }

  const versionNumber = (mealPlan.current_version || 1);

  // Save the version
  await supabase.from("meal_plan_versions").insert({
    meal_plan_id: mealPlanId,
    version_number: versionNumber,
    name: mealPlan.name,
    description: mealPlan.description,
    snapshot,
    created_by: nutritionistId,
  });

  // Increment version number on meal plan
  await supabase
    .from("meal_plans")
    .update({ current_version: versionNumber + 1 })
    .eq("id", mealPlanId);

  return versionNumber;
}

// PUT - Replace all slots in a meal plan (bulk update)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const nutritionist = await requireAuth();
    await requireRole(nutritionist.id, ["nutritionist"]);

    const { id: mealPlanId } = await params;
    const body = await request.json();
    const validatedData = updateSlotsSchema.parse(body);

    const supabase = await createClient();

    // Verify meal plan ownership
    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("nutritionist_id, type, current_version")
      .eq("id", mealPlanId)
      .single();

    if (!mealPlan) {
      return Response.json({ error: "Pauta no encontrada" }, { status: 404 });
    }

    if (mealPlan.nutritionist_id !== nutritionist.id) {
      return Response.json({ error: "Sin permiso para editar esta pauta" }, { status: 403 });
    }

    // Save current state as a version before making changes
    await saveVersionSnapshot(supabase, mealPlanId, nutritionist.id);

    if (mealPlan.type === "weekly" && validatedData.weekly_slots) {
      // Delete existing slots and insert new ones
      await supabase
        .from("weekly_plan_slots")
        .delete()
        .eq("meal_plan_id", mealPlanId);

      const slotsToInsert = validatedData.weekly_slots.map(({ id: _id, ...slot }) => ({
        ...slot,
        meal_plan_id: mealPlanId,
      }));

      if (slotsToInsert.length > 0) {
        const { error } = await supabase
          .from("weekly_plan_slots")
          .insert(slotsToInsert);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }
    } else if (mealPlan.type === "situational" && validatedData.situational_plans) {
      // Delete existing situational plans (CASCADE deletes slots)
      await supabase
        .from("situational_plans")
        .delete()
        .eq("meal_plan_id", mealPlanId);

      for (const sitPlan of validatedData.situational_plans) {
        const { data: newSitPlan, error: sitError } = await supabase
          .from("situational_plans")
          .insert({
            meal_plan_id: mealPlanId,
            title: sitPlan.title,
            description: sitPlan.description,
            sort_order: sitPlan.sort_order,
          })
          .select()
          .single();

        if (sitError) {
          return Response.json({ error: sitError.message }, { status: 500 });
        }

        if (sitPlan.slots && sitPlan.slots.length > 0) {
          const slotsToInsert = sitPlan.slots.map(({ id: _id, ...slot }) => ({
            ...slot,
            situational_plan_id: newSitPlan.id,
          }));

          const { error: slotsError } = await supabase
            .from("situational_plan_slots")
            .insert(slotsToInsert);

          if (slotsError) {
            return Response.json({ error: slotsError.message }, { status: 500 });
          }
        }
      }
    }

    return Response.json({ success: true });
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
