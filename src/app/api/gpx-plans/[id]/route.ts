/**
 * API Endpoint: /api/gpx-plans/[id]
 *
 * GET - Get a single GPX plan
 * PATCH - Update a GPX plan
 * DELETE - Delete a GPX plan
 */

import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { auditSuccess } from "@/services/audit.service";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/auth/errors";
import { z, ZodError } from "zod";

// Validation schema for updates
const updateGPXPlanSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  event_name: z.string().max(200).optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sport_type: z.enum(['running', 'cycling', 'triathlon', 'hiking', 'other']).optional(),
});

/**
 * GET /api/gpx-plans/[id]
 * Get a single GPX plan
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Authentication
    const user = await requireAuth();
    const supabase = await createClient();
    const { id: planId } = await params;

    // 3. Get plan
    const { data: plan, error } = await supabase
      .from("gpx_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      logger.warn({ userId: user.id, planId }, "Plan not found");
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    // 4. Verify access
    const hasAccess = plan.user_id === user.id || plan.nutritionist_id === user.id;

    if (!hasAccess) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized plan access attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    logger.info({ userId: user.id, planId }, "GPX plan retrieved");

    return Response.json({ success: true, data: plan });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unexpected error in GET /api/gpx-plans/[id]");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/gpx-plans/[id]
 * Update a GPX plan
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Authentication
    const user = await requireAuth();
    const supabase = await createClient();
    const { id: planId } = await params;

    // 3. Verify ownership
    const { data: plan } = await supabase
      .from("gpx_plans")
      .select("user_id")
      .eq("id", planId)
      .single();

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.user_id !== user.id) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized plan update attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Validation
    const body = await request.json();
    const validatedData = updateGPXPlanSchema.parse(body);

    // 5. Update plan
    const { data: updatedPlan, error } = await supabase
      .from("gpx_plans")
      .update(validatedData)
      .eq("id", planId)
      .select()
      .single();

    if (error) {
      logger.error({ error, planId }, "Failed to update GPX plan");
      return Response.json({ error: "Failed to update plan" }, { status: 500 });
    }

    // 6. Audit log
    await auditSuccess(
      request,
      user.id,
      "gpx_plan.update" as any,
      "gpx_plan",
      planId
    );

    logger.info({ userId: user.id, planId }, "GPX plan updated");

    return Response.json({ success: true, data: updatedPlan });
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
    logger.error({ error }, "Unexpected error in PATCH /api/gpx-plans/[id]");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/gpx-plans/[id]
 * Delete a GPX plan and associated file
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Authentication
    const user = await requireAuth();
    const supabase = await createClient();
    const { id: planId } = await params;

    // 3. Get plan and verify ownership
    const { data: plan } = await supabase
      .from("gpx_plans")
      .select("user_id, gpx_file_path")
      .eq("id", planId)
      .single();

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.user_id !== user.id) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized plan deletion attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Delete GPX file from storage
    if (plan.gpx_file_path) {
      const { error: storageError } = await supabase.storage
        .from("gpx-files")
        .remove([plan.gpx_file_path]);

      if (storageError) {
        logger.warn({ error: storageError, planId, filePath: plan.gpx_file_path }, "Failed to delete GPX file from storage");
        // Continue with plan deletion even if file deletion fails
      }
    }

    // 5. Delete plan (cascades to waypoints)
    const { error } = await supabase
      .from("gpx_plans")
      .delete()
      .eq("id", planId);

    if (error) {
      logger.error({ error, planId }, "Failed to delete GPX plan");
      return Response.json({ error: "Failed to delete plan" }, { status: 500 });
    }

    // 6. Audit log
    await auditSuccess(
      request,
      user.id,
      "gpx_plan.delete" as any,
      "gpx_plan",
      planId
    );

    logger.info({ userId: user.id, planId }, "GPX plan deleted");

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unexpected error in DELETE /api/gpx-plans/[id]");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
