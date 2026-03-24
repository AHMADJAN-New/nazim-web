/**
 * Creates an Image from a URL (blob or data URL). Used for canvas-based cropping.
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crops an image to the given pixel area and returns a Blob (JPEG).
 * Used with react-easy-crop's onCropComplete croppedAreaPixels.
 */
export async function getCroppedImg(
  imageUrl: string,
  pixelCrop: Area,
  quality: number = 0.9
): Promise<Blob> {
  const image = await createImage(imageUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2d context not available');
  }

  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  // White base for JPEG export (letterboxing, zoom-out crop, or transparency)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const cropLeft = pixelCrop.x;
  const cropTop = pixelCrop.y;
  const cropRight = pixelCrop.x + pixelCrop.width;
  const cropBottom = pixelCrop.y + pixelCrop.height;

  // Intersect crop rect with source image (needed when zoom < 1 + restrictPosition off)
  const srcLeft = Math.max(0, cropLeft);
  const srcTop = Math.max(0, cropTop);
  const srcRight = Math.min(iw, cropRight);
  const srcBottom = Math.min(ih, cropBottom);
  const srcW = srcRight - srcLeft;
  const srcH = srcBottom - srcTop;

  if (srcW > 0 && srcH > 0) {
    const destX = srcLeft - cropLeft;
    const destY = srcTop - cropTop;
    ctx.drawImage(image, srcLeft, srcTop, srcW, srcH, destX, destY, srcW, srcH);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}
