/**
 * Client-side image compression and thumbnail generation
 * Runs directly on older smartphones and low-end Android devices
 * without remote servers or heavy libraries.
 */

export interface CompressedImageResult {
  dataUrl: string;
  thumbnailUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 900,
  quality = 0.78
): Promise<CompressedImageResult> {
  const originalSizeBytes = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        try {
          // Calculate proportional scaled dimensions
          let targetWidth = img.width;
          let targetHeight = img.height;

          if (targetWidth > maxWidth) {
            targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
            targetWidth = maxWidth;
          }
          if (targetHeight > maxHeight) {
            targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
            targetHeight = maxHeight;
          }

          // Render main compressed image
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas 2D context not available');
          }

          // Smooth rendering for quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Prefer webp with fallback to jpeg
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // Generate fast small thumbnail (240px width)
          const thumbWidth = 240;
          const thumbHeight = Math.round((img.height * thumbWidth) / img.width);
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = thumbWidth;
          thumbCanvas.height = thumbHeight;
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCtx.imageSmoothingEnabled = true;
            thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
          }
          const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.6);

          // Calculate approximate byte size from base64
          const compressedSizeBytes = Math.round((dataUrl.length * 3) / 4);

          resolve({
            dataUrl,
            thumbnailUrl,
            originalSizeBytes,
            compressedSizeBytes,
            width: targetWidth,
            height: targetHeight,
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
