import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { addSignedUrlsToEntries } from "@/lib/storage/signed-urls";
import { updateNutritionEntrySchema } from "@/lib/validations/nutrition";
import { ZodError } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Get entry by ID
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("nutrition_entries")
      .select(`
        *,
        nutrition_images (*)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    // Add signed URLs to images
    const [dataWithSignedUrls] = await addSignedUrlsToEntries(supabase, [data]);

    return Response.json({ data: dataWithSignedUrls });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { logger } from "@/lib/logger";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Parse and validate body with Zod
    const body = await request.json();
    const validatedData = updateNutritionEntrySchema.parse(body);
    const { id } = await params;

    // 3. Verify ownership
    const supabase = await createClient();

    // Debug tracer for ownership check
    const { data: existingEntry } = await supabase
      .from("nutrition_entries")
      .select("user_id")
      .eq("id", id)
      .single();


    if (!existingEntry) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    if (existingEntry.user_id !== user.id) {
      logger.warn({ userId: user.id, entryId: id }, "Unauthorized update attempt");
      return Response.json(
        { error: "You do not have permission to update this entry" },
        { status: 403 }
      );
    }

    // 4. Update entry
    const { data, error } = await supabase
      .from("nutrition_entries")
      .update({
        date: validatedData.date,
        meal_type: validatedData.mealType,
        description: validatedData.description ?? null,
        time: validatedData.time ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      logger.error({ error, entryId: id }, "Error updating entry");
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    logger.info({ userId: user.id, entryId: id }, "Entry updated");
    return Response.json({ data: data[0] });
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
    logger.error({ error }, "Internal server error in entries/[id]");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    const { id } = await params;

    // 2. Verify ownership
    const supabase = await createClient();
    const { data: existingEntry } = await supabase
      .from("nutrition_entries")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingEntry) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    if (existingEntry.user_id !== user.id) {
      logger.warn({ userId: user.id, entryId: id }, "Unauthorized delete attempt");
      return Response.json(
        { error: "You do not have permission to delete this entry" },
        { status: 403 }
      );
    }

    // 3. Delete entry
    const { error } = await supabase
      .from("nutrition_entries")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error({ error, entryId: id }, "Error deleting entry");
      return Response.json({ error: error.message }, { status: 500 });
    }

    logger.info({ userId: user.id, entryId: id }, "Entry deleted");
    return Response.json({ message: "Entry deleted" }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    logger.error({ error }, "Internal server error in entries/[id]");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
