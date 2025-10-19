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
        frameDuration: 1 / frameRate,
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
 * Exports an animation as an MP4 video.
 * This will be implemented using the MediaRecorder API.
 * @param frames An array of image data URLs representing the frames of the animation.
 * @param frameRate The frame rate of the animation in frames per second.
 * @param width The width of the exported video.
 * @param height The height of the exported video.
 * @returns A promise that resolves with the data URL of the exported MP4 video.
 */
export const exportToMp4 = (
  frames: string[],
  frameRate: number,
  width: number,
  height: number
): Promise<string> => {
  // To be implemented
  return Promise.reject(new Error('MP4 export not yet implemented.'));
};

/**
 * Exports an animation as a WebP image.
 * This will be implemented using the Canvas API.
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
  // To be implemented
  return Promise.reject(new Error('WebP export not yet implemented.'));
};

/**
 * Exports an animation as a sequence of PNG images.
 * @param frames An array of image data URLs representing the frames of the animation.
 * @returns An array of data URLs, each representing a PNG image.
 */
export const exportToPngSequence = (frames: string[]): string[] => {
  // To be implemented
  return [];
};
