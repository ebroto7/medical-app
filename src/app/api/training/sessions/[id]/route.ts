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

const updateSessionSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  type: z.enum(["cardio", "strength", "flexibility", "hiit", "yoga", "other"]).optional(),
  durationMinutes: z.number().int().min(1).max(480).optional(),
  description: z.string().max(1000).optional().nullable(),
});

// Helper to verify session ownership
async function verifySessionOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  userId: string
) {
  const { data: existingSession } = await supabase
    .from("training_sessions")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existingSession) {
    throw new NotFoundError("Session not found");
  }

  if (existingSession.user_id !== userId) {
    throw new OwnershipError("You don't own this session");
  }
}

// PUT - Update training session
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    const validatedData = updateSessionSchema.parse(body);

    const supabase = await createClient();
    await verifySessionOwnership(supabase, id, user.id);

    const { data, error } = await supabase
      .from("training_sessions")
      .update({
        time: validatedData.time,
        type: validatedData.type,
        duration_minutes: validatedData.durationMinutes ?? null,
        description: validatedData.description ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return successResponse(data);
  })(request, context);
}

// DELETE - Delete training session
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    await verifySessionOwnership(supabase, id, user.id);

    const { error } = await supabase
      .from("training_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return successResponse({ deleted: true });
  })(request, context);
}
