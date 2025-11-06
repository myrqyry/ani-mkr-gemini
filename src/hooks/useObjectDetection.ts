import { useCallback } from 'react';
import { AppStatus, AnimationAssets, BoundingBox, AppError } from '../types/types';
import { detectObjects } from '../services/gemini';
import { OBJECT_DETECTION_PROMPT } from '../services/prompts';

const createAppError = (type: AppError['type'], message: string, originalError?: Error): AppError => ({
  type,
  message,
  retryable: ['network', 'api'].includes(type),
  originalError,
});

/**
 * A hook for detecting objects in an animation.
 * @param {AnimationAssets | null} animationAssets - The assets of the animation.
 * @param {React.Dispatch<React.SetStateAction<AppStatus>>} setAppState - Function to set the app state.
 * @param {React.Dispatch<React.SetStateAction<string>>} setLoadingMessage - Function to set the loading message.
 * @param {React.Dispatch<React.SetStateAction<AppError | null>>} setError - Function to set the error.
 * @param {React.Dispatch<React.SetStateAction<BoundingBox[] | null>>} setDetectedObjects - Function to set the detected objects.
 * @returns {{ handleDetectObjects: () => Promise<void> }} - An object with a function to detect objects.
 */
export const useObjectDetection = (
  animationAssets: AnimationAssets | null,
  setAppState: (payload: AppStatus) => void,
  setLoadingMessage: (payload: string) => void,
  setError: (payload: AppError | null) => void,
  setDetectedObjects: (payload: BoundingBox[] | null) => void,
) => {
  const handleDetectObjects = useCallback(async () => {
    if (!animationAssets?.imageData?.data) {
      return;
    }
    try {
      setLoadingMessage('Detecting objects...');
      setAppState(AppStatus.Processing);
      setError(null);

      const detected = await detectObjects(
        animationAssets.imageData.data,
        animationAssets.imageData.mimeType,
        OBJECT_DETECTION_PROMPT,
        (message: string) => {
          setLoadingMessage(message);
        }
      );
      setDetectedObjects(detected);
    } catch (err) {
      console.error(err);
      const appError = createAppError('api', err instanceof Error ? err.message : 'An unknown error occurred.', err instanceof Error ? err : undefined);
      setError(appError);
    } finally {
      setAppState(AppStatus.Animating);
    }
  }, [animationAssets, setAppState, setLoadingMessage, setError, setDetectedObjects]);

  return { handleDetectObjects };
};