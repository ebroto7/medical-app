import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 200);
}

export async function POST(request: Request) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const entryId = formData.get("entryId") as string;

    if (!file || !entryId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File size exceeds maximum of 5MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    // Verify user owns the entry
    const { data: entryData } = await supabase
      .from("nutrition_entries")
      .select("user_id")
      .eq("id", entryId)
      .single();

    if (!entryData) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entryData.user_id !== user.id) {
      return Response.json(
        { error: "You do not have permission to upload to this entry" },
        { status: 403 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const sanitizedName = sanitizeFilename(file.name);
    const filename = `${timestamp}-${randomStr}-${sanitizedName}`;
    const filePath = `${user.id}/${entryId}/${filename}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const { error: storageError } = await supabase.storage
      .from("nutrition-images")
      .upload(filePath, buffer, {
        contentType: file.type,
      });

    if (storageError) {
      return Response.json(
        { error: storageError.message },
        { status: 500 }
      );
    }

    // Get signed URL (valid for 1 hour)
    const { data: urlData, error: signedUrlError } = await supabase.storage
      .from("nutrition-images")
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      return Response.json(
        { error: signedUrlError.message },
        { status: 500 }
      );
    }

    // Save image record to database
    const { data: imageData, error: dbError } = await supabase
      .from("nutrition_images")
      .insert({
        entry_id: entryId,
        image_url: urlData.signedUrl,
      })
      .select();

    if (dbError) {
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    return Response.json({ data: imageData[0] }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
