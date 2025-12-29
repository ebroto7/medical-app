/**
 * API Endpoint: /api/gpx-plans
 *
 * GET - List all GPX plans for authenticated user
 * POST - Create a new GPX plan (file will be uploaded later)
 */

import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { auditSuccess } from "@/services/audit.service";
import { createGPXPlanSchema } from "@/lib/validations/gpx";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import { AuthenticationError } from "@/lib/auth/errors";

/**
 * GET /api/gpx-plans
 * Lista todos los planes GPX del usuario autenticado
 */
export async function GET(request: Request) {
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

    // 3. Get user's own plans + plans from connected patients (if nutritionist)
    const { data: plans, error } = await supabase
      .from("gpx_plans")
      .select("*")
      .or(`user_id.eq.${user.id},nutritionist_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error, userId: user.id }, "Failed to fetch GPX plans");
      return Response.json({ error: "Failed to fetch plans" }, { status: 500 });
    }

    logger.info({ userId: user.id, count: plans?.length || 0 }, "GPX plans fetched");

    return Response.json({ data: plans || [] });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Unexpected error in GET /api/gpx-plans");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/gpx-plans
 * Crea un nuevo plan GPX (sin archivo aún)
 */
export async function POST(request: Request) {
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

    // 3. Validation
    const body = await request.json();
    const validatedData = createGPXPlanSchema.parse(body);

    const supabase = await createClient();

    // 4. Create plan (gpx_file_path will be set after upload)
    const { data, error } = await supabase
      .from("gpx_plans")
      .insert({
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description,
        event_name: validatedData.event_name,
        event_date: validatedData.event_date,
        sport_type: validatedData.sport_type,
        gpx_file_path: null, // Will be updated after upload
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, userId: user.id }, "Failed to create GPX plan");
      return Response.json({ error: "Failed to create plan" }, { status: 500 });
    }

    // 5. Audit log
    await auditSuccess(
      request,
      user.id,
      "gpx_plan.create" as any,
      "gpx_plan",
      data.id
    );

    logger.info({ userId: user.id, planId: data.id }, "GPX plan created");

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
    logger.error({ error }, "Unexpected error in POST /api/gpx-plans");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
