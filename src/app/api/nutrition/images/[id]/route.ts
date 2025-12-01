import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get image to verify ownership via the entry
    const { data: image } = await supabase
      .from("nutrition_images")
      .select(`
        id,
        image_url,
        nutrition_entries!inner(user_id)
      `)
      .eq("id", id)
      .single();

    if (!image) {
      return Response.json({ error: "Image not found" }, { status: 404 });
    }

    // Check ownership through the entry
    const entry = image.nutrition_entries as unknown as { user_id: string };
    if (entry.user_id !== user.id) {
      return Response.json(
        { error: "You do not have permission to delete this image" },
        { status: 403 }
      );
    }

    // Extract storage path from URL and delete from storage
    // URL format: .../nutrition-images/userId/entryId/filename?...
    try {
      const url = new URL(image.image_url);
      const pathMatch = url.pathname.match(/nutrition-images\/(.+)/);
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1]);
        await supabase.storage.from("nutrition-images").remove([storagePath]);
      }
    } catch {
      // Continue even if storage deletion fails
      console.error("Failed to delete from storage");
    }

    // Delete from database
    const { error } = await supabase
      .from("nutrition_images")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ message: "Image deleted" });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
