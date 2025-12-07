import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const SIGNED_URL_EXPIRY = 43200; // 12 hours in seconds

type NutritionImage = Database["public"]["Tables"]["nutrition_images"]["Row"];

interface ImageWithSignedUrl extends Omit<NutritionImage, "storage_path"> {
  image_url: string;
  storage_path: string;
}

interface EntryWithImages {
  nutrition_images?: NutritionImage[];
  [key: string]: unknown;
}

/**
 * Generates signed URLs for nutrition images in entries
 * Transforms storage_path to image_url for frontend consumption
 */
export async function addSignedUrlsToEntries<T extends EntryWithImages>(
  supabase: SupabaseClient<Database>,
  entries: T[]
): Promise<(T & { nutrition_images?: ImageWithSignedUrl[] })[]> {
  // Collect all storage paths that need signed URLs
  const pathsToSign: { entryIndex: number; imageIndex: number; path: string }[] = [];

  entries.forEach((entry, entryIndex) => {
    if (entry.nutrition_images) {
      entry.nutrition_images.forEach((img, imageIndex) => {
        if (img.storage_path) {
          pathsToSign.push({ entryIndex, imageIndex, path: img.storage_path });
        }
      });
    }
  });

  if (pathsToSign.length === 0) {
    return entries as (T & { nutrition_images?: ImageWithSignedUrl[] })[];
  }

  // Generate signed URLs in batch (Supabase supports this)
  const { data: signedUrls, error } = await supabase.storage
    .from("nutrition-images")
    .createSignedUrls(
      pathsToSign.map((p) => p.path),
      SIGNED_URL_EXPIRY
    );

  if (error || !signedUrls) {
    console.error("Error generating signed URLs:", error);
    // Return entries without image_url if signing fails
    return entries as (T & { nutrition_images?: ImageWithSignedUrl[] })[];
  }

  // Map signed URLs back to entries
  const result = entries.map((entry) => ({
    ...entry,
    nutrition_images: entry.nutrition_images?.map((img) => ({
      ...img,
      image_url: "", // Will be filled below
    })),
  }));

  signedUrls.forEach((urlData, index) => {
    const { entryIndex, imageIndex } = pathsToSign[index];
    if (result[entryIndex].nutrition_images?.[imageIndex]) {
      result[entryIndex].nutrition_images![imageIndex].image_url =
        urlData.signedUrl || "";
    }
  });

  return result as (T & { nutrition_images?: ImageWithSignedUrl[] })[];
}

/**
 * Generates a single signed URL for an image
 */
export async function getSignedUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("nutrition-images")
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}
