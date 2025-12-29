/**
 * API Endpoint: /api/gpx-plans/[id]/waypoints
 *
 * GET - List waypoints for a GPX plan
 * POST - Create a new waypoint for a GPX plan
 */

import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { auditSuccess } from "@/services/audit.service";
import { createWaypointSchema } from "@/lib/validations/gpx";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/auth/errors";

/**
 * Helper: Check if user is connected nutritionist to patient
 */
async function isConnectedNutritionist(
  supabase: any,
  nutritionistId: string,
  patientId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("patient_nutritionist_connections")
    .select("id")
    .eq("nutritionist_id", nutritionistId)
    .eq("patient_id", patientId)
    .single();

  return !!data;
}

/**
 * GET /api/gpx-plans/[id]/waypoints
 * Lista todos los waypoints de un plan GPX
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

    // 3. Verify access (user owns plan or is connected nutritionist)
    const { data: plan } = await supabase
      .from("gpx_plans")
      .select("user_id, nutritionist_id")
      .eq("id", planId)
      .single();

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    const hasAccess = plan.user_id === user.id || plan.nutritionist_id === user.id;

    if (!hasAccess) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized waypoints access attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Get waypoints
    const { data: waypoints, error } = await supabase
      .from("gpx_nutrition_waypoints")
      .select("*")
      .eq("gpx_plan_id", planId)
      .order("distance_from_start_km", { ascending: true });

    if (error) {
      logger.error({ error, planId }, "Failed to fetch waypoints");
      return Response.json({ error: "Failed to fetch waypoints" }, { status: 500 });
    }

    logger.info({ userId: user.id, planId, count: waypoints?.length || 0 }, "Waypoints fetched");

    return Response.json({ data: waypoints || [] });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unexpected error in GET /api/gpx-plans/[id]/waypoints");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/gpx-plans/[id]/waypoints
 * Crea un nuevo waypoint nutricional
 */
export async function POST(
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

    // 3. Verify ownership or nutritionist access
    const { data: plan } = await supabase
      .from("gpx_plans")
      .select("user_id")
      .eq("id", planId)
      .single();

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    // Check if user owns plan or is connected nutritionist
    const canEdit = plan.user_id === user.id ||
                    await isConnectedNutritionist(supabase, user.id, plan.user_id);

    if (!canEdit) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized waypoint creation attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Validation
    const body = await request.json();
    const validatedData = createWaypointSchema.parse(body);

    // 5. Insert waypoint
    const { data, error } = await supabase
      .from("gpx_nutrition_waypoints")
      .insert({
        gpx_plan_id: planId,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        elevation_m: validatedData.elevation_m,
        distance_from_start_km: validatedData.distance_from_start_km,
        trigger_distance_km: validatedData.trigger_distance_km,
        trigger_time_min: validatedData.trigger_time_min,
        nutrition_type: validatedData.nutrition_type,
        product_name: validatedData.product_name,
        calories: validatedData.calories,
        carbs: validatedData.carbs,
        protein: validatedData.protein,
        fat: validatedData.fat,
        sodium_mg: validatedData.sodium_mg,
        caffeine_mg: validatedData.caffeine_mg,
        quantity: validatedData.quantity,
        quantity_unit: validatedData.quantity_unit,
        notes: validatedData.notes,
        icon_symbol: validatedData.icon_symbol,
        sort_order: validatedData.sort_order,
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, planId }, "Failed to create waypoint");
      return Response.json({ error: "Failed to create waypoint" }, { status: 500 });
    }

    // 6. Audit log
    await auditSuccess(
      request,
      user.id,
      "gpx_waypoint.create" as any,
      "gpx_waypoint",
      data.id,
      { planId }
    );

    logger.info({ userId: user.id, planId, waypointId: data.id }, "Waypoint created");

    return Response.json({ success: true, data }, { status: 201 });
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
    logger.error({ error }, "Unexpected error in POST /api/gpx-plans/[id]/waypoints");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
