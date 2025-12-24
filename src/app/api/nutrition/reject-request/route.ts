import { createClient } from "@/utils/supabase/server";
import { requireAuth, requireRole } from "@/lib/auth/api-helpers";
import { AuthenticationError, RoleError } from "@/lib/auth/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ZodError } from "zod";

const rejectRequestSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
});

export async function POST(request: Request) {
  try {
    // 1. Apply rate limiting
    const rateLimitResult = rateLimit(request, 'api');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 2. Require authentication
    const user = await requireAuth();

    // 3. Require patient role
    await requireRole(user.id, ["patient"]);

    // 4. Validate body
    const body = await request.json();
    const { requestId } = rejectRequestSchema.parse(body);

    // 5. Verify request belongs to this patient
    const supabase = await createClient();
    const { data: requestData } = await supabase
      .from("nutritionist_requests")
      .select("patient_id")
      .eq("id", requestId)
      .single();

    if (!requestData || requestData.patient_id !== user.id) {
      return Response.json({ error: "Request not found or unauthorized" }, { status: 403 });
    }

    // 6. Reject request
    await supabase
      .from("nutritionist_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    return Response.json({ success: true, message: "Rejected" }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof RoleError) {
      return Response.json({ error: "Access denied: patient role required" }, { status: 403 });
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
