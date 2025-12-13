import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { z } from "zod";
import { ZodError } from "zod";

const requestPatientSchema = z.object({
  patientEmail: z.string().email("Invalid email format"),
});

export async function POST(request: Request) {
  try {
    // 1. Require authentication
    const nutritionist = await requireAuth();

    // 2. Require nutritionist role
    await requireRole(nutritionist.id, ["nutritionist"]);

    // 3. Validate body
    const body = await request.json();
    const { patientEmail } = requestPatientSchema.parse(body);

    // Admin client for listing users (requires service role key)
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. Find patient by email using admin client
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const patient = users?.find(u => u.email?.toLowerCase() === patientEmail.toLowerCase());

    if (!patient) {
      return Response.json({ error: "Patient not found" }, { status: 404 });
    }

    // 5. Check if patient has a profile with patient role
    const { data: patientProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", patient.id)
      .single();

    if (!patientProfile || patientProfile.role !== "patient") {
      return Response.json({ error: "User is not a patient" }, { status: 400 });
    }

    // 6. Check if patient already has a nutritionist connected
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

    // 7. Check if a request already exists (pending or accepted)
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

    // 8. Create the request
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
