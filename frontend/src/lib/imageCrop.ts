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

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

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
