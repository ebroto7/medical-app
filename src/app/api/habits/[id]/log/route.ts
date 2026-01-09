import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import RoleService from "@/services/auth/role.service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  comment: z.string().max(500).optional(),
});

// Mark habit as completed for a date or add a comment
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
      // Empty body is fine
    }

    const validated = logSchema.parse(body);
    const completedAt = validated.date || new Date().toISOString().split("T")[0];

    const supabase = await createClient();
    const role = await RoleService.getRoleForUser(user.id);

    // Verify access
    // Patients can log their own habits.
    // Nutritionists can comment on public habits of any user (simplified for now).
    const { data: habit } = await supabase
      .from("habits")
      .select("id, user_id, is_private")
      .eq("id", id)
      .single();

    if (!habit) {
      return Response.json({ error: "Habit not found" }, { status: 404 });
    }

    const isOwner = habit.user_id === user.id;
    const isNutritionist = role === "nutritionist";
    
    // Nutritionist can only interact if habit is not private
    if (!isOwner && (!isNutritionist || habit.is_private)) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // Upsert log with optional comment
    // If it's the owner, they are likely marking as complete.
    // If it's a nutritionist, they might just be adding a comment to an existing log 
    // or creating one to leave feedback even if not completed (depends on business logic).
    // For now, any POST creates/updates a log for that date.
    const upsertData: { 
      habit_id: string; 
      completed_at: string;
      comment?: string;
    } = { 
      habit_id: id, 
      completed_at: completedAt 
    };
    
    if (validated.comment !== undefined) {
      upsertData.comment = validated.comment;
    }

    const { data, error } = await supabase
      .from("habit_logs")
      .upsert(
        upsertData,
        { onConflict: "habit_id,completed_at" }
      )
      .select()
      .single();

    if (error) {
      logger.error({ error, habitId: id }, "Error logging habit");
      return Response.json({ error: error.message }, { status: 500 });
    }

    logger.info({ userId: user.id, habitId: id, date: completedAt }, "Habit logged/commented");
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
