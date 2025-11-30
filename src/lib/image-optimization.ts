import imageCompression from 'browser-image-compression';

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  const options = {
    maxSizeMB: 0.5, // Maximum output size: 500KB
    maxWidthOrHeight: 1920, // Maximum dimensions
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.8, // 80% quality
  };

  try {
    const compressedFile = await imageCompression(file, options);

    const compressionRatio = (
      ((originalSize - compressedFile.size) / originalSize) * 100
    ).toFixed(1);

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: parseFloat(compressionRatio),
    };
  } catch (error) {
    console.error('Image compression failed:', error);

    // Fallback: return original file if compression fails
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
    };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
