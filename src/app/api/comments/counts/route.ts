import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";

// GET - Fetch comment counts for multiple entries/sessions
export async function GET(request: Request) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const entryIds = searchParams.get("entry_ids")?.split(",").filter(Boolean) || [];
    const sessionIds = searchParams.get("session_ids")?.split(",").filter(Boolean) || [];

    if (entryIds.length === 0 && sessionIds.length === 0) {
      return Response.json({ entries: {}, sessions: {} });
    }

    const supabase = await createClient();
    const result: { entries: Record<string, number>; sessions: Record<string, number> } = {
      entries: {},
      sessions: {},
    };

    // 3. Get comment counts for entries
    if (entryIds.length > 0) {
      const { data: entryCounts } = await supabase
        .from("nutritionist_comments")
        .select("entry_id")
        .in("entry_id", entryIds)
        .not("entry_id", "is", null);

      // Count comments per entry
      if (entryCounts) {
        for (const row of entryCounts) {
          if (row.entry_id) {
            result.entries[row.entry_id] = (result.entries[row.entry_id] || 0) + 1;
          }
        }
      }
    }

    // 4. Get comment counts for training sessions
    if (sessionIds.length > 0) {
      const { data: sessionCounts } = await supabase
        .from("nutritionist_comments")
        .select("training_session_id")
        .in("training_session_id", sessionIds)
        .not("training_session_id", "is", null);

      // Count comments per session
      if (sessionCounts) {
        for (const row of sessionCounts) {
          if (row.training_session_id) {
            result.sessions[row.training_session_id] = (result.sessions[row.training_session_id] || 0) + 1;
          }
        }
      }
    }

    return Response.json(result);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
