/**
 * API Endpoint: /api/gpx-plans/[id]/upload
 *
 * POST - Upload GPX file for a plan
 */

import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { parseGPXFile } from "@/lib/gpx/parser";
import { AuthenticationError } from "@/lib/auth/errors";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (archivos GPX pueden ser grandes)

/**
 * POST /api/gpx-plans/[id]/upload
 * Sube un archivo GPX y actualiza el plan con estadísticas
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Strict rate limiting for uploads (3/min)
    const rateLimitResult = rateLimit(request, 'strict');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Too many upload requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Authentication
    const user = await requireAuth();
    const supabase = await createClient();
    const { id: planId } = await params;

    // 3. Verify ownership
    const { data: plan, error: planError } = await supabase
      .from("gpx_plans")
      .select("user_id")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logger.warn({ userId: user.id, planId }, "Plan not found for upload");
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.user_id !== user.id) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized upload attempt");
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 4. Get file from form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      logger.warn({ userId: user.id, fileSize: file.size }, "File size exceeds limit");
      return Response.json(
        { error: `File size exceeds maximum of 20MB` },
        { status: 400 }
      );
    }

    // 6. Validate file extension (more reliable than MIME type for GPX files)
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      logger.warn({ userId: user.id, fileName: file.name }, "Invalid file extension");
      return Response.json(
        { error: "Only .gpx files are allowed" },
        { status: 400 }
      );
    }

    // 7. Read and parse GPX
    const fileContent = await file.text();

    let parsedGPX;
    try {
      parsedGPX = await parseGPXFile(fileContent);
    } catch (parseError) {
      logger.error({ error: parseError, userId: user.id }, "Failed to parse GPX file");
      return Response.json(
        { error: "Invalid GPX file format. Please ensure the file is a valid GPX 1.1 file." },
        { status: 400 }
      );
    }

    // 8. Validate parsed data
    if (!parsedGPX.tracks || parsedGPX.tracks.length === 0) {
      return Response.json(
        { error: "GPX file contains no tracks" },
        { status: 400 }
      );
    }

    // 9. Generate filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}-${sanitizedName}`;
    const filePath = `${user.id}/${planId}/${filename}`;

    // 10. Upload to storage
    const { error: storageError } = await supabase.storage
      .from("gpx-files")
      .upload(filePath, fileContent, {
        contentType: "application/gpx+xml",
        upsert: false,
      });

    if (storageError) {
      logger.error({ error: storageError, userId: user.id, filePath }, "Failed to upload GPX file to storage");
      return Response.json(
        { error: "Failed to upload file. Please try again." },
        { status: 500 }
      );
    }

    // 11. Update plan with file path and stats
    const { data: updatedPlan, error: updateError } = await supabase
      .from("gpx_plans")
      .update({
        gpx_file_path: filePath,
        total_distance_km: parsedGPX.stats.totalDistanceKm,
        total_elevation_gain_m: parsedGPX.stats.totalElevationGainM,
        total_elevation_loss_m: parsedGPX.stats.totalElevationLossM,
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .select()
      .single();

    if (updateError) {
      logger.error({ error: updateError, userId: user.id, planId }, "Failed to update plan with GPX data");

      // Cleanup: delete uploaded file
      await supabase.storage.from("gpx-files").remove([filePath]);

      return Response.json({ error: "Failed to update plan" }, { status: 500 });
    }

    logger.info({
      userId: user.id,
      planId,
      distance: parsedGPX.stats.totalDistanceKm,
      elevationGain: parsedGPX.stats.totalElevationGainM
    }, "GPX file uploaded and parsed successfully");

    // 12. Return parsed data + plan
    return Response.json({
      success: true,
      data: {
        plan: updatedPlan,
        parsed: {
          stats: parsedGPX.stats,
          trackName: parsedGPX.tracks[0].name,
          pointCount: parsedGPX.tracks[0].points.length,
        },
      },
    }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unexpected error in POST /api/gpx-plans/[id]/upload");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
