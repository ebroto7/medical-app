import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { OwnershipError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import {
  withErrorHandler,
  successResponse,
  NotFoundError,
} from "@/lib/api/error-handler";

const updateSavedMealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  meal_type: z.enum(['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_workout', 'post_workout']).optional(),
  calories: z.number().int().min(0).max(10000).optional(),
  protein: z.number().min(0).max(1000).optional(),
  carbs: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(1000).optional(),
});

// Helper to verify ownership
async function verifyMealOwnership(supabase: Awaited<ReturnType<typeof createClient>>, id: string, userId: string) {
  const { data: existingMeal } = await supabase
    .from("saved_meals")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existingMeal) {
    throw new NotFoundError("Saved meal not found");
  }

  if (existingMeal.user_id !== userId) {
    throw new OwnershipError("You don't own this meal");
  }
}

// PATCH - Update saved meal
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Rate limiting check
  const rateLimitResult = rateLimit(request, 'api');
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateSavedMealSchema.parse(body);

    const supabase = await createClient();
    await verifyMealOwnership(supabase, id, user.id);

    const { data: meal, error } = await supabase
      .from("saved_meals")
      .update(validatedData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return successResponse(meal);
  })(request, context);
}

// DELETE - Delete saved meal
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Rate limiting check
  const rateLimitResult = rateLimit(request, 'api');
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await context.params;

    const supabase = await createClient();
    await verifyMealOwnership(supabase, id, user.id);

    const { error } = await supabase
      .from("saved_meals")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return successResponse({ deleted: true });
  })(request, context);
}
