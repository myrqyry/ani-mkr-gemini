import { AnimationAssets } from '@/src/services/geminiService';

declare var gifshot: any;

export interface ExportOptions {
  format: 'gif' | 'mp4' | 'webm' | 'png-sequence';
  quality: 'web' | 'print' | 'social';
  size: 'small' | 'medium' | 'large' | 'custom';
  fps: number;
  loop: boolean;
}

const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    if (arr.length < 2) {
        throw new Error('Invalid data URL');
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Could not parse MIME type from data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

const sliceFrames = (
    spriteSheetImage: HTMLImageElement,
    frameCount: number
): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const { naturalWidth, naturalHeight } = spriteSheetImage;
        const gridDim = Math.sqrt(frameCount);
        if (gridDim % 1 !== 0) {
            return reject(new Error('Frame count must be a perfect square.'));
        }
        const frameWidth = Math.floor(naturalWidth / gridDim);
        const frameHeight = Math.floor(naturalHeight / gridDim);

        if (frameWidth <= 0 || frameHeight <= 0) {
            return reject(new Error(`Invalid frame dimensions: ${frameWidth}x${frameHeight}`));
        }

        const INSET_PIXELS = 2;
        const framePromises: Promise<string>[] = [];

        for (let i = 0; i < frameCount; i++) {
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = frameWidth;
            frameCanvas.height = frameHeight;
            const frameCtx = frameCanvas.getContext('2d');
            if (!frameCtx) {
                return reject(new Error('Could not get canvas context for frame slicing.'));
            }

            const x = (i % gridDim) * frameWidth;
            const y = Math.floor(i / gridDim) * frameHeight;
            const sx = x + INSET_PIXELS;
            const sy = y + INSET_PIXELS;
            const sWidth = frameWidth - (INSET_PIXELS * 2);
            const sHeight = frameHeight - (INSET_PIXELS * 2);

            frameCtx.drawImage(spriteSheetImage, sx, sy, sWidth, sHeight, 0, 0, frameWidth, frameHeight);
            framePromises.push(Promise.resolve(frameCanvas.toDataURL()));
        }

        Promise.all(framePromises).then(resolve).catch(reject);
    });
};

const createGIF = async (assets: AnimationAssets, options: ExportOptions, frameCount: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
        try {
            const frames = await sliceFrames(img, frameCount);

            const firstFrame = new Image();
            firstFrame.onload = () => {
                const sizeMultiplier = { 'web': 1, 'print': 2, 'social': 1.5 }[options.quality];
                const gifWidth = firstFrame.naturalWidth * sizeMultiplier;
                const gifHeight = firstFrame.naturalHeight * sizeMultiplier;

                gifshot.createGIF({
                    images: frames,
                    gifWidth: gifWidth,
                    gifHeight: gifHeight,
                    interval: 1 / options.fps,
                    numWorkers: 2,
                    loop: options.loop ? 0 : 1,
                }, (obj: { error: boolean; image: string; errorMsg: string }) => {
                    if (!obj.error) {
                        resolve(dataURLtoBlob(obj.image));
                    } else {
                        reject(new Error(`GIF export failed: ${obj.errorMsg}`));
                    }
                });
            };
            firstFrame.src = frames[0];

        } catch (e) {
            reject(e);
        }
    };
    img.onerror = () => reject(new Error('Failed to load animation spritesheet for export.'));
    img.src = `data:${assets.imageData.mimeType};base64,${assets.imageData.data}`;
  });
};

export const exportAnimation = async (
  assets: AnimationAssets,
  options: ExportOptions,
  frameCount: number
): Promise<Blob> => {
  switch (options.format) {
    case 'gif':
      return await createGIF(assets, options, frameCount);
    case 'mp4':
      throw new Error('MP4 export not yet implemented.');
    case 'png-sequence':
      throw new Error('PNG sequence export not yet implemented.');
    default:
      throw new Error('Unsupported format');
  }
};