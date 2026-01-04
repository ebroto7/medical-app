import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // defaults to today
});

// Mark habit as completed for a date
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine, defaults to today
    }

    const validated = logSchema.parse(body);
    const completedAt = validated.date || new Date().toISOString().split("T")[0];

    const supabase = await createClient();

    // Verify ownership
    const { data: habit } = await supabase
      .from("habits")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!habit) {
      return Response.json({ error: "Habit not found" }, { status: 404 });
    }

    // Insert log (upsert to handle duplicate key)
    const { data, error } = await supabase
      .from("habit_logs")
      .upsert(
        { habit_id: id, completed_at: completedAt },
        { onConflict: "habit_id,completed_at" }
      )
      .select()
      .single();

    if (error) {
      logger.error({ error, habitId: id }, "Error logging habit");
      return Response.json({ error: error.message }, { status: 500 });
    }

    logger.info({ userId: user.id, habitId: id, date: completedAt }, "Habit logged");
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    logger.error({ error }, "Unhandled error in habit log POST");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Unmark habit for a date
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const supabase = await createClient();

    // Verify ownership
    const { data: habit } = await supabase
      .from("habits")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!habit) {
      return Response.json({ error: "Habit not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", id)
      .eq("completed_at", date);

    if (error) {
      logger.error({ error, habitId: id }, "Error unlogging habit");
      return Response.json({ error: error.message }, { status: 500 });
    }

    logger.info({ userId: user.id, habitId: id, date }, "Habit unlogged");
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unhandled error in habit log DELETE");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
