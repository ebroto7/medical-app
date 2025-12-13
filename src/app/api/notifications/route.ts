import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { z } from "zod";
import { ZodError } from "zod";

const markNotificationsSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  markAllRead: z.boolean().optional(),
}).refine(
  (data) => data.ids || data.markAllRead,
  { message: "Either ids or markAllRead is required" }
);

// GET - Fetch notifications for current user
export async function GET(request: Request) {
  try {
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
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: Request) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Validate body
    const body = await request.json();
    const validatedData = markNotificationsSchema.parse(body);

    const supabase = await createClient();

    if (validatedData.markAllRead) {
      // Mark all notifications as read
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    } else if (validatedData.ids && validatedData.ids.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("id", validatedData.ids);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    return Response.json({ success: true });
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
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
