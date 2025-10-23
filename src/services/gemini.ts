/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Frame } from '../types';

/**
 * The assets for an animation.
 * @interface AnimationAssets
 * @property {{ data: string, mimeType: string }} imageData - The image data for the animation.
 * @property {Frame[]} frames - The frames of the animation.
 * @property {number} frameDuration - The duration of each frame in ms.
 */
export interface AnimationAssets {
  imageData: {
    data: string;
    mimeType: string;
  };
  frames: Frame[];
  frameDuration: number;
}

/**
 * A bounding box for an object in an image.
 * @interface BoundingBox
 * @property {[number, number, number, number]} box_2d - The bounding box in the format [ymin, xmin, ymax, xmax].
 * @property {string} label - The label for the object.
 */
export interface BoundingBox {
  box_2d: [number, number, number, number]; // ymin, xmin, ymax, xmax
  label: string;
}

/**
 * Generates animation assets.
 * @param {string | null} base64UserImage - The base64-encoded user image.
 * @param {string | null} mimeType - The MIME type of the user image.
 * @param {string} imagePrompt - The prompt for the image.
 * @param {(message: string) => void} onProgress - Function to call with progress messages.
 * @param {AbortSignal} [signal] - An optional AbortSignal to cancel the request.
 * @returns {Promise<AnimationAssets | null>} A promise that resolves to the animation assets.
 */
export const generateAnimationAssets = async (
  base64UserImage: string | null,
  mimeType: string | null,
  imagePrompt: string,
  onProgress: (message: string) => void,
  signal?: AbortSignal,
  fileUri?: string,
): Promise<AnimationAssets | null> => {
  try {
    if (signal?.aborted) {
      throw new Error('Animation generation aborted.');
    }

    const response = await fetch('/api/generate-animation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: base64UserImage,
        prompt: imagePrompt,
        mimeType: mimeType,
        fileUri: fileUri,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Could not read response body.');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += decoder.decode(value, { stream: true });
    }

    // The streamed response is a series of JSON objects. We need to parse them.
    const jsonChunks = fullResponse.replace(/}{/g, '},{').split('},{');
    const parsedChunks = jsonChunks.map((chunk, index) => {
      if (index > 0) chunk = '{' + chunk;
      if (index < jsonChunks.length - 1) chunk = chunk + '}';
      return JSON.parse(chunk);
    });

    // Now, we need to find the image data in the parsed chunks
    const imagePart = parsedChunks
      .flatMap((c) => c.candidates?.[0]?.content?.parts ?? [])
      .find((p) => p.inlineData);
    if (!imagePart?.inlineData?.data) {
      throw new Error('No image part found in response from proxy.');
    }
    const imageData = {
      data: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    };

    let frameDuration = 120; // Default fallback value
    const textPart = parsedChunks
      .flatMap((c) => c.candidates?.[0]?.content?.parts ?? [])
      .find((p) => p.text);
    if (textPart?.text) {
      try {
        const jsonStringMatch = textPart.text.match(/{.*}/s);
        if (jsonStringMatch) {
          const parsed = JSON.parse(jsonStringMatch[0]);
          if (parsed.frameDuration && typeof parsed.frameDuration === 'number') {
            frameDuration = parsed.frameDuration;
          }
        }
      } catch (e) {
        console.warn(
          'Could not parse frame duration from model response. Using default.',
          e,
        );
      }
    }

    return { imageData, frames: [], frameDuration };
  } catch (error) {
    console.error('Error during asset generation:', error);
    throw new Error(
      `Failed to process image. ${
        error instanceof Error ? error.message : ''
      }`,
    );
  }
};

/**
 * Detects objects in an animation.
 * @param {string} base64SpriteSheet - The base64-encoded sprite sheet.
 * @param {string} mimeType - The MIME type of the sprite sheet.
 * @param {string} detectionPrompt - The prompt for object detection.
 * @returns {Promise<BoundingBox[]>} A promise that resolves to an array of bounding boxes.
 */
export const detectObjectsInAnimation = async (
  base64SpriteSheet: string,
  mimeType: string,
  detectionPrompt: string,
): Promise<BoundingBox[]> => {
  const response = await fetch('/api/detect-objects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64SpriteSheet,
      mimeType,
      detectionPrompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  const jsonText = result.candidates[0].content.parts[0].text;
  const cleanedJsonText = jsonText.replace(/^```json\s*|```\s*$/g, '');
  return JSON.parse(cleanedJsonText);
};

/**
 * Post-processes an animation.
 * @param {string} base64SpriteSheet - The base64-encoded sprite sheet.
 * @param {string} mimeType - The MIME type of the sprite sheet.
 * @param {string} postProcessPrompt - The prompt for post-processing.
 * @param {(message: string) => void} onProgress - Function to call with progress messages.
 * @param {string} [base64StyleImage] - The base64-encoded style image.
 * @param {string} [styleMimeType] - The MIME type of the style image.
 * @param {number} [temperature] - The temperature for the model.
 * @returns {Promise<AnimationAssets | null>} A promise that resolves to the post-processed animation assets.
 */
export const postProcessAnimation = async (
  base64SpriteSheet: string,
  mimeType: string,
  postProcessPrompt: string,
  onProgress: (message: string) => void,
  base64StyleImage?: string | null,
  styleMimeType?: string | null,
  temperature?: number,
): Promise<AnimationAssets | null> => {
  const response = await fetch('/api/post-process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64SpriteSheet,
      mimeType,
      postProcessPrompt,
      base64StyleImage,
      styleMimeType,
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  const imagePart = result.candidates[0].content.parts.find((p: any) => p.inlineData);
  const imageData = { data: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
  let frameDuration = 120;
  const textPart = result.candidates[0].content.parts.find((p: any) => p.text);
  if (textPart?.text) {
      try {
          const jsonStringMatch = textPart.text.match(/{.*}/s);
          if (jsonStringMatch) {
              const parsed = JSON.parse(jsonStringMatch[0]);
              if (parsed.frameDuration && typeof parsed.frameDuration === 'number') {
                  frameDuration = parsed.frameDuration;
              }
          }
      } catch (e) {
          console.warn("Could not parse frame duration from model response. Using default.", e);
      }
  }

  return { imageData, frames: [], frameDuration };
};

/**
 * Analyzes an animation to generate a prompt.
 * @param {string} animationDataUrl - The data URL of the animation.
 * @param {(message: string) => void} onProgress - Function to call with progress messages.
 * @returns {Promise<string>} A promise that resolves to the generated prompt.
 */
export const analyzeAnimation = async (
  animationDataUrl: string,
  onProgress: (message: string) => void,
): Promise<string> => {
  // This function requires frame extraction, which is a browser-specific API.
  // It's better to keep this on the client-side.
  return '';
};

export const uploadFile = async (
  file: string,
  mimeType: string,
): Promise<any> => {
  const response = await fetch('/api/upload-file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file,
      mimeType,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
