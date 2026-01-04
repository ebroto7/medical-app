import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import {
  withErrorHandler,
  successResponse,
  createdResponse,
} from "@/lib/api/error-handler";

const createSavedMealSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  meal_type: z.enum(['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_workout', 'post_workout']).optional(),
  calories: z.number().int().min(0).max(10000).optional(),
  protein: z.number().min(0).max(1000).optional(),
  carbs: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(1000).optional(),
});

// GET - List saved meals
export const GET = withErrorHandler(async () => {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: meals, error } = await supabase
    .from("saved_meals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return successResponse(meals || []);
});

// POST - Create saved meal
export async function POST(request: Request) {
  // Rate limiting check (needs special header handling)
  const rateLimitResult = rateLimit(request, 'api');
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  // Main handler with error handling
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();
    const validatedData = createSavedMealSchema.parse(body);

    const supabase = await createClient();
    const { data: meal, error } = await supabase
      .from("saved_meals")
      .insert({
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description,
        meal_type: validatedData.meal_type,
        calories: validatedData.calories || 0,
        protein: validatedData.protein || 0,
        carbs: validatedData.carbs || 0,
        fat: validatedData.fat || 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return createdResponse(meal);
  })(request);
}
