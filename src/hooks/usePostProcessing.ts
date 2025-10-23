import { useCallback } from 'react';
import { AppStatus, ImageState, AnimationAssets } from '../types/types';
import { postProcessAnimation } from '../services/gemini';
import { buildPostProcessPrompt } from '../../prompts';
import { resizeImage } from '../utils/image';
import { STYLE_IMAGE_MAX_SIZE } from '../constants/app';

/**
 * A hook for post-processing an animation.
 * @param {AnimationAssets | null} animationAssets - The assets for the animation.
 * @param {ImageState} imageState - The state of the image.
 * @param {number} frameCount - The number of frames in the animation.
 * @param {number} styleIntensity - The intensity of the style.
 * @param {number} postProcessStrength - The strength of the post-processing.
 * @param {React.Dispatch<React.SetStateAction<AppStatus>>} setAppState - Function to set the app state.
 * @param {React.Dispatch<React.SetStateAction<string>>} setLoadingMessage - Function to set the loading message.
 * @param {React.Dispatch<React.SetStateAction<string | null>>} setError - Function to set the error.
 * @param {React.Dispatch<React.SetStateAction<AnimationAssets | null>>} setAnimationAssets - Function to set the animation assets.
 * @returns {{ handlePostProcess: (effect: string, editPrompt?: string) => Promise<void> }} - An object with a function to post-process the animation.
 */
export const usePostProcessing = (
  animationAssets: AnimationAssets | null,
  imageState: ImageState,
  frameCount: number,
  styleIntensity: number,
  postProcessStrength: number,
  setAppState: React.Dispatch<React.SetStateAction<AppStatus>>,
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setAnimationAssets: React.Dispatch<React.SetStateAction<AnimationAssets | null>>,
) => {
  const handlePostProcess = useCallback(async (effect: string, editPrompt?: string) => {
    if (!animationAssets) {
      setError("Cannot apply post-processing: no animation loaded.");
      return;
    }

    setAppState(AppStatus.Processing);
    setLoadingMessage(`Applying ${effect} effect...`);
    setError(null);

    try {
      const { data: base64SpriteSheet, mimeType } = animationAssets.imageData;

      let base64PostStyleImage: string | null = null;
      let stylePostMimeType: string | null = null;

      if (effect === 'apply-style') {
        if (!imageState.style) {
          throw new Error("Cannot apply style: no style image was provided.");
        }
        setLoadingMessage('Optimizing style image...');
        const { dataUrl: resizedStyleDataUrl, mime: resizedStyleMime } = await resizeImage(imageState.style, { maxSize: STYLE_IMAGE_MAX_SIZE });
        const styleImageParts = resizedStyleDataUrl.match(/^data:.*?;base64,(.*)$/);
        if (!styleImageParts || styleImageParts.length !== 2) {
          throw new Error("Could not process the style image data for post-processing.");
        }
        stylePostMimeType = resizedStyleMime;
        base64PostStyleImage = styleImageParts[1];
      }

      const postProcessPrompt = buildPostProcessPrompt(
        effect,
        frameCount,
        animationAssets.frameDuration,
        {
          styleIntensity: effect === 'apply-style' ? styleIntensity : undefined,
          editPrompt: effect === 'magic-edit' ? editPrompt : undefined,
        }
      );

      const newAssets = await postProcessAnimation(
        base64SpriteSheet,
        mimeType,
        postProcessPrompt,
        (message: string) => setLoadingMessage(message),
        base64PostStyleImage,
        stylePostMimeType,
        postProcessStrength
      );

      if (!newAssets || !newAssets.imageData.data) {
        throw new Error(`Post-processing failed. Did not receive a valid image.`);
      }

      setAnimationAssets(newAssets);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown post-processing error occurred.';
      console.error(err);
      setError(errorMessage);
    } finally {
      setAppState(AppStatus.Animating);
    }
  }, [animationAssets, frameCount, imageState.style, styleIntensity, postProcessStrength, setAppState, setLoadingMessage, setError, setAnimationAssets]);

  return { handlePostProcess };
};