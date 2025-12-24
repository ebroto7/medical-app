import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { ZodError } from "zod";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Apply rate limiting
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Require authentication
    const user = await requireAuth();

    // 3. Parse body
    const body = await request.json();
    const { time, type, durationMinutes, description } = body;
    const { id } = await params;

    const supabase = await createClient();

    // 3. Verify ownership
    const { data: existingSession } = await supabase
      .from("training_sessions")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingSession) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (existingSession.user_id !== user.id) {
      return Response.json(
        { error: "You do not have permission to update this session" },
        { status: 403 }
      );
    }

    // 4. Validate type if provided
    const validTypes = ["cardio", "strength", "flexibility", "hiit", "yoga", "other"];
    if (type && !validTypes.includes(type)) {
      return Response.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // 5. Update
    const { data, error } = await supabase
      .from("training_sessions")
      .update({
        time: time ?? undefined,
        type: type ?? undefined,
        duration_minutes: durationMinutes ?? null,
        description: description ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data: data[0] });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Apply rate limiting
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Require authentication
    const user = await requireAuth();

    const { id } = await params;
    const supabase = await createClient();

    // 3. Verify ownership
    const { data: existingSession } = await supabase
      .from("training_sessions")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingSession) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (existingSession.user_id !== user.id) {
      return Response.json(
        { error: "You do not have permission to delete this session" },
        { status: 403 }
      );
    }

    // 3. Delete
    const { error } = await supabase
      .from("training_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ message: "Session deleted" });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
