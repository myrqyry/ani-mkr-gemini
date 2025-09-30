import { useCallback, useRef } from 'react';
import { AppStatus, ImageState, AnimationAssets } from '../types/types';
import { generateAnimationAssets } from '../services/geminiService';
import { buildCreativeInstruction, promptSuggestions } from '../../prompts';
import { resizeImage } from '../utils/image';
import { MAIN_IMAGE_MAX_SIZE } from '../constants/app';

export const useAnimationCreator = (
  imageState: ImageState,
  storyPrompt: string,
  frameCount: number,
  setAppState: React.Dispatch<React.SetStateAction<AppStatus>>,
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setAnimationAssets: React.Dispatch<React.SetStateAction<AnimationAssets | null>>,
  setStoryPrompt: React.Dispatch<React.SetStateAction<string>>,
) => {
  const promptWasInitiallyEmpty = useRef<boolean>(false);

  const handleCreateAnimation = useCallback(async (isRegeneration: boolean = false) => {
    const currentPrompt = storyPrompt.trim();
    let finalPrompt = currentPrompt;

    if (!isRegeneration) {
      promptWasInitiallyEmpty.current = !currentPrompt;
    }

    const shouldPickRandomPrompt = !currentPrompt || (isRegeneration && promptWasInitiallyEmpty.current);

    if (shouldPickRandomPrompt) {
      const baseSuggestions = promptSuggestions.filter(p => p.emoji !== '🍌');
      let suggestionsToChooseFrom = baseSuggestions.filter(p => p.prompt !== currentPrompt);
      if (suggestionsToChooseFrom.length === 0) {
        suggestionsToChooseFrom = baseSuggestions;
      }
      if (suggestionsToChooseFrom.length > 0) {
        const randomSuggestion = suggestionsToChooseFrom[Math.floor(Math.random() * suggestionsToChooseFrom.length)];
        finalPrompt = randomSuggestion.prompt;
        setStoryPrompt(finalPrompt);
      }
    }

    if (!imageState.original && !finalPrompt) {
      return;
    }

    const finalCreativeInstruction = buildCreativeInstruction(
      finalPrompt,
      imageState.original,
      frameCount,
    );

    setAppState(AppStatus.Processing);
    setLoadingMessage('Generating sprite sheet...');
    setError(null);

    let base64Image: string | null = null;
    let mimeType: string | null = null;

    try {
      if (imageState.original) {
        setLoadingMessage('Optimizing image...');
        const { dataUrl: resizedDataUrl, mime: resizedMime } = await resizeImage(imageState.original, { maxSize: MAIN_IMAGE_MAX_SIZE });
        const imageParts = resizedDataUrl.match(/^data:.*?;base64,(.*)$/);
        if (!imageParts || imageParts.length !== 2) {
          throw new Error("Could not process the resized image data.");
        }
        mimeType = resizedMime;
        base64Image = imageParts[1];
      }

      const generatedAsset = await generateAnimationAssets(
        base64Image,
        mimeType,
        finalCreativeInstruction,
        (message: string) => setLoadingMessage(message)
      );

      if (!generatedAsset || !generatedAsset.imageData.data) {
        throw new Error(`Sprite sheet generation failed. Did not receive a valid image.`);
      }

      setAnimationAssets(generatedAsset);
      setAppState(AppStatus.Animating);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppStatus.Capturing);
    }
  }, [storyPrompt, imageState.original, frameCount, setAppState, setLoadingMessage, setError, setAnimationAssets, setStoryPrompt]);

  return { handleCreateAnimation };
};