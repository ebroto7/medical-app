import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ZodError } from "zod";

const updateSavedMealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  meal_type: z.enum(['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_workout', 'post_workout']).optional(),
  calories: z.number().int().min(0).max(10000).optional(),
  protein: z.number().min(0).max(1000).optional(),
  carbs: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(1000).optional(),
});

// PATCH - Update saved meal
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

    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSavedMealSchema.parse(body);

    const supabase = await createClient();

    // Verify ownership
    const { data: existingMeal } = await supabase
      .from("saved_meals")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingMeal) {
      return Response.json({ error: "Saved meal not found" }, { status: 404 });
    }

    if (existingMeal.user_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: meal, error } = await supabase
      .from("saved_meals")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data: meal });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Update saved meal error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete saved meal
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

    const user = await requireAuth();
    const { id } = await params;

    const supabase = await createClient();

    // Verify ownership
    const { data: existingMeal } = await supabase
      .from("saved_meals")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingMeal) {
      return Response.json({ error: "Saved meal not found" }, { status: 404 });
    }

    if (existingMeal.user_id !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("saved_meals")
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
    console.error("Delete saved meal error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
