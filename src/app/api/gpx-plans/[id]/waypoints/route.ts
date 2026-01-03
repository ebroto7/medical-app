/**
 * API Endpoint: /api/gpx-plans/[id]/waypoints
 *
 * GET - List waypoints for a GPX plan
 * POST - Create a new waypoint (spatial, temporal single, or temporal loop)
 * PATCH - Update an existing waypoint
 * DELETE - Delete a waypoint
 */

import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { auditSuccess } from "@/services/audit.service";
import { createWaypointSchema, updateWaypointSchema } from "@/lib/validations/gpx";
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
 * Helper: Verify user can edit plan (owner or connected nutritionist)
 */
async function canEditPlan(
  supabase: any,
  userId: string,
  planId: string
): Promise<{ canEdit: boolean; plan?: any }> {
  const { data: plan } = await supabase
    .from("gpx_plans")
    .select("user_id")
    .eq("id", planId)
    .single();

  if (!plan) {
    return { canEdit: false };
  }

  const isOwner = plan.user_id === userId;
  const isNutritionist = await isConnectedNutritionist(supabase, userId, plan.user_id);

  return {
    canEdit: isOwner || isNutritionist,
    plan,
  };
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
      .order("created_at", { ascending: true });

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
 * Crea un nuevo waypoint nutricional (spatial, temporal single, o temporal loop)
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
    const { canEdit, plan } = await canEditPlan(supabase, user.id, planId);

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    if (!canEdit) {
      logger.warn({ userId: user.id, planId, ownerId: plan.user_id }, "Unauthorized waypoint creation attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Validation (discriminated union based on 'type')
    const body = await request.json();
    const validatedData = createWaypointSchema.parse(body);

    // 4.5 Auto-calculate repetitions for temporal loops if not provided
    if (validatedData.type === 'temporal' && validatedData.is_repeating) {
      if (!validatedData.repeat_config.repetitions) {
        // Fetch plan's estimated_duration_minutes
        const { data: planData } = await supabase
          .from("gpx_plans")
          .select("estimated_duration_minutes")
          .eq("id", planId)
          .single();

        if (!planData?.estimated_duration_minutes) {
          return Response.json(
            { error: "Debes especificar el número de repeticiones o establecer un tiempo estimado en el plan" },
            { status: 400 }
          );
        }

        const { start_time_min, interval_min } = validatedData.repeat_config;
        const duration = planData.estimated_duration_minutes;

        // Validate that start_time_min is within the plan duration
        if (start_time_min >= duration) {
          return Response.json(
            { error: `El tiempo de inicio (${start_time_min} min) debe ser menor que la duración del plan (${duration} min)` },
            { status: 400 }
          );
        }

        // Calculate repetitions: (duration - start) / interval + 1
        const calculatedReps = Math.floor((duration - start_time_min) / interval_min) + 1;

        // Clamp between 1 and 50
        validatedData.repeat_config.repetitions = Math.min(Math.max(calculatedReps, 1), 50);

        logger.info(
          { planId, start: start_time_min, interval: interval_min, duration, calculatedReps: validatedData.repeat_config.repetitions },
          "Auto-calculated loop repetitions"
        );
      }
    }

    // 5. Prepare insert data based on waypoint type
    // Default color if not provided
    const defaultColor = '#3b82f6';

    const insertData: any = {
      gpx_plan_id: planId,
      type: validatedData.type,
      name: validatedData.name,
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
      color: validatedData.color || defaultColor,  // Apply default color if not provided
      // Legacy fields for backwards compatibility
      icon_symbol: validatedData.icon_symbol,
      sort_order: validatedData.sort_order,
    };

    // Type-specific fields
    if (validatedData.type === 'spatial') {
      // Spatial waypoint: has coordinates
      insertData.latitude = validatedData.latitude;
      insertData.longitude = validatedData.longitude;
      insertData.elevation_m = validatedData.elevation_m;
      insertData.distance_from_start_km = validatedData.distance_from_start_km;
      insertData.trigger_distance_km = validatedData.trigger_distance_km;
      insertData.is_repeating = false;
      insertData.trigger_time_min = null;
      insertData.repeat_config = null;
    } else {
      // Temporal waypoint: no coordinates
      insertData.latitude = null;
      insertData.longitude = null;
      insertData.elevation_m = null;
      insertData.distance_from_start_km = null;
      insertData.trigger_distance_km = null;

      if (validatedData.is_repeating) {
        // Temporal loop: has repeat_config and color (required)
        insertData.is_repeating = true;
        insertData.repeat_config = validatedData.repeat_config;
        insertData.trigger_time_min = null;
        // Color already set above
      } else {
        // Temporal single: has trigger_time_min
        insertData.is_repeating = false;
        insertData.trigger_time_min = validatedData.trigger_time_min;
        insertData.repeat_config = null;
      }
    }

    // 6. Insert waypoint
    const { data, error } = await supabase
      .from("gpx_nutrition_waypoints")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error({ error, planId, waypointType: validatedData.type }, "Failed to create waypoint");

      // Check if it's a constraint violation (might be DB constraint enforcement)
      if (error.code === '23514') {
        return Response.json(
          { error: "Waypoint data violates database constraints. Check that spatial waypoints have coordinates and temporal waypoints do not." },
          { status: 400 }
        );
      }

      return Response.json({ error: "Failed to create waypoint" }, { status: 500 });
    }

    // 7. Audit log
    await auditSuccess(
      request,
      user.id,
      "gpx_waypoint.create" as any,
      "gpx_waypoint",
      data.id,
      {
        planId,
        waypointType: validatedData.type,
        isRepeating: validatedData.is_repeating || false,
      }
    );

    logger.info(
      {
        userId: user.id,
        planId,
        waypointId: data.id,
        type: validatedData.type,
        isRepeating: validatedData.is_repeating || false,
      },
      "Waypoint created"
    );

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

/**
 * PATCH /api/gpx-plans/[id]/waypoints
 * Actualiza un waypoint existente
 *
 * Query params: waypoint_id (required)
 * Body: Partial waypoint data (cannot change 'type' or 'is_repeating')
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

    // 3. Verify ownership or nutritionist access
    const { canEdit, plan } = await canEditPlan(supabase, user.id, planId);

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    if (!canEdit) {
      logger.warn({ userId: user.id, planId }, "Unauthorized waypoint update attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Validation
    const body = await request.json();
    const validatedData = updateWaypointSchema.parse(body);

    const { waypoint_id, ...updateFields } = validatedData;

    // 5. Verify waypoint belongs to this plan
    const { data: existingWaypoint, error: fetchError } = await supabase
      .from("gpx_nutrition_waypoints")
      .select("id, gpx_plan_id, type, is_repeating")
      .eq("id", waypoint_id)
      .single();

    if (fetchError || !existingWaypoint) {
      return Response.json({ error: "Waypoint not found" }, { status: 404 });
    }

    if (existingWaypoint.gpx_plan_id !== planId) {
      logger.warn({ userId: user.id, waypointId: waypoint_id, planId }, "Waypoint does not belong to this plan");
      return Response.json({ error: "Waypoint not found" }, { status: 404 });
    }

    // 6. Validate update fields match waypoint type
    // Spatial waypoints cannot update temporal fields and vice versa
    if (existingWaypoint.type === 'spatial') {
      if (updateFields.trigger_time_min !== undefined || updateFields.repeat_config !== undefined) {
        return Response.json(
          { error: "Cannot update temporal fields on spatial waypoint" },
          { status: 400 }
        );
      }
    } else {
      // Temporal waypoint
      if (
        updateFields.latitude !== undefined ||
        updateFields.longitude !== undefined ||
        updateFields.elevation_m !== undefined ||
        updateFields.distance_from_start_km !== undefined
      ) {
        return Response.json(
          { error: "Cannot update spatial fields on temporal waypoint" },
          { status: 400 }
        );
      }
    }

    // 7. Update waypoint
    const { data, error } = await supabase
      .from("gpx_nutrition_waypoints")
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", waypoint_id)
      .select()
      .single();

    if (error) {
      logger.error({ error, waypointId: waypoint_id }, "Failed to update waypoint");

      if (error.code === '23514') {
        return Response.json(
          { error: "Update violates database constraints" },
          { status: 400 }
        );
      }

      return Response.json({ error: "Failed to update waypoint" }, { status: 500 });
    }

    // 8. Audit log
    await auditSuccess(
      request,
      user.id,
      "gpx_waypoint.update" as any,
      "gpx_waypoint",
      waypoint_id,
      {
        planId,
        updatedFields: Object.keys(updateFields),
      }
    );

    logger.info(
      { userId: user.id, planId, waypointId: waypoint_id },
      "Waypoint updated"
    );

    return Response.json({ success: true, data });
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
    logger.error({ error }, "Unexpected error in PATCH /api/gpx-plans/[id]/waypoints");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/gpx-plans/[id]/waypoints
 * Elimina un waypoint
 *
 * Query params: waypoint_id (required)
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

    // 3. Get waypoint_id from query params
    const url = new URL(request.url);
    const waypointId = url.searchParams.get('waypoint_id');

    if (!waypointId) {
      return Response.json({ error: "waypoint_id is required" }, { status: 400 });
    }

    // 4. Verify ownership or nutritionist access
    const { canEdit, plan } = await canEditPlan(supabase, user.id, planId);

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    if (!canEdit) {
      logger.warn({ userId: user.id, planId }, "Unauthorized waypoint deletion attempt");
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // 5. Verify waypoint belongs to this plan (and fetch data for audit log)
    const { data: existingWaypoint, error: fetchError } = await supabase
      .from("gpx_nutrition_waypoints")
      .select("*")
      .eq("id", waypointId)
      .single();

    if (fetchError || !existingWaypoint) {
      return Response.json({ error: "Waypoint not found" }, { status: 404 });
    }

    if (existingWaypoint.gpx_plan_id !== planId) {
      logger.warn({ userId: user.id, waypointId, planId }, "Waypoint does not belong to this plan");
      return Response.json({ error: "Waypoint not found" }, { status: 404 });
    }

    // 6. Delete waypoint
    const { error } = await supabase
      .from("gpx_nutrition_waypoints")
      .delete()
      .eq("id", waypointId);

    if (error) {
      logger.error({ error, waypointId }, "Failed to delete waypoint");
      return Response.json({ error: "Failed to delete waypoint" }, { status: 500 });
    }

    // 7. Audit log
    await auditSuccess(
      request,
      user.id,
      "gpx_waypoint.delete" as any,
      "gpx_waypoint",
      waypointId,
      {
        planId,
        waypointType: existingWaypoint.type,
        productName: existingWaypoint.product_name,
      }
    );

    logger.info(
      { userId: user.id, planId, waypointId },
      "Waypoint deleted"
    );

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unexpected error in DELETE /api/gpx-plans/[id]/waypoints");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
