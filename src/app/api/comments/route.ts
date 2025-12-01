import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
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
}

// GET - Fetch comments for an entry or training session
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entry_id");
    const trainingSessionId = searchParams.get("training_session_id");

    if (!entryId && !trainingSessionId) {
      return Response.json(
        { error: "entry_id or training_session_id required" },
        { status: 400 }
      );
    }

    // First get comments
    let query = supabase
      .from("nutritionist_comments")
      .select("*");

    if (entryId) {
      query = query.eq("entry_id", entryId);
    } else if (trainingSessionId) {
      query = query.eq("training_session_id", trainingSessionId);
    }

    const { data: comments, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Fetch nutritionist profiles for the comments
    if (comments && comments.length > 0) {
      const nutritionistIds = [...new Set(comments.map(c => c.nutritionist_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", nutritionistIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const dataWithProfiles = comments.map(comment => ({
        ...comment,
        nutritionist: profileMap.get(comment.nutritionist_id) || null
      }));

      return Response.json({ data: dataWithProfiles });
    }

    return Response.json({ data: comments });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new comment (nutritionist only)
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a nutritionist
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "nutritionist") {
      return Response.json(
        { error: "Only nutritionists can add comments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { entry_id: entryId, training_session_id: trainingSessionId, patient_id: patientId, comment } = body;

    if (!comment) {
      return Response.json({ error: "Comment is required" }, { status: 400 });
    }

    if (!entryId && !trainingSessionId) {
      return Response.json(
        { error: "entry_id or training_session_id required" },
        { status: 400 }
      );
    }

    if (entryId && trainingSessionId) {
      return Response.json(
        { error: "Provide only one of entry_id or training_session_id" },
        { status: 400 }
      );
    }

    // Verify the nutritionist is connected to this patient
    if (patientId) {
      const { data: connection } = await supabase
        .from("patient_nutritionist_connections")
        .select("id")
        .eq("patient_id", patientId)
        .eq("nutritionist_id", user.id)
        .single();

      if (!connection) {
        return Response.json(
          { error: "You are not connected to this patient" },
          { status: 403 }
        );
      }
    }

    // Verify the nutritionist is connected to the patient who owns this entry/session
    if (entryId) {
      const { data: entry } = await supabase
        .from("nutrition_entries")
        .select("user_id")
        .eq("id", entryId)
        .single();

      if (!entry) {
        return Response.json({ error: "Entry not found" }, { status: 404 });
      }

      const { data: connection } = await supabase
        .from("patient_nutritionist_connections")
        .select("id")
        .eq("patient_id", entry.user_id)
        .eq("nutritionist_id", user.id)
        .single();

      if (!connection) {
        return Response.json(
          { error: "You are not connected to this patient" },
          { status: 403 }
        );
      }
    }

    if (trainingSessionId) {
      const { data: session } = await supabase
        .from("training_sessions")
        .select("user_id")
        .eq("id", trainingSessionId)
        .single();

      if (!session) {
        return Response.json({ error: "Training session not found" }, { status: 404 });
      }

      const { data: connection } = await supabase
        .from("patient_nutritionist_connections")
        .select("id")
        .eq("patient_id", session.user_id)
        .eq("nutritionist_id", user.id)
        .single();

      if (!connection) {
        return Response.json(
          { error: "You are not connected to this patient" },
          { status: 403 }
        );
      }
    }

    const { data, error } = await supabase
      .from("nutritionist_comments")
      .insert({
        nutritionist_id: user.id,
        entry_id: entryId || null,
        training_session_id: trainingSessionId || null,
        comment,
      })
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data: data[0] }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update a comment
export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, comment } = body;

    if (!id || !comment) {
      return Response.json(
        { error: "id and comment are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("nutritionist_comments")
      .update({ comment, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("nutritionist_id", user.id)
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "Comment not found or not authorized" }, { status: 404 });
    }

    return Response.json({ data: data[0] });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a comment
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("nutritionist_comments")
      .delete()
      .eq("id", id)
      .eq("nutritionist_id", user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
