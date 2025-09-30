import { useCallback } from 'react';
import { AppStatus, AnimationAssets, BoundingBox } from '../types/types';
import { detectObjectsInAnimation } from '../services/geminiService';
import { buildObjectDetectionPrompt } from '../../prompts';

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