import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  frequency: z.enum(["daily", "weekly"]).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = updateHabitSchema.parse(body);

    const supabase = await createClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("habits")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return Response.json({ error: "Habit not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.icon !== undefined) updateData.icon = validated.icon;
    if (validated.color !== undefined) updateData.color = validated.color;
    if (validated.frequency !== undefined)
      updateData.frequency = validated.frequency;
    if (validated.daysOfWeek !== undefined)
      updateData.days_of_week = validated.daysOfWeek;
    if (validated.isActive !== undefined)
      updateData.is_active = validated.isActive;
    if (validated.sortOrder !== undefined)
      updateData.sort_order = validated.sortOrder;

    const { data, error } = await supabase
      .from("habits")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error({ error, userId: user.id, habitId: id }, "Error updating habit");
      return Response.json({ error: error.message }, { status: 500 });
    }

    logger.info({ userId: user.id, habitId: id }, "Habit updated");
    return Response.json({ data });
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
    logger.error({ error }, "Unhandled error in habit PATCH");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const supabase = await createClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("habits")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return Response.json({ error: "Habit not found" }, { status: 404 });
    }

    const { error } = await supabase.from("habits").delete().eq("id", id);

    if (error) {
      logger.error({ error, userId: user.id, habitId: id }, "Error deleting habit");
      return Response.json({ error: error.message }, { status: 500 });
    }

    logger.info({ userId: user.id, habitId: id }, "Habit deleted");
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unhandled error in habit DELETE");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
