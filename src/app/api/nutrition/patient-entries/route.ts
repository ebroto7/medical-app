import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole, canAccessPatientData } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { addSignedUrlsToEntries } from "@/lib/storage/signed-urls";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!patientId) {
      return Response.json({ error: "patientId required" }, { status: 400 });
    }

    // 1. Require authentication
    const user = await requireAuth();

    // 2. Require nutritionist role
    await requireRole(user.id, ["nutritionist"]);

    // 3. Check if nutritionist is connected to this patient
    const hasAccess = await canAccessPatientData(user.id, patientId);
    if (!hasAccess) {
      return Response.json(
        { error: "You are not connected to this patient" },
        { status: 403 }
      );
    }

    // 4. Get patient's entries
    const supabase = await createClient();
    let query = supabase
      .from("nutrition_entries")
      .select(`
        *,
        nutrition_images (*)
      `)
      .eq("user_id", patientId);

    if (date) {
      query = query.eq("date", date);
    } else if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error: queryError } = await query
      .order("date", { ascending: false })
      .order("time", { ascending: true, nullsFirst: true });

    if (queryError) {
      return Response.json({ error: queryError.message }, { status: 500 });
    }

    // Add signed URLs to images
    const dataWithSignedUrls = await addSignedUrlsToEntries(supabase, data || []);

    return Response.json({ data: dataWithSignedUrls });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Access denied: nutritionist role required" }, { status: 403 });
    }
    console.error("Error fetching patient entries:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
