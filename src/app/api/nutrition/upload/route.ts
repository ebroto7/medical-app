import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { fileTypeFromBuffer } from "file-type";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 200);
}

export async function POST(request: Request) {
  try {
    // Apply strict rate limiting (3 uploads per minute)
    const rateLimitResult = rateLimit(request, 'strict');
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Too many upload requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

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

    // Validate file type (declared MIME type)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    // Verify actual file content using magic numbers
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileType = await fileTypeFromBuffer(buffer);

    if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      logger.warn(
        {
          declaredType: file.type,
          actualType: fileType?.mime || "unknown",
          fileName: file.name,
        },
        "File type mismatch detected - possible malicious upload attempt"
      );
      return Response.json(
        { error: "Invalid file format. File content does not match declared type." },
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

    // Upload to storage (buffer already created for magic number verification)
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

    // Save storage path to database (NOT the URL)
    const { data: imageData, error: dbError } = await supabase
      .from("nutrition_images")
      .insert({
        entry_id: entryId,
        storage_path: filePath,
      })
      .select();

    if (dbError) {
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    // Generate signed URL for immediate use by frontend
    const { data: signedUrlData } = await supabase.storage
      .from("nutrition-images")
      .createSignedUrl(filePath, 43200); // 12 hours

    return Response.json({
      data: {
        ...imageData[0],
        image_url: signedUrlData?.signedUrl || "",
      },
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "Image upload failed");
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
