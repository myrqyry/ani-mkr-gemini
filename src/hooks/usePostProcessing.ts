import { useCallback } from 'react';
import { AppStatus, AnimationAssets, ImageState, AppError } from '@types/types';
import { postProcessAnimation } from '@services/gemini';
import { buildPostProcessPrompt } from '@services/prompts';
import { resizeImage } from '@utils/image';
import { STYLE_IMAGE_MAX_SIZE } from '@constants/app';

const createAppError = (type: AppError['type'], message: string, originalError?: Error): AppError => ({
  type,
  message,
  retryable: ['network', 'api'].includes(type),
  originalError,
});

/**
 * A hook for post-processing an animation.
 * @param {AnimationAssets | null} animationAssets - The assets of the animation.
 * @param {ImageState} imageState - The state of the image.
 * @param {number} frameCount - The number of frames in the animation.
 * @param {number} styleIntensity - The intensity of the style.
 * @param {number} postProcessStrength - The strength of the post-processing.
 * @param {React.Dispatch<React.SetStateAction<AppStatus>>} setAppState - Function to set the app state.
 * @param {React.Dispatch<React.SetStateAction<string>>} setLoadingMessage - Function to set the loading message.
 * @param {React.Dispatch<React.SetStateAction<AppError | null>>} setError - Function to set the error.
 * @param {React.Dispatch<React.SetStateAction<AnimationAssets | null>>} setAnimationAssets - Function to set the animation assets.
 * @returns {{ handlePostProcess: () => Promise<void> }} - An object with a function to post-process the animation.
 */
export const usePostProcessing = (
  animationAssets: AnimationAssets | null,
  imageState: ImageState,
  frameCount: number,
  styleIntensity: number,
  postProcessStrength: number,
  setAppState: (payload: AppStatus) => void,
  setLoadingMessage: (payload: string) => void,
  setError: (payload: AppError | null) => void,
  setAnimationAssets: (payload: AnimationAssets | null) => void,
) => {
  const handlePostProcess = useCallback(async () => {
    if (!animationAssets) {
      return;
    }
    try {
      setLoadingMessage('Post-processing...');
      setAppState(AppStatus.Processing);
      setError(null);

      const postProcessPrompt = buildPostProcessPrompt(
        'apply-style',
        frameCount,
        animationAssets.frameDuration,
        { styleIntensity, editPrompt: '' }
      );

      let styleImageBase64: string | null = null;
      let styleImageMimeType: string | null = null;

      if (imageState.style) {
        setLoadingMessage('Optimizing style image...');
        const { dataUrl: resizedDataUrl, mime: resizedMime } = await resizeImage(
          imageState.style,
          { maxSize: STYLE_IMAGE_MAX_SIZE }
        );
        styleImageMimeType = resizedMime;
        styleImageBase64 = resizedDataUrl.split(',')[1];
      }

      const processedAssets = await postProcessAnimation(
        animationAssets.imageData.data,
        animationAssets.imageData.mimeType,
        postProcessPrompt,
        (message: string) => {
          setLoadingMessage(message);
        },
        styleImageBase64,
        styleImageMimeType
      );
      setAnimationAssets(processedAssets);
    } catch (err) {
      console.error(err);
      const appError = createAppError('api', err instanceof Error ? err.message : 'An unknown error occurred.', err instanceof Error ? err : undefined);
      setError(appError);
    } finally {
      setAppState(AppStatus.Animating);
    }
  }, [
    animationAssets,
    imageState.style,
    styleIntensity,
    postProcessStrength,
    setAppState,
    setLoadingMessage,
    setError,
    setAnimationAssets,
  ]);

  return { handlePostProcess };
};