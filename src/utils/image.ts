export type ResizeOptions = {
  maxSize: number;            // e.g., 1024
  squareCrop?: boolean;       // default true for sprites
  mime?: 'image/jpeg' | 'image/webp'; // default 'image/jpeg'
  quality?: number;                   // default 0.85
};

export async function resizeImage(
  dataUrl: string,
  {
    maxSize,
    squareCrop = true,
    mime = 'image/jpeg',
    quality = 0.85,
  }: ResizeOptions,
): Promise<{ dataUrl: string; mime: string }> {
  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  if (!srcW || !srcH) {
    throw new Error('Image has invalid dimensions.');
  }

  let sx = 0, sy = 0, sw = srcW, sh = srcH;

  if (squareCrop) {
    if (srcW > srcH) {
      sw = srcH;
      sx = Math.floor((srcW - srcH) / 2);
    } else if (srcH > srcW) {
      sh = srcW;
      sy = Math.floor((srcH - srcW) / 2);
    }
  }

  const targetW = maxSize;
  const targetH = maxSize;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context.');

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  // Note: switching to WEBP may yield smaller assets for graphics/flat colors
  const out = canvas.toDataURL(mime, quality);
  return { dataUrl: out, mime };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Important for cross-origin data URLs or fetched blobs with tainted canvas risk
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.src = src;
  });
}