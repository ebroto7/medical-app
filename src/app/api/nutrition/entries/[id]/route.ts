import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";
import { addSignedUrlsToEntries } from "@/lib/storage/signed-urls";

function createAuthenticatedClient(authToken: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const supabase = createAuthenticatedClient(token);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
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
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const supabase = createAuthenticatedClient(token);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { date, mealType, description, time } = body;
    const { id } = await params;

    const { data: existingEntry } = await supabase
      .from("nutrition_entries")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingEntry) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    if (existingEntry.user_id !== user.id) {
      return Response.json(
        { error: "You do not have permission to update this entry" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("nutrition_entries")
      .update({
        date,
        meal_type: mealType,
        description: description || null,
        time: time || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    return Response.json({ data: data[0] });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const supabase = createAuthenticatedClient(token);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { data: existingEntry } = await supabase
      .from("nutrition_entries")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingEntry) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    if (existingEntry.user_id !== user.id) {
      return Response.json(
        { error: "You do not have permission to delete this entry" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("nutrition_entries")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ message: "Entry deleted" }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
