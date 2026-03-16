/**
 * Client-side image compression utility
 * Uses browser Canvas API - no backend needed
 */

export interface CompressionOptions {
  maxWidth?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    quality = 0.8,
    format = 'webp',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      let { width, height } = img;
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }

          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const compressed = new File([blob], `${nameWithoutExt}.${format}`, {
            type: `image/${format}`,
            lastModified: Date.now(),
          });

          resolve(compressed);
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
