import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function POST(request: Request) {
  const body = await request.json();
  const { patientEmail } = body;

  if (!patientEmail) {
    return Response.json({ error: "Patient email required" }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(patientEmail)) {
    return Response.json({ error: "Invalid email format" }, { status: 400 });
  }

  const cookieStore = await cookies();

  // Client with auth context (for getting current user)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Admin client for listing users (requires service role key)
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get current user (nutritionist)
  const { data: { user: nutritionist } } = await supabase.auth.getUser();
  if (!nutritionist) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if nutritionist has a profile (use admin client to bypass RLS)
  const { data: nutritionistProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", nutritionist.id)
    .single();

  if (!nutritionistProfile || nutritionistProfile.role !== "nutritionist") {
    return Response.json({ error: "Only nutritionists can make requests" }, { status: 403 });
  }

  // Find patient by email using admin client
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const patient = users?.find(u => u.email?.toLowerCase() === patientEmail.toLowerCase());

  if (!patient) {
    return Response.json({ error: "Patient not found" }, { status: 404 });
  }

  // Check if patient has a profile with patient role (use admin client to bypass RLS)
  const { data: patientProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", patient.id)
    .single();

  if (!patientProfile || patientProfile.role !== "patient") {
    return Response.json({ error: "User is not a patient" }, { status: 400 });
  }

  // Check if patient already has a nutritionist connected - use admin client
  const { data: existingConnections } = await supabaseAdmin
    .from("patient_nutritionist_connections")
    .select("nutritionist_id")
    .eq("patient_id", patient.id);

  if (existingConnections && existingConnections.length > 0) {
    // Get the name of the connected nutritionist
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

  // Check if a request already exists (pending or accepted) - use admin client
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

  // Create the request - use admin client to bypass RLS
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
}
