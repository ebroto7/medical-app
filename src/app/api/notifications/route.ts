import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { z } from "zod";
import {
  withErrorHandler,
  successResponse,
} from "@/lib/api/error-handler";

const markNotificationsSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  markAllRead: z.boolean().optional(),
}).refine(
  (data) => data.ids || data.markAllRead,
  { message: "Either ids or markAllRead is required" }
);

// GET - Fetch notifications for current user
export const GET = withErrorHandler(async (request) => {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = parseInt(searchParams.get("limit") || "50");

  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return successResponse(data);
});

// PATCH - Mark notifications as read
export const PATCH = withErrorHandler(async (request) => {
  const user = await requireAuth();
  const body = await request.json();
  const validatedData = markNotificationsSchema.parse(body);

  const supabase = await createClient();

  if (validatedData.markAllRead) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      throw new Error(error.message);
    }
  } else if (validatedData.ids && validatedData.ids.length > 0) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .in("id", validatedData.ids);

    if (error) {
      throw new Error(error.message);
    }
  }

  return successResponse({ marked: true });
});
