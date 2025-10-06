export type ResizeOptions = {
  maxSize: number;
  squareCrop?: boolean;
  mime?: 'image/jpeg' | 'image/webp';
  quality?: number;
};

const imageCache = new Map<string, { dataUrl: string; mime: string }>();

export async function resizeImage(
  dataUrl: string,
  options: ResizeOptions,
): Promise<{ dataUrl: string; mime: string }> {
  const {
    maxSize,
    squareCrop = true,
    mime = 'image/jpeg',
    quality = 0.85,
  } = options;
  const cacheKey = `${dataUrl}-${maxSize}-${squareCrop}-${mime}-${quality}`;

  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  if (!srcW || !srcH) {
    throw new Error('Image has invalid dimensions.');
  }

  let sx = 0,
    sy = 0,
    sw = srcW,
    sh = srcH;

  let targetW: number, targetH: number;

  if (squareCrop) {
    if (srcW > srcH) {
      sw = srcH;
      sx = Math.floor((srcW - srcH) / 2);
    } else if (srcH > srcW) {
      sh = srcW;
      sy = Math.floor((srcH - srcW) / 2);
    }
    targetW = maxSize;
    targetH = maxSize;
  } else {
    // If not square cropping, calculate new dimensions to preserve aspect ratio
    if (srcW > srcH) {
      targetW = maxSize;
      targetH = Math.round(maxSize * (srcH / srcW));
    } else {
      targetH = maxSize;
      targetW = Math.round(maxSize * (srcW / srcH));
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context.');

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const out = canvas.toDataURL(mime, quality);
  const result = { dataUrl: out, mime };
  imageCache.set(cacheKey, result);
  return result;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.src = src;
  });
}