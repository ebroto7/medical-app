import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ZodError } from "zod";

const requestPatientSchema = z.object({
  patientEmail: z.string().email("Invalid email format"),
});

export async function POST(request: Request) {
  try {
    // 1. Apply strict rate limiting (3 requests per minute)
    const rateLimitResult = rateLimit(request, 'strict');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Require authentication
    const nutritionist = await requireAuth();

    // 3. Require nutritionist role
    await requireRole(nutritionist.id, ["nutritionist"]);

    // 4. Validate body
    const body = await request.json();
    const { patientEmail } = requestPatientSchema.parse(body);

    // Admin client (requires service role key)
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5. Find patient by email using admin client
    // Note: Using listUsers is O(n) but we mitigate with:
    // - Strict rate limiting (3 req/min) to prevent enumeration attacks
    // - Generic error messages (no specific "user not found" vs "not a patient")
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const patient = users?.find(u => u.email?.toLowerCase() === patientEmail.toLowerCase());

    // Use generic error messages to prevent email enumeration
    if (!patient) {
      return Response.json(
        { error: "Unable to send connection request" },
        { status: 400 }
      );
    }

    // 6. Check if patient has a profile with patient role
    const { data: patientProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", patient.id)
      .single();

    if (!patientProfile || patientProfile.role !== "patient") {
      return Response.json(
        { error: "Unable to send connection request" },
        { status: 400 }
      );
    }

    // 7. Check if patient already has a nutritionist connected
    const { data: existingConnections } = await supabaseAdmin
      .from("patient_nutritionist_connections")
      .select("nutritionist_id")
      .eq("patient_id", patient.id);

    if (existingConnections && existingConnections.length > 0) {
      const connectedNutritionistId = existingConnections[0].nutritionist_id;
      const { data: connectedProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", connectedNutritionistId)
        .single();

      const connectedName = connectedProfile?.full_name || "Otro nutricionista";
      return Response.json(
        {
          error: `Este paciente ya está vinculado con ${connectedName}. El paciente debe desconectarse primero.`,
          patientHasNutritionist: true,
          connectedNutritionistId,
        },
        { status: 409 }
      );
    }

    // 8. Check if a request already exists (pending or accepted)
    const { data: existingRequest } = await supabaseAdmin
      .from("nutritionist_requests")
      .select("id, status")
      .eq("nutritionist_id", nutritionist.id)
      .eq("patient_id", patient.id)
      .in("status", ["pending", "accepted"]);

    if (existingRequest && existingRequest.length > 0) {
      const status = existingRequest[0].status;
      if (status === "pending") {
        return Response.json({ error: "Request already pending" }, { status: 409 });
      } else if (status === "accepted") {
        return Response.json({ error: "Already connected to this patient" }, { status: 409 });
      }
    }

    // 9. Create the request
    const { data: requestData, error: insertError } = await supabaseAdmin
      .from("nutritionist_requests")
      .insert({
        nutritionist_id: nutritionist.id,
        patient_id: patient.id,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting request:", insertError);
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Request sent successfully",
      data: requestData
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Only nutritionists can make requests" }, { status: 403 });
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
