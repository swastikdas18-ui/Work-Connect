/**
 * Client-Side Zero-Cost Image Compressor
 * Resizes user-uploaded images using HTML5 Canvas API maintaining aspect ratio,
 * re-encodes to image/webp with 0.8 quality, and falls back gracefully.
 */

export interface CompressionOptions {
  maxDimension?: number; // Maximum width or height in px (default: 1400)
  quality?: number; // Quality from 0.0 to 1.0 (default: 0.8)
}

export interface CompressionResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  originalSize: number; // in bytes
  compressedSize: number; // in bytes
  reductionPercentage: number; // e.g., 65 (%)
}

/**
 * Converts a Blob or File to a Base64 Data URL
 */
export const fileToDataUrl = (file: Blob | File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Format bytes into human readable string (KB / MB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Compresses an image file in the browser before storage upload
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { maxDimension = 1400, quality = 0.8 } = options;

  // If file is not an image (e.g. svg, gif, or non-image), return original
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    const previewUrl = URL.createObjectURL(file);
    return {
      file,
      blob: file,
      previewUrl,
      originalSize: file.size,
      compressedSize: file.size,
      reductionPercentage: 0,
    };
  }

  return new Promise((resolve) => {
    const fallbackToOriginal = (err?: unknown) => {
      if (err) {
        console.warn('[imageCompressor] Compression failed, falling back to original file:', err);
      }
      const previewUrl = URL.createObjectURL(file);
      resolve({
        file,
        blob: file,
        previewUrl,
        originalSize: file.size,
        compressedSize: file.size,
        reductionPercentage: 0,
      });
    };

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          fallbackToOriginal('Image dimensions unavailable');
          return;
        }

        // Calculate aspect ratio & bounded dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fallbackToOriginal('Canvas 2D context unavailable');
          return;
        }

        // Apply high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              fallbackToOriginal('Canvas toBlob returned null');
              return;
            }

            // Create new File with .webp extension
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFileName = `${originalName}.webp`;
            const compressedFile = new File([blob], compressedFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(blob);
            const reduction = Math.max(
              0,
              Math.round(((file.size - blob.size) / file.size) * 100)
            );

            resolve({
              file: compressedFile,
              blob,
              previewUrl,
              originalSize: file.size,
              compressedSize: blob.size,
              reductionPercentage: reduction,
            });
          },
          'image/webp',
          quality
        );
      } catch (err) {
        fallbackToOriginal(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      fallbackToOriginal(err);
    };

    img.src = objectUrl;
  });
}
