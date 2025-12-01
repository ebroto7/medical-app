import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    // Get patient's training sessions
    let query = supabase
      .from("training_sessions")
      .select("*")
      .eq("user_id", patientId);

    if (date) {
      query = query.eq("date", date);
    } else if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error: queryError } = await query
      .order("date", { ascending: false })
      .order("time", { ascending: true });

    if (queryError) {
      return Response.json({ error: queryError.message }, { status: 500 });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("Error fetching patient training sessions:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
