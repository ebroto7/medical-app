import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function POST(request: Request) {
  const body = await request.json();
  const { requestId } = body;

  if (!requestId) {
    return Response.json({ error: "Request ID required" }, { status: 400 });
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: requestData } = await supabase
    .from("nutritionist_requests")
    .select("id, nutritionist_id, patient_id")
    .eq("id", requestId)
    .single();

  if (!requestData || requestData.patient_id !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if patient already has a nutritionist
  const { data: existingConnections } = await supabase
    .from("patient_nutritionist_connections")
    .select("nutritionist_id")
    .eq("patient_id", user.id);

  if (existingConnections && existingConnections.length > 0) {
    return Response.json(
      {
        error: "Ya tienes un nutricionista vinculado. Debes desconectarte del actual primero.",
        currentNutritionistId: existingConnections[0].nutritionist_id,
      },
      { status: 409 }
    );
  }

  await supabase.from("nutritionist_requests").update({ status: "accepted" }).eq("id", requestId);

  await supabase
    .from("patient_nutritionist_connections")
    .insert({
      patient_id: user.id,
      nutritionist_id: requestData.nutritionist_id,
    });

  return Response.json({ success: true, message: "Accepted" }, { status: 200 });
}
