/**
 * Options for resizing an image.
 * @typedef {object} ResizeOptions
 * @property {number} maxSize - The maximum size of the image.
 * @property {boolean} [squareCrop] - Whether to crop the image to a square.
 * @property {'image/jpeg' | 'image/webp'} [mime] - The MIME type of the image.
 * @property {number} [quality] - The quality of the image.
 */
export type ResizeOptions = {
  maxSize: number;
  squareCrop?: boolean;
  mime?: 'image/jpeg' | 'image/webp';
  quality?: number;
};

const MAX_CACHE_SIZE = 50;
const imageCache = new Map<string, { dataUrl: string; mime: string; timestamp: number }>();

/**
 * Cleans up the image cache.
 */
const cleanupCache = () => {
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const entries = Array.from(imageCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2)).forEach(([key]) => {
      imageCache.delete(key);
    });
  }
};

/**
 * Resizes an image.
 * @param {string} dataUrl - The data URL of the image.
 * @param {ResizeOptions} options - The options for resizing the image.
 * @returns {Promise<{ dataUrl: string; mime: string }>} A promise that resolves to the resized image.
 */
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
  const result = { dataUrl: out, mime, timestamp: Date.now() };
  cleanupCache();
  imageCache.set(cacheKey, result);
  return result;
}

/**
 * Loads an image from a source.
 * @param {string} src - The source of the image.
 * @returns {Promise<HTMLImageElement>} A promise that resolves to the loaded image.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.src = src;
  });
}