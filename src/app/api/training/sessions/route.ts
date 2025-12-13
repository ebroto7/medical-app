import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { createTrainingSessionSchema } from "@/lib/validations/training";
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

    // 3. Query sessions
    const supabase = await createClient();
    let query = supabase
      .from("training_sessions")
      .select("*")
      .eq("user_id", user.id);

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

    // 2. Parse and validate body with Zod
    const body = await request.json();
    const validatedData = createTrainingSessionSchema.parse(body);

    // 3. Insert session
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        user_id: user.id,
        date: validatedData.date,
        time: validatedData.time,
        type: validatedData.type,
        duration_minutes: validatedData.durationMinutes || null,
        description: validatedData.description || null,
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

export async function DELETE(request: Request) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Get session ID
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing session id" }, { status: 400 });
    }

    // 3. Delete session (only own sessions via user_id check)
    const supabase = await createClient();
    const { error } = await supabase
      .from("training_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
