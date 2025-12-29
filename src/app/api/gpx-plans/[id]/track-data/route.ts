/**
 * API Endpoint: /api/gpx-plans/[id]/track-data
 *
 * GET - Get parsed track points for visualization
 */

import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { parseGPXFile } from "@/lib/gpx/parser";
import { AuthenticationError } from "@/lib/auth/errors";

/**
 * GET /api/gpx-plans/[id]/track-data
 * Returns parsed track points for chart visualization
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

    // 3. Get plan and verify access
    const { data: plan, error: planError } = await supabase
      .from("gpx_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logger.warn({ userId: user.id, planId }, "Plan not found for track-data");
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    // 4. Verify access (owner or connected nutritionist)
    const hasAccess = plan.user_id === user.id || plan.nutritionist_id === user.id;

    if (!hasAccess) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized track-data access attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 5. Validate GPX file exists
    if (!plan.gpx_file_path) {
      return Response.json(
        { error: "No GPX file uploaded yet" },
        { status: 400 }
      );
    }

    // 6. Download GPX file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("gpx-files")
      .download(plan.gpx_file_path);

    if (fileError || !fileData) {
      logger.error({ error: fileError, planId, filePath: plan.gpx_file_path }, "Failed to download GPX file for track-data");
      return Response.json(
        { error: "Failed to retrieve GPX file" },
        { status: 500 }
      );
    }

    // 7. Parse GPX file
    const fileContent = await fileData.text();
    let parsedGPX;

    try {
      parsedGPX = await parseGPXFile(fileContent);
    } catch (parseError) {
      logger.error({ error: parseError, planId }, "Failed to parse GPX file for track-data");
      return Response.json(
        { error: "Failed to parse GPX file" },
        { status: 500 }
      );
    }

    if (!parsedGPX.tracks || parsedGPX.tracks.length === 0) {
      return Response.json(
        { error: "GPX file contains no tracks" },
        { status: 400 }
      );
    }

    // 8. Return track points (only first track for simplicity)
    const trackPoints = parsedGPX.tracks[0].points;

    logger.info({
      userId: user.id,
      planId,
      pointsCount: trackPoints.length
    }, "Track data retrieved");

    return Response.json({
      success: true,
      data: {
        trackPoints,
        stats: parsedGPX.stats,
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unexpected error in GET /api/gpx-plans/[id]/track-data");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
