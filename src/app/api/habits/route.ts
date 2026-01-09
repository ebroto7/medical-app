import { createClient } from "@/utils/supabase/server";
import { requireAuth, canAccessPatientData } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { auditSuccess } from "@/services/audit.service";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  calculateSmartStreak,
  getFrequencyLabel,
  isExpectedDay,
} from "@/lib/habits/streak-calculator";

import RoleService from "@/services/auth/role.service";

// Validation schemas
const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(10).default("✓"),
  color: z.string().max(20).default("primary"),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  daysOfWeek: z.array(z.number().min(0).max(6)).nullable().optional(),
  is_private: z.boolean().optional(),
  targetUserId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  try {
    const rateLimitResult = rateLimit(request, "api");
    if (!rateLimitResult.success) {
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const user = await requireAuth();
    const supabase = await createClient();

    // Determine context
    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get("userId");
    const requestedDate = url.searchParams.get("date"); // YYYY-MM-DD
    const requestedMonth = url.searchParams.get("month"); // YYYY-MM
    const role = await RoleService.getRoleForUser(user.id);

    let targetUserId = user.id;
    let isNutritionistView = false;

    if (role === "nutritionist" && requestedUserId) {
      targetUserId = requestedUserId;
      isNutritionistView = true;
    }

    // Determine evaluation context (current day for completion check)
    const contextDate = requestedDate ? new Date(requestedDate) : new Date();
    const contextDateStr = contextDate.toISOString().split("T")[0];

    // Determine month period for logs
    let startOfMonth, endOfMonth;
    if (requestedMonth) {
      const [year, month] = requestedMonth.split("-").map(Number);
      startOfMonth = new Date(year, month - 1, 1).toISOString().split("T")[0];
      endOfMonth = new Date(year, month, 0).toISOString().split("T")[0];
    } else {
      // Use current month or requested date's month
      const refDate = requestedDate ? new Date(requestedDate) : new Date();
      startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1).toISOString().split("T")[0];
      endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).toISOString().split("T")[0];
    }

    let query = supabase
      .from("habits")
      .select(
        `
        *,
        habit_logs (
          id,
          completed_at,
          comment
        )
      `
      )
      .eq("user_id", targetUserId)
      .eq("is_active", true);

    // Privacy Filter: Nutritionist cannot see private habits
    if (isNutritionistView) {
      query = query.eq("is_private", false);
    }

    const { data: habits, error } = await query.order("sort_order", { ascending: true });

    if (error) {
      logger.error({ error, userId: user.id }, "Error fetching habits");
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Calculate stats based on context using smart streak calculator
    const habitsWithStats = (habits || []).map((habit) => {
      const logs = habit.habit_logs || [];

      // Use smart streak calculator that respects frequency/days_of_week
      const streakResult = calculateSmartStreak(
        {
          frequency: habit.frequency || "daily",
          days_of_week: habit.days_of_week,
        },
        logs,
        contextDateStr
      );

      return {
        ...habit,
        // Core streak data
        currentStreak: streakResult.currentStreak,
        streakUnit: streakResult.streakUnit,
        completedToday: streakResult.completedToday,
        expectedToday: streakResult.expectedToday,
        // Weekly progress (only for weekly habits)
        weeklyProgress: streakResult.weeklyProgress,
        // Human-readable frequency label
        frequencyLabel: getFrequencyLabel({
          frequency: habit.frequency || "daily",
          days_of_week: habit.days_of_week,
        }),
        // Logs for calendar/heatmap
        logsThisMonth: logs.filter(
          (l: { completed_at: string }) =>
            l.completed_at >= startOfMonth && l.completed_at <= endOfMonth
        ),
      };
    });

    logger.info(
      { userId: user.id, count: habits?.length, contextDateStr, requestedMonth },
      "Habits retrieved"
    );
    return Response.json({ data: habitsWithStats });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unhandled error in habits GET");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = rateLimit(request, "api");
    if (!rateLimitResult.success) {
      return Response.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const user = await requireAuth();
    const body = await request.json();
    const validated = createHabitSchema.parse(body);

    const role = await RoleService.getRoleForUser(user.id);
    const supabase = await createClient();

    // Determine owner and privacy based on Role
    let finalUserId = user.id;
    let isPrivate = validated.is_private ?? false;
    const createdBy = user.id;

    if (role === "nutritionist" && validated.targetUserId) {
        // Verify nutritionist is connected to this patient
        const hasAccess = await canAccessPatientData(user.id, validated.targetUserId);
        if (!hasAccess) {
          return Response.json(
            { error: "No tienes acceso a este paciente" },
            { status: 403 }
          );
        }
        // Nutritionist creating for patient
        finalUserId = validated.targetUserId;
        isPrivate = false; // Forced public so both can see
    }

    // Get max sort_order for this user
    const { data: maxOrder } = await supabase
      .from("habits")
      .select("sort_order")
      .eq("user_id", finalUserId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: finalUserId,
        created_by: createdBy,
        name: validated.name,
        icon: validated.icon,
        color: validated.color,
        frequency: validated.frequency,
        days_of_week: validated.daysOfWeek ?? null,
        is_private: isPrivate,
        sort_order: (maxOrder?.sort_order ?? 0) + 1,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, userId: user.id }, "Error creating habit");
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Audit log habit creation
    await auditSuccess(
      request,
      user.id,
      "habit.create",
      "habit",
      data.id,
      {
        targetUserId: finalUserId,
        isPrivate,
        isNutritionistAssignment: finalUserId !== user.id
      }
    );

    logger.info({ userId: user.id, habitId: data.id }, "Habit created");
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
    logger.error({ error }, "Unhandled error in habits POST");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
