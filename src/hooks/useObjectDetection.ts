import { useCallback } from 'react';
import { AppStatus, AnimationAssets, BoundingBox } from '../types/types';
import { detectObjectsInAnimation } from '../services/gemini';
import { buildObjectDetectionPrompt } from '../../prompts';

/**
 * A hook for detecting objects in an animation.
 * @param {AnimationAssets | null} animationAssets - The assets for the animation.
 * @param {React.Dispatch<React.SetStateAction<AppStatus>>} setAppState - Function to set the app state.
 * @param {React.Dispatch<React.SetStateAction<string>>} setLoadingMessage - Function to set the loading message.
 * @param {React.Dispatch<React.SetStateAction<string | null>>} setError - Function to set the error.
 * @param {React.Dispatch<React.SetStateAction<BoundingBox[] | null>>} setDetectedObjects - Function to set the detected objects.
 * @returns {{ handleDetectObjects: () => Promise<void> }} - An object with a function to detect objects.
 */
export const useObjectDetection = (
  animationAssets: AnimationAssets | null,
  setAppState: React.Dispatch<React.SetStateAction<AppStatus>>,
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setDetectedObjects: React.Dispatch<React.SetStateAction<BoundingBox[] | null>>,
) => {
  const handleDetectObjects = useCallback(async () => {
    if (!animationAssets) {
      setError("Cannot detect objects: no animation loaded.");
      return;
    }

    setAppState(AppStatus.Processing);
    setLoadingMessage('Detecting objects...');
    setError(null);

    try {
      const { data: base64SpriteSheet, mimeType } = animationAssets.imageData;
      const detectionPrompt = buildObjectDetectionPrompt();

      const objects = await detectObjectsInAnimation(
        base64SpriteSheet,
        mimeType,
        detectionPrompt
      );

      setDetectedObjects(objects);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during object detection.';
      console.error(err);
      setError(errorMessage);
    } finally {
      setAppState(AppStatus.Animating);
    }
  }, [animationAssets, setAppState, setLoadingMessage, setError, setDetectedObjects]);

  return { handleDetectObjects };
};