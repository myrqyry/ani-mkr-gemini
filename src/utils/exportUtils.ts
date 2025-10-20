
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Add declaration for the gifshot library loaded from CDN
declare var gifshot: any;

/**
 * Exports an animation as a GIF.
 * @param frames An array of image data URLs representing the frames of the animation.
 * @param frameRate The frame rate of the animation in frames per second.
 * @param width The width of the exported GIF.
 * @param height The height of the exported GIF.
 * @returns A promise that resolves with the data URL of the exported GIF.
 */
export const exportToGif = (
  frames: string[],
  frameRate: number,
  width: number,
  height: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof gifshot === 'undefined' || !gifshot) {
      return reject(new Error("The GIF exporter is still loading. Please wait a moment and try again."));
    }

    gifshot.createGIF(
      {
        images: frames,
        gifWidth: width,
        gifHeight: height,
        interval: 1 / frameRate,
        numWorkers: 2,
      },
      (obj: { error: boolean; image: string; errorMsg: string }) => {
        if (!obj.error) {
          resolve(obj.image);
        } else {
          reject(new Error(`GIF export failed: ${obj.errorMsg}`));
        }
      }
    );
  });
};

/**
 * Exports an animation as an MP4 video (technically WebM, but named as MP4).
 * This is implemented using the MediaRecorder API.
 * @param frames An array of image data URLs representing the frames of the animation.
 * @param frameRate The frame rate of the animation in frames per second.
 * @param width The width of the exported video.
 * @param height The height of the exported video.
 * @returns A promise that resolves with the data URL of the exported video.
 */
export const exportToMp4 = (
  frames: string[],
  frameRate: number,
  width: number,
  height: number
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return reject(new Error('Could not get canvas context'));
    }

    const stream = canvas.captureStream(frameRate);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    };
    recorder.onerror = (e) => reject(new Error('MediaRecorder error: ' + e));

    recorder.start();

    const images = await Promise.all(frames.map(frameSrc => {
        const img = new Image();
        img.src = frameSrc;
        return new Promise<HTMLImageElement>(r => { img.onload = () => r(img) });
    }));

    let frameIndex = 0;
    const intervalId = setInterval(() => {
        if (frameIndex >= images.length) {
            clearInterval(intervalId);
            recorder.stop();
            return;
        }
        ctx.drawImage(images[frameIndex], 0, 0, width, height);
        frameIndex++;
    }, 1000 / frameRate);
  });
};

/**
 * Exports an animation as a WebP image.
 * This is currently not implemented due to browser limitations.
 * @param frames An array of image data URLs representing the frames of the animation.
 * @param frameRate The frame rate of the animation in frames per second.
 * @param width The width of the exported image.
 * @param height The height of the exported image.
 * @returns A promise that resolves with the data URL of the exported WebP image.
 */
export const exportToWebP = (
  frames: string[],
  frameRate: number,
  width: number,
  height: number
): Promise<string> => {
  // Creating animated WebP is not natively supported by browsers.
  // This would require a third-party library to assemble the frames.
  return Promise.reject(new Error('Animated WebP export not yet implemented.'));
};

/**
 * Exports an animation as a sequence of PNG images.
 * @param frames An array of image data URLs representing the frames of the animation.
 * @returns An array of data URLs, each representing a PNG image.
 */
export const exportToPngSequence = (frames: string[]): string[] => {
  return frames;
};
