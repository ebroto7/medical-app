/**
 * API Endpoint: /api/gpx-plans/[id]/export
 *
 * GET - Download GPX file with nutrition waypoints
 */

import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { parseGPXFile } from "@/lib/gpx/parser";
import { generateGPXWithNutrition, type NutritionWaypoint } from "@/lib/gpx/exporter";
import { AuthenticationError } from "@/lib/auth/errors";

/**
 * GET /api/gpx-plans/[id]/export
 * Descarga archivo GPX modificado con waypoints nutricionales
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
    const { data: plan, error: planError } = await supabase
      .from("gpx_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logger.warn({ userId: user.id, planId }, "Plan not found for export");
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    // 4. Verify access
    const hasAccess = plan.user_id === user.id || plan.nutritionist_id === user.id;

    if (!hasAccess) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized export attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 5. Validate GPX file path
    if (!plan.gpx_file_path) {
      return Response.json(
        { error: "No GPX file uploaded yet. Please upload a GPX file first." },
        { status: 400 }
      );
    }

    // 6. Get original GPX file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("gpx-files")
      .download(plan.gpx_file_path);

    if (fileError || !fileData) {
      logger.error({ error: fileError, planId, filePath: plan.gpx_file_path }, "Failed to download GPX file");
      return Response.json(
        { error: "Failed to retrieve GPX file" },
        { status: 500 }
      );
    }

    // 7. Parse original GPX
    const fileContent = await fileData.text();
    let parsedGPX;

    try {
      parsedGPX = await parseGPXFile(fileContent);
    } catch (parseError) {
      logger.error({ error: parseError, planId }, "Failed to parse stored GPX file");
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

    // 8. Get nutrition waypoints
    const { data: waypoints, error: waypointsError } = await supabase
      .from("gpx_nutrition_waypoints")
      .select("*")
      .eq("gpx_plan_id", planId)
      .order("distance_from_start_km", { ascending: true });

    if (waypointsError) {
      logger.error({ error: waypointsError, planId }, "Failed to fetch waypoints for export");
      return Response.json(
        { error: "Failed to fetch waypoints" },
        { status: 500 }
      );
    }

    // 9. Map waypoints to exporter format
    const nutritionWaypoints: NutritionWaypoint[] = (waypoints || []).map(wp => ({
      latitude: wp.latitude,
      longitude: wp.longitude,
      elevation_m: wp.elevation_m || undefined,
      trigger_distance_km: wp.trigger_distance_km || undefined,
      trigger_time_min: wp.trigger_time_min || undefined,
      nutrition_type: wp.nutrition_type,
      product_name: wp.product_name || undefined,
      calories: wp.calories || undefined,
      carbs: wp.carbs || undefined,
      protein: wp.protein || undefined,
      sodium_mg: wp.sodium_mg || undefined,
      caffeine_mg: wp.caffeine_mg || undefined,
      quantity: wp.quantity || undefined,
      quantity_unit: wp.quantity_unit || undefined,
      notes: wp.notes || undefined,
      icon_symbol: wp.icon_symbol || undefined,
    }));

    // 10. Generate modified GPX
    const modifiedGPX = generateGPXWithNutrition(
      parsedGPX.tracks[0],
      nutritionWaypoints,
      plan.name,
      plan.description || undefined
    );

    // 11. Generate filename
    const sanitizedName = plan.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedName}.gpx`;

    logger.info({
      userId: user.id,
      planId,
      waypointCount: nutritionWaypoints.length
    }, "GPX file exported successfully");

    // 12. Return as downloadable file
    return new Response(modifiedGPX, {
      status: 200,
      headers: {
        'Content-Type': 'application/gpx+xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unexpected error in GET /api/gpx-plans/[id]/export");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
