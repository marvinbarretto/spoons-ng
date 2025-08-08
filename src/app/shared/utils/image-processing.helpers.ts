/**
 * @fileoverview Image Processing Helper Functions
 *
 * Small, focused utilities for common image processing operations.
 * These helpers make image operations more testable and reusable.
 */

/**
 * Convert canvas to blob with error handling
 * Wraps the callback-based toBlob API with a Promise
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string = 'image/jpeg',
  quality: number = 0.95
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`Failed to create blob with type ${mimeType}`));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Load image from blob with error handling
 * Returns a promise that resolves when image is fully loaded
 */
export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src); // Clean up immediately
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src); // Clean up on error too
      reject(new Error('Failed to load image from blob'));
    };

    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Create a square crop of an image on canvas
 * Takes the center square portion and resizes to target size
 */
export function drawSquareCrop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetSize: number
): void {
  // Calculate center square crop dimensions
  const sourceSize = Math.min(img.width, img.height);
  const sx = (img.width - sourceSize) / 2;
  const sy = (img.height - sourceSize) / 2;

  // Draw the center square crop, scaled to target size
  ctx.drawImage(
    img,
    sx,
    sy,
    sourceSize,
    sourceSize, // Source rectangle (center square)
    0,
    0,
    targetSize,
    targetSize // Destination rectangle (target size)
  );
}

/**
 * Resize image blob to square with specified dimensions
 * Combines image loading, canvas operations, and blob creation
 */
export async function resizeImageToSquare(
  inputBlob: Blob,
  targetSize: number,
  mimeType: string = 'image/jpeg',
  quality: number = 0.95
): Promise<Blob> {
  // Load the image
  const img = await loadImageFromBlob(inputBlob);

  // Create canvas for resizing
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = targetSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }

  // Draw square crop
  drawSquareCrop(ctx, img, targetSize);

  // Convert to blob
  return canvasToBlob(canvas, mimeType, quality);
}
