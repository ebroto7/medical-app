import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { createNutritionEntrySchema } from "@/lib/validations/nutrition";
import { addSignedUrlsToEntries } from "@/lib/storage/signed-urls";
import { ZodError } from "zod";

export async function GET(request: Request) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 3. Query entries
    const supabase = await createClient();
    let query = supabase
      .from("nutrition_entries")
      .select(`
        *,
        nutrition_images (*)
      `)
      .eq("user_id", user.id);

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
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Parse and validate body
    const body = await request.json();
    const validatedData = createNutritionEntrySchema.parse(body);

    // 3. Insert entry
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("nutrition_entries")
      .insert({
        user_id: user.id,
        date: validatedData.date,
        meal_type: validatedData.mealType,
        description: validatedData.description || null,
        time: validatedData.time || null,
      })
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data }, { status: 201 });
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
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
