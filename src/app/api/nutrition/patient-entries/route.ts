import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const date = searchParams.get("date");

    if (!patientId) {
      return Response.json(
        { error: "patientId required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
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

    const { data: { user: nutritionist } } = await supabase.auth.getUser();
    if (!nutritionist) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if nutritionist is connected to this patient
    const { data: connection } = await supabase
      .from("patient_nutritionist_connections")
      .select("id")
      .eq("patient_id", patientId)
      .eq("nutritionist_id", nutritionist.id)
      .single();

    if (!connection) {
      return Response.json(
        { error: "You are not connected to this patient" },
        { status: 403 }
      );
    }

    // Get patient's entries
    let query = supabase
      .from("nutrition_entries")
      .select(`
        *,
        nutrition_images (*)
      `)
      .eq("user_id", patientId);

    if (date) {
      query = query.eq("date", date);
    }

    const { data, error: queryError } = await query.order("date", {
      ascending: false,
    });

    if (queryError) {
      return Response.json({ error: queryError.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("Error fetching patient entries:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
