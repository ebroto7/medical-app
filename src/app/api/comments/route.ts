import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole, canAccessPatientData } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { auditSuccess } from "@/services/audit.service";
import { logger } from "@/lib/logger";
import { createCommentSchema, updateCommentSchema } from "@/lib/validations/comments";
import { z, ZodError } from "zod";

// Validation schemas for query params
const getCommentsSchema = z.object({
  entry_id: z.string().uuid("Invalid entry ID").nullable().optional(),
  training_session_id: z.string().uuid("Invalid training session ID").nullable().optional(),
}).refine(data => data.entry_id || data.training_session_id, {
  message: "entry_id or training_session_id required"
});

// GET - Fetch comments for an entry or training session
export async function GET(request: Request) {
  try {
    // 1. Rate limiting
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Require authentication
    const user = await requireAuth();

    // 3. Parse and validate query params
    const { searchParams } = new URL(request.url);
    const { entry_id: entryId, training_session_id: trainingSessionId } = getCommentsSchema.parse({
      entry_id: searchParams.get("entry_id"),
      training_session_id: searchParams.get("training_session_id"),
    });

    const supabase = await createClient();

    // 3. Verify user has access to this entry/session
    if (entryId) {
      const { data: entry } = await supabase
        .from("nutrition_entries")
        .select("user_id")
        .eq("id", entryId)
        .single();

      if (!entry) {
        return Response.json({ error: "Entry not found" }, { status: 404 });
      }

      const hasAccess = await canAccessPatientData(user.id, entry.user_id);
      if (!hasAccess) {
        return Response.json({ error: "Access denied" }, { status: 403 });
      }
    }

    if (trainingSessionId) {
      const { data: session } = await supabase
        .from("training_sessions")
        .select("user_id")
        .eq("id", trainingSessionId)
        .single();

      if (!session) {
        return Response.json({ error: "Training session not found" }, { status: 404 });
      }

      const hasAccess = await canAccessPatientData(user.id, session.user_id);
      if (!hasAccess) {
        return Response.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // 4. Get comments
    let query = supabase.from("nutritionist_comments").select("*");

    if (entryId) {
      query = query.eq("entry_id", entryId);
    } else if (trainingSessionId) {
      query = query.eq("training_session_id", trainingSessionId);
    }

    const { data: comments, error } = await query.order("created_at", { ascending: false });

    if (error) {
      logger.error({ error, userId: user.id }, "Failed to fetch comments");
      return Response.json({ error: "Failed to fetch comments" }, { status: 500 });
    }

    // 5. Fetch nutritionist profiles
    if (comments && comments.length > 0) {
      const nutritionistIds = [...new Set(comments.map((c) => c.nutritionist_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", nutritionistIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      const dataWithProfiles = comments.map((comment) => ({
        ...comment,
        nutritionist: profileMap.get(comment.nutritionist_id) || null,
      }));

      return Response.json({ data: dataWithProfiles });
    }

    return Response.json({ data: comments || [] });
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
    logger.error({ error }, "Unexpected error in GET /comments");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new comment (nutritionist only)
export async function POST(request: Request) {
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

    // 3. Require nutritionist role
    await requireRole(user.id, ["nutritionist"]);

    // 4. Parse and validate body
    const body = await request.json();
    // Map snake_case from request to camelCase for validation
    const mappedBody = {
      entryId: body.entry_id,
      trainingSessionId: body.training_session_id,
      comment: body.comment,
    };
    const validatedData = createCommentSchema.parse(mappedBody);

    const supabase = await createClient();

    // 4. Verify the nutritionist is connected to the patient
    if (validatedData.entryId) {
      const { data: entry } = await supabase
        .from("nutrition_entries")
        .select("user_id")
        .eq("id", validatedData.entryId)
        .single();

      if (!entry) {
        return Response.json({ error: "Entry not found" }, { status: 404 });
      }

      const hasAccess = await canAccessPatientData(user.id, entry.user_id);
      if (!hasAccess) {
        return Response.json(
          { error: "You are not connected to this patient" },
          { status: 403 }
        );
      }
    }

    if (validatedData.trainingSessionId) {
      const { data: session } = await supabase
        .from("training_sessions")
        .select("user_id")
        .eq("id", validatedData.trainingSessionId)
        .single();

      if (!session) {
        return Response.json({ error: "Training session not found" }, { status: 404 });
      }

      const hasAccess = await canAccessPatientData(user.id, session.user_id);
      if (!hasAccess) {
        return Response.json(
          { error: "You are not connected to this patient" },
          { status: 403 }
        );
      }
    }

    // 5. Insert comment
    const { data, error } = await supabase
      .from("nutritionist_comments")
      .insert({
        nutritionist_id: user.id,
        entry_id: validatedData.entryId || null,
        training_session_id: validatedData.trainingSessionId || null,
        comment: validatedData.comment,
      })
      .select();

    if (error) {
      logger.error({ error, userId: user.id }, "Failed to create comment");
      return Response.json({ error: "Failed to create comment" }, { status: 500 });
    }

    // 6. Audit log
    await auditSuccess(
      request,
      user.id,
      "comment.create",
      "nutritionist_comment",
      data[0].id,
      {
        entryId: validatedData.entryId,
        trainingSessionId: validatedData.trainingSessionId
      }
    );

    logger.info({ userId: user.id, commentId: data[0].id }, "Comment created");

    return Response.json({ data: data[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Only nutritionists can add comments" }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    logger.error({ error }, "Unexpected error in POST /comments");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update a comment (nutritionist only, own comments)
export async function PUT(request: Request) {
  try {
    // 1. Rate limiting
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Require authentication
    const user = await requireAuth();

    // 2. Require nutritionist role
    await requireRole(user.id, ["nutritionist"]);

    // 3. Parse and validate body
    const body = await request.json();
    const validatedData = updateCommentSchema.parse(body);

    // 4. Update comment (only if owned by this nutritionist)
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("nutritionist_comments")
      .update({
        comment: validatedData.comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validatedData.id)
      .eq("nutritionist_id", user.id)
      .select();

    if (error) {
      logger.error({ error, userId: user.id }, "Failed to update comment");
      return Response.json({ error: "Failed to update comment" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      logger.warn({ userId: user.id, commentId: validatedData.id }, "Unauthorized comment update attempt");
      return Response.json({ error: "Comment not found or not authorized" }, { status: 404 });
    }

    // 5. Audit log
    await auditSuccess(
      request,
      user.id,
      "comment.update",
      "nutritionist_comment",
      validatedData.id
    );

    logger.info({ userId: user.id, commentId: validatedData.id }, "Comment updated");

    return Response.json({ data: data[0] });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Only nutritionists can edit comments" }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    logger.error({ error }, "Unexpected error in PUT /comments");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Validation schema for DELETE query params
const deleteCommentSchema = z.object({
  id: z.string().uuid("Invalid comment ID").nullable().transform(val => val || undefined),
}).refine(data => data.id !== undefined, {
  message: "id is required"
});

// DELETE - Delete a comment (nutritionist only, own comments)
export async function DELETE(request: Request) {
  try {
    // 1. Rate limiting (strict for deletions)
    const rateLimitResult = rateLimit(request, 'strict');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Require authentication
    const user = await requireAuth();

    // 3. Require nutritionist role
    await requireRole(user.id, ["nutritionist"]);

    // 4. Parse and validate query params
    const { searchParams } = new URL(request.url);
    const { id } = deleteCommentSchema.parse({
      id: searchParams.get("id"),
    });

    // 5. Delete comment (only if owned by this nutritionist)
    const supabase = await createClient();
    const { error } = await supabase
      .from("nutritionist_comments")
      .delete()
      .eq("id", id)
      .eq("nutritionist_id", user.id);

    if (error) {
      logger.error({ error, userId: user.id }, "Failed to delete comment");
      return Response.json({ error: "Failed to delete comment" }, { status: 500 });
    }

    // 6. Audit log
    await auditSuccess(
      request,
      user.id,
      "comment.delete",
      "nutritionist_comment",
      id
    );

    logger.info({ userId: user.id, commentId: id }, "Comment deleted");

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Only nutritionists can delete comments" }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    logger.error({ error }, "Unexpected error in DELETE /comments");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
