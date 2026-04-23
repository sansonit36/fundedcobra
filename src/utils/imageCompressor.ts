/**
 * Client-side image compression using Canvas API.
 * No external dependencies needed.
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_PX = 300; // Max width/height in pixels
const JPEG_QUALITY = 0.75; // Compression quality (0-1)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB input limit

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

/**
 * Validates that the file is an allowed image type
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please select an image file (JPEG, PNG, WebP, or GIF)';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Image is too large. Maximum size is 5MB.';
  }
  return null; // Valid
}

/**
 * Compresses an image file to a max dimension and JPEG format.
 * Returns a compressed Blob ready for upload.
 */
export function compressImage(file: File): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const validation = validateImageFile(file);
    if (validation) {
      reject(new Error(validation));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));

      img.onload = () => {
        try {
          // Calculate new dimensions (maintain aspect ratio)
          let { width, height } = img;
          if (width > MAX_SIZE_PX || height > MAX_SIZE_PX) {
            if (width > height) {
              height = Math.round((height / width) * MAX_SIZE_PX);
              width = MAX_SIZE_PX;
            } else {
              width = Math.round((width / height) * MAX_SIZE_PX);
              height = MAX_SIZE_PX;
            }
          }

          // Draw to canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }

          // Fill with transparent background, then draw
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Export as JPEG (best compression for photos)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              resolve({
                blob,
                width,
                height,
                originalSize: file.size,
                compressedSize: blob.size
              });
            },
            'image/jpeg',
            JPEG_QUALITY
          );
        } catch (err) {
          reject(new Error('Failed to process image'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
