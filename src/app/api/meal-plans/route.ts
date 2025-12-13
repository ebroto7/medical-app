import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { z } from "zod";
import { ZodError } from "zod";

const weeklySlotSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  meal_type: z.enum(["breakfast", "mid_morning", "lunch", "afternoon_snack", "dinner", "extra"]),
  meal_name: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  sort_order: z.number().optional(),
});

const situationalPlanSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sort_order: z.number().optional(),
  slots: z.array(z.object({
    meal_type: z.enum(["breakfast", "mid_morning", "lunch", "afternoon_snack", "dinner", "extra"]),
    meal_name: z.string().min(1),
    description: z.string().optional(),
    notes: z.string().optional(),
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    sort_order: z.number().optional(),
  })),
});

const createMealPlanSchema = z.object({
  patient_id: z.string().uuid(),
  type: z.enum(["weekly", "situational"]),
  name: z.string().min(1),
  description: z.string().optional(),
  weekly_slots: z.array(weeklySlotSchema).optional(),
  situational_plans: z.array(situationalPlanSchema).optional(),
}).refine(
  (data) => {
    if (data.type === "weekly") return data.weekly_slots && data.weekly_slots.length > 0;
    if (data.type === "situational") return data.situational_plans && data.situational_plans.length > 0;
    return false;
  },
  { message: "Weekly plans require weekly_slots, situational plans require situational_plans" }
);

// GET - List meal plans (nutritionist sees their created plans, patient sees their assigned plans)
export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient_id");

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    let query = supabase
      .from("meal_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (profile.role === "nutritionist") {
      query = query.eq("nutritionist_id", user.id);
      if (patientId) {
        query = query.eq("patient_id", patientId);
      }
    } else {
      // Patient sees their assigned plans
      query = query.eq("patient_id", user.id);
    }

    const { data: plans, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Fetch profile names for patient/nutritionist
    if (plans && plans.length > 0) {
      const userIds = [...new Set([
        ...plans.map(p => p.patient_id),
        ...plans.map(p => p.nutritionist_id)
      ])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const data = plans.map(plan => ({
        ...plan,
        patient: profileMap.get(plan.patient_id) || null,
        nutritionist: profileMap.get(plan.nutritionist_id) || null,
      }));

      return Response.json({ data });
    }

    return Response.json({ data: plans || [] });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new meal plan (nutritionist only)
export async function POST(request: Request) {
  try {
    const nutritionist = await requireAuth();
    await requireRole(nutritionist.id, ["nutritionist"]);

    const body = await request.json();
    const validatedData = createMealPlanSchema.parse(body);

    const supabase = await createClient();

    // Verify patient is connected to this nutritionist
    const { data: connection } = await supabase
      .from("patient_nutritionist_connections")
      .select("id")
      .eq("nutritionist_id", nutritionist.id)
      .eq("patient_id", validatedData.patient_id)
      .single();

    if (!connection) {
      return Response.json(
        { error: "No tienes conexión con este paciente" },
        { status: 403 }
      );
    }

    // Create the meal plan
    const { data: mealPlan, error: planError } = await supabase
      .from("meal_plans")
      .insert({
        nutritionist_id: nutritionist.id,
        patient_id: validatedData.patient_id,
        type: validatedData.type,
        name: validatedData.name,
        description: validatedData.description,
      })
      .select()
      .single();

    if (planError) {
      return Response.json({ error: planError.message }, { status: 500 });
    }

    // Insert slots based on plan type
    if (validatedData.type === "weekly" && validatedData.weekly_slots) {
      const slotsToInsert = validatedData.weekly_slots.map((slot) => ({
        ...slot,
        meal_plan_id: mealPlan.id,
      }));

      const { error: slotsError } = await supabase
        .from("weekly_plan_slots")
        .insert(slotsToInsert);

      if (slotsError) {
        // Rollback: delete the meal plan
        await supabase.from("meal_plans").delete().eq("id", mealPlan.id);
        return Response.json({ error: slotsError.message }, { status: 500 });
      }
    } else if (validatedData.type === "situational" && validatedData.situational_plans) {
      for (const sitPlan of validatedData.situational_plans) {
        const { data: situationalPlan, error: sitError } = await supabase
          .from("situational_plans")
          .insert({
            meal_plan_id: mealPlan.id,
            title: sitPlan.title,
            description: sitPlan.description,
            sort_order: sitPlan.sort_order,
          })
          .select()
          .single();

        if (sitError) {
          await supabase.from("meal_plans").delete().eq("id", mealPlan.id);
          return Response.json({ error: sitError.message }, { status: 500 });
        }

        if (sitPlan.slots && sitPlan.slots.length > 0) {
          const slotsToInsert = sitPlan.slots.map((slot) => ({
            ...slot,
            situational_plan_id: situationalPlan.id,
          }));

          const { error: slotsError } = await supabase
            .from("situational_plan_slots")
            .insert(slotsToInsert);

          if (slotsError) {
            await supabase.from("meal_plans").delete().eq("id", mealPlan.id);
            return Response.json({ error: slotsError.message }, { status: 500 });
          }
        }
      }
    }

    return Response.json({
      success: true,
      data: mealPlan,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Solo nutricionistas pueden crear pautas" }, { status: 403 });
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
