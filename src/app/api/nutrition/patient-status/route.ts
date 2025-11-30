import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return Response.json({ error: "patientId required" }, { status: 400 });
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

  // Check if patient already has a nutritionist
  const { data: connections } = await supabase
    .from("patient_nutritionist_connections")
    .select("nutritionist_id")
    .eq("patient_id", patientId);

  const hasNutritionist = connections && connections.length > 0;
  let linkedNutritionistId = null;

  if (hasNutritionist) {
    linkedNutritionistId = connections[0].nutritionist_id;
  }

  return Response.json({
    data: {
      patientId,
      hasNutritionist,
      linkedNutritionistId,
    },
  });
}
