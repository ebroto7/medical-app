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
    // Using two separate queries to avoid SQL injection via string interpolation
    const supabase = await createClient();

    // Try deleting where current user is patient
    const { error: error1 } = await supabase
      .from("patient_nutritionist_connections")
      .delete()
      .eq('patient_id', user.id)
      .eq('nutritionist_id', otherUserId);

    // Try deleting where current user is nutritionist
    const { error: error2 } = await supabase
      .from("patient_nutritionist_connections")
      .delete()
      .eq('nutritionist_id', user.id)
      .eq('patient_id', otherUserId);

    // At least one should succeed (or both if bidirectional connection exists)
    if (error1 && error2) {
      throw new Error('Failed to disconnect');
    }

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
