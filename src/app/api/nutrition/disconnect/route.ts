import { createClient } from "@/utils/supabase/server";
import { requireAuth } from "@/lib/auth/api-helpers";
import { AuthenticationError } from "@/lib/auth/errors";
import { z } from "zod";
import { ZodError } from "zod";

const disconnectSchema = z.object({
  otherUserId: z.string().uuid("Invalid user ID"),
});

export async function DELETE(request: Request) {
  try {
    // 1. Require authentication
    const user = await requireAuth();

    // 2. Validate body
    const body = await request.json();
    const { otherUserId } = disconnectSchema.parse(body);

    // 3. Delete connection (works for both patient and nutritionist)
    const supabase = await createClient();
    await supabase
      .from("patient_nutritionist_connections")
      .delete()
      .or(`and(patient_id.eq.${user.id},nutritionist_id.eq.${otherUserId}),and(nutritionist_id.eq.${user.id},patient_id.eq.${otherUserId})`);

    return Response.json({ success: true, message: "Disconnected" }, { status: 200 });
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
