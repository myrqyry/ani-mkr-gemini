/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, ImageState } from './src/types/types';
import { generateAnimationAssets, postProcessAnimation, AnimationAssets, analyzeAnimation, detectObjectsInAnimation, BoundingBox } from './src/services/geminiService';
import { buildCreativeInstruction, buildPostProcessPrompt, promptSuggestions, buildObjectDetectionPrompt } from './prompts';
import { resizeImage } from './src/utils/image';
import CameraView, { CameraViewHandles } from './components/CameraView';
import AnimationPlayer from './components/AnimationPlayer';
import LoadingOverlay from './components/LoadingOverlay';
import { UploadIcon, SwitchCameraIcon, XCircleIcon, CameraIcon, LinkIcon } from './components/icons';
import BanamimatorButton from './components/BanamimatorButton';
import { useThemeManager } from './src/hooks/useThemeManager';
import ThemeSwitcher from './src/components/features/theme/ThemeSwitcher';
import ThemeCustomizer from './src/components/features/theme/ThemeCustomizer';
import FileUploadManager from './src/components/features/uploader/FileUploadManager';
import ErrorBoundary from './src/components/ErrorBoundary';
import {
  FRAME_COUNTS,
  MAIN_IMAGE_MAX_SIZE,
  STYLE_IMAGE_MAX_SIZE,
  TYPING_ANIMATION_TEXT,
  TYPING_ANIMATION_SPEED,
  TYPING_ANIMATION_DELETING_SPEED,
  TYPING_ANIMATION_PAUSE_MS,
  TYPING_ANIMATION_SHORT_PAUSE_MS,
} from './src/constants/app';

// --- FEATURE FLAGS ---
// Set to `true` to make uploading or capturing an image mandatory to create an animation.
// Set to `false` to allow creating animations from only a text prompt.
const REQUIRE_IMAGE_FOR_ANIMATION = true;

// Set to `true` to allow selecting multiple emoji suggestions to combine prompts.
// Set to `false` to only allow one emoji suggestion to be active at a time.
const ALLOW_MULTIPLE_EMOJI_SELECTION = false;

interface TypingAnimationState {
  fullText: string;
  isDeleting: boolean;
  text: string;
  timeoutId: number | null;
  speed: number;
}

const App: React.FC = () => {
  const {
    currentTheme,
    customThemes,
    isCustomizerOpen,
    setCurrentTheme,
    setIsCustomizerOpen,
    handleColorChange,
    handleThemeReset,
    handleThemeExport,
    handleThemeImport,
  } = useThemeManager();
  const [appState, setAppState] = useState<AppState>(AppState.Capturing);
  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    style: null,
    motion: null,
  });
  const [styleIntensity, setStyleIntensity] = useState<number>(100);
  const [animationAssets, setAnimationAssets] = useState<AnimationAssets | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<BoundingBox[] | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [storyPrompt, setStoryPrompt] = useState<string>('');
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const [frameCount, setFrameCount] = useState<number>(9);
  const [postProcessStrength, setPostProcessStrength] = useState<number>(0.9);
  const cameraViewRef = useRef<CameraViewHandles>(null);
  const storyPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const shouldAnimateAfterCapture = useRef<boolean>(false);
  const typingAnimationRef = useRef<TypingAnimationState | null>(null);
  const promptWasInitiallyEmpty = useRef<boolean>(false);

  useEffect(() => {
    const checkForMultipleCameras = async () => {
      if (navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputCount = devices.filter(d => d.kind === 'videoinput').length;
          setHasMultipleCameras(videoInputCount > 1);
        } catch (err) {
          console.error("Failed to enumerate media devices:", err);
        }
      }
    };
    checkForMultipleCameras();
  }, []);
  
  useEffect(() => {
    let timeoutId: number;

    const startTypingAnimation = () => {
      const fullText = TYPING_ANIMATION_TEXT;
      let text = '';
      let isDeleting = false;

      const tick = () => {
        if (isDeleting) {
          text = fullText.substring(0, text.length - 1);
        } else {
          text = fullText.substring(0, text.length + 1);
        }

        setTypedPlaceholder(text);

        let speed = isDeleting ? TYPING_ANIMATION_DELETING_SPEED : TYPING_ANIMATION_SPEED;

        if (!isDeleting && text === fullText) {
          speed = TYPING_ANIMATION_PAUSE_MS;
          isDeleting = true;
        } else if (isDeleting && text === '') {
          isDeleting = false;
          speed = TYPING_ANIMATION_SHORT_PAUSE_MS;
        }

        timeoutId = setTimeout(tick, speed);
      };

      timeoutId = setTimeout(tick, 100);
    };

    if (!storyPrompt.trim() && !isPromptFocused) {
      startTypingAnimation();
    } else {
      setTypedPlaceholder('');
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [storyPrompt, isPromptFocused]);

  const handleCreateAnimation = useCallback(async (isRegeneration: boolean = false) => {
    const currentPrompt = storyPrompt.trim();
    let finalPrompt = currentPrompt;

    if (!isRegeneration) {
        promptWasInitiallyEmpty.current = !currentPrompt;
    }

    const shouldPickRandomPrompt = !currentPrompt || (isRegeneration && promptWasInitiallyEmpty.current);

    if (shouldPickRandomPrompt) {
        // Filter out banana prompt
        const baseSuggestions = promptSuggestions.filter(p => p.emoji !== '🍌');

        // Filter out the current prompt if it exists, to try and get a new one
        let suggestionsToChooseFrom = baseSuggestions.filter(p => p.prompt !== currentPrompt);

        // If filtering leaves an empty pool (e.g., current prompt was the only one),
        // fall back to the full non-banana list.
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

    setAppState(AppState.Processing);
    setError(null);
    setDetectedObjects(null);
    
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
      
      setLoadingMessage('Generating sprite sheet...');
      
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
      setAppState(AppState.Animating);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.Capturing);
    }
  }, [storyPrompt, imageState.original, frameCount]);
  
  const handlePostProcess = useCallback(async (effect: string, editPrompt?: string) => {
    if (!animationAssets) {
        setError("Cannot apply post-processing: no animation loaded.");
        return;
    }

    setAppState(AppState.Processing);
    setLoadingMessage(`Applying ${effect} effect...`);
    setError(null);
    setDetectedObjects(null); // Clear detections when post-processing

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
        setAppState(AppState.Animating);
    }
  }, [animationAssets, frameCount, imageState.style, styleIntensity, postProcessStrength]);

  const handleDetectObjects = useCallback(async () => {
    if (!animationAssets) {
      setError("Cannot detect objects: no animation loaded.");
      return;
    }
  
    setAppState(AppState.Processing);
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
      setAppState(AppState.Animating);
    }
  }, [animationAssets]);

  useEffect(() => {
    if (imageState.original && shouldAnimateAfterCapture.current) {
        shouldAnimateAfterCapture.current = false;
        handleCreateAnimation();
    }
  }, [imageState.original, handleCreateAnimation]);
  
  useEffect(() => {
    if (storyPromptTextareaRef.current) {
      const textarea = storyPromptTextareaRef.current;
      if (isPromptFocused) {
        // Expand on focus
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      } else {
        // Shrink on blur
        textarea.style.height = ''; // Reverts to CSS-defined height
      }
    }
  }, [storyPrompt, isPromptFocused]);

  const handleCapture = useCallback((imageDataUrl: string) => {
    setImageState(prev => ({ ...prev, original: imageDataUrl }));
    setIsCameraOpen(false);
  }, []);

  const handleFlipCamera = () => {
    cameraViewRef.current?.flipCamera();
  };

  const handleCameraError = useCallback((message: string) => {
    setError(message);
    setAppState(AppState.Error);
  }, []);

  const handleClearImage = () => {
    setImageState(prev => ({ ...prev, original: null }));
    setIsCameraOpen(false);
  };
  
  const handleBack = () => {
    setAppState(AppState.Capturing);
    setAnimationAssets(null);
    setError(null);
    setDetectedObjects(null);
  };
  
  const handleSuggestionClick = (prompt: string) => {
    setStoryPrompt(currentPrompt => {
      if (ALLOW_MULTIPLE_EMOJI_SELECTION) {
        const hasPrompt = currentPrompt.includes(prompt);
        if (hasPrompt) {
          // Remove the prompt and clean up whitespace
          return currentPrompt
            .replace(prompt, '')
            .replace(/\s\s+/g, ' ') // Replace multiple spaces with a single one
            .trim();
        } else {
          // Add the prompt
          return (currentPrompt ? `${currentPrompt} ${prompt}` : prompt).trim();
        }
      } else {
        // Single selection mode: if the current prompt is the one clicked, clear it.
        // Otherwise, replace the current prompt with the clicked one.
        return currentPrompt === prompt ? '' : prompt;
      }
    });
  };
  
  const handlePrimaryAction = useCallback(() => {
    if (isCameraOpen) {
        if (cameraViewRef.current) {
            shouldAnimateAfterCapture.current = true;
            cameraViewRef.current.capture();
        }
    } else {
        handleCreateAnimation();
    }
  }, [isCameraOpen, handleCreateAnimation]);
  
  const isBananimateDisabled = !isCameraOpen && !imageState.original && (REQUIRE_IMAGE_FOR_ANIMATION || !storyPrompt.trim());

  const renderContent = () => {
    switch (appState) {
      case AppState.Capturing:
        return (
          <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
             <div className="w-full mt-3 mb-2 overflow-x-auto no-scrollbar" aria-label="Animation style suggestions">
                <div className="w-max mx-auto flex items-center gap-x-3 sm:gap-x-4 px-4">
                  {promptSuggestions.map(({ emoji, prompt }) => {
                    const isActive = ALLOW_MULTIPLE_EMOJI_SELECTION
                      ? storyPrompt.includes(prompt)
                      : storyPrompt === prompt;
                    
                    const ariaLabelAction = ALLOW_MULTIPLE_EMOJI_SELECTION
                      ? (isActive ? 'Remove' : 'Add')
                      : (isActive ? 'Deselect' : 'Select');
                      
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleSuggestionClick(prompt)}
                        className={`text-3xl p-2 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:ring-[var(--color-accent)] ${isActive ? 'bg-[var(--color-accent)]' : 'hover:bg-[var(--color-overlay)]'}`}
                        title={prompt}
                        aria-label={`${ariaLabelAction} animation prompt: ${prompt}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
            </div>
            <div className="flex justify-center gap-2 mb-2">
                {FRAME_COUNTS.map(count => (
                  <button
                    key={count}
                    onClick={() => setFrameCount(count)}
                    className={`px-4 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:ring-[var(--color-accent)] ${
                      frameCount === count
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-button)] text-[var(--color-text-muted)] hover:bg-[var(--color-button-hover)]'
                    }`}
                  >
                    {count} Frames
                  </button>
                ))}
            </div>
            <div className="w-full mb-2 relative">
              {/* A 'fake' placeholder is used because the native placeholder attribute doesn't support newlines. */}
              {!storyPrompt && !isPromptFocused && (
                <div className="absolute top-0 left-0 px-4 py-3 text-[var(--color-text-muted)] text-lg pointer-events-none" aria-hidden="true">
                  What would you like to <span className="text-[var(--color-warning)]">Bananimate</span>?<br />
                  <span className="text-[var(--color-text-subtle)]">
                    {typedPlaceholder}
                    <span className="animate-pulse font-normal">|</span>
                  </span>
                </div>
              )}
              <textarea
                ref={storyPromptTextareaRef}
                id="storyPrompt"
                rows={3}
                className="w-full bg-[var(--color-overlay)] text-[var(--color-text-base)] border border-[var(--color-surface-alt)] rounded-lg px-4 py-3 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all duration-300 text-lg resize-none overflow-y-auto"
                value={storyPrompt}
                onChange={e => setStoryPrompt(e.target.value)}
                onFocus={() => setIsPromptFocused(true)}
                onBlur={() => {
                  // We add a small delay to allow click events on other elements to fire before the blur causes a layout shift.
                  setTimeout(() => setIsPromptFocused(false), 150);
                }}
                aria-label="Animation prompt"
              />
            </div>
            <FileUploadManager
              imageState={imageState}
              setImageState={setImageState}
              styleIntensity={styleIntensity}
              setStyleIntensity={setStyleIntensity}
              setStoryPrompt={setStoryPrompt}
              setAppState={setAppState}
              setLoadingMessage={setLoadingMessage}
              setError={setError}
            />
            {error && (
              <div className="w-full bg-[var(--color-danger-surface)] border border-[var(--color-danger)] text-[var(--color-danger-text)] px-4 py-3 rounded-lg relative mb-4 flex items-center justify-between animate-shake" role="alert">
                <div className="pr-4">
                  <strong className="font-bold block">Ohoh Bananimate couldn't Bananimate that one. Try again possibly with a new image and prompt ...?</strong>
                  <span className="text-sm block mt-1">{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1 -mr-2 flex-shrink-0 self-start"
                  aria-label="Close error message"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            )}
            
            <div className="relative w-full [@media(max-height:750px)]:w-96 [@media(max-height:650px)]:w-72 aspect-square bg-[var(--color-surface)] rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
              {imageState.original ? (
                  <>
                      <img src={imageState.original} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={handleClearImage}
                        className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                        aria-label="Remove image"
                      >
                        <XCircleIcon className="w-6 h-6" />
                      </button>
                  </>
              ) : isCameraOpen ? (
                  <>
                      <CameraView ref={cameraViewRef} onCapture={handleCapture} onError={handleCameraError} />
                       <button
                          onClick={() => setIsCameraOpen(false)}
                          className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                          aria-label="Close camera"
                      >
                        <XCircleIcon className="w-6 h-6" />
                      </button>
                      {hasMultipleCameras && (
                          <button
                              onClick={handleFlipCamera}
                              className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                              aria-label="Flip camera"
                          >
                              <SwitchCameraIcon className="w-6 h-6" />
                          </button>
                      )}
                  </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full w-full pb-32">
                  <p className="mb-4 text-[var(--color-text-muted)] text-lg">
                    {REQUIRE_IMAGE_FOR_ANIMATION ? 'Add an image to Bananimate' : 'Optionally, add an image to Bananimate'}
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={() => setIsCameraOpen(true)}
                      className="w-52 bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                      aria-label="Use camera to take a photo"
                    >
                      <CameraIcon className="w-6 h-6 mr-3" />
                      Open Camera
                    </button>
                    <button
                      onClick={() => {}}
                      className="w-52 bg-[var(--color-button)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-button-hover)] transition-colors duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                      aria-label="Upload an image from your device"
                    >
                      <UploadIcon className="w-6 h-6 mr-3" />
                      Upload Image
                    </button>
                    <button
                      onClick={() => {}}
                      className="w-52 bg-[var(--color-button)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-button-hover)] transition-colors duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                      aria-label="Paste an image URL"
                    >
                      <LinkIcon className="w-6 h-6 mr-3" />
                      Paste URL
                    </button>
                  </div>
                </div>
              )}
              {/* Button is now positioned over the image/camera view */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <BanamimatorButton
                  onClick={handlePrimaryAction}
                  disabled={isBananimateDisabled}
                  aria-label={isCameraOpen ? 'Capture and Animate' : 'Create Animation'}
                />
              </div>
            </div>
          </div>
        );
      case AppState.Processing:
        return <LoadingOverlay message={loadingMessage} />;
      case AppState.Animating:
        return animationAssets ? (
          <AnimationPlayer 
            assets={animationAssets} 
            frameCount={frameCount} 
            onRegenerate={() => handleCreateAnimation(true)} 
            onBack={handleBack}
            onPostProcess={handlePostProcess}
            onDetectObjects={handleDetectObjects}
            detectedObjects={detectedObjects}
            error={error}
            clearError={() => setError(null)}
            styleImage={imageState.style}
            postProcessStrength={postProcessStrength}
            onPostProcessStrengthChange={setPostProcessStrength}
          />
        ) : null;
      case AppState.Error:
        return (
          <div className="text-center bg-[var(--color-danger-surface)] p-8 rounded-lg max-w-md w-full">
            <p className="text-[var(--color-text-base)] mb-6 font-medium text-lg">{error}</p>
            <button
              onClick={handleBack}
              className="bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
            >
              Try Again
            </button>
          </div>
        );
    }
  };

  return (
    <div className="h-dvh bg-[var(--color-background)] text-[var(--color-text-base)] flex flex-col items-center p-4 overflow-y-auto">
      <ErrorBoundary>
        <div className="w-full grow flex items-center [@media(max-height:750px)]:items-start justify-center">
          {renderContent()}
        </div>
      </ErrorBoundary>
      <footer className="w-full shrink-0 p-4 text-center text-[var(--color-text-subtle)] text-xs flex justify-center items-center gap-x-6">
        <span>Built with Gemini 2.5 Flash Image Preview | Created by <a href="http://x.com/pitaru" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-accent)]">@pitaru</a></span>
        <ThemeSwitcher 
            currentTheme={currentTheme} 
            onThemeChange={setCurrentTheme} 
            onCustomize={() => setIsCustomizerOpen(true)}
        />
      </footer>
       {isCustomizerOpen && (
            <ThemeCustomizer
                theme={currentTheme}
                customColors={customThemes[currentTheme] || {}}
                onColorChange={handleColorChange}
                onReset={handleThemeReset}
                onImport={handleThemeImport}
                onExport={handleThemeExport}
                onClose={() => setIsCustomizerOpen(false)}
            />
        )}
    </div>
  );
};

export default App;