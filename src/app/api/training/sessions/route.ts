import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { createTrainingSessionSchema } from "@/lib/validations/training";
import {
  withErrorHandler,
  successResponse,
  createdResponse,
} from "@/lib/api/error-handler";
import { z } from "zod";

// Schema for DELETE query params
const deleteQuerySchema = z.object({
  id: z.string().uuid("Invalid session ID"),
});

// GET - List training sessions
export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const supabase = await createClient();
  let query = supabase
    .from("training_sessions")
    .select("*")
    .eq("user_id", user.id);

  if (date) {
    query = query.eq("date", date);
  } else if (startDate && endDate) {
    query = query.gte("date", startDate).lte("date", endDate);
  }

  const { data, error } = await query
    .order("date", { ascending: false })
    .order("time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return successResponse(data);
});

// POST - Create training session
export async function POST(request: Request) {
  const rateLimitResult = rateLimit(request, 'api');
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  return withErrorHandler(async () => {
    const user = await requireAuth();
    const body = await request.json();
    const validatedData = createTrainingSessionSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        user_id: user.id,
        date: validatedData.date,
        time: validatedData.time,
        type: validatedData.type,
        duration_minutes: validatedData.durationMinutes || null,
        description: validatedData.description || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return createdResponse(data);
  })(request);
}

// DELETE - Delete training session
export async function DELETE(request: Request) {
  const rateLimitResult = rateLimit(request, 'api');
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  return withErrorHandler(async () => {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const { id } = deleteQuerySchema.parse({ id: searchParams.get("id") });

    const supabase = await createClient();
    const { error } = await supabase
      .from("training_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return successResponse({ deleted: true });
  })(request);
}
