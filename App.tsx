/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect, useReducer } from 'react';
import { AppState, ImageState, AppStatus } from 'src/types/types';
import { AnimationAssets, BoundingBox } from 'src/services/geminiService';
import { promptSuggestions } from 'prompts';
import CameraView, { CameraViewHandles } from 'src/components/CameraView';
import AnimationPlayer from 'src/components/AnimationPlayer';
import LoadingOverlay from 'src/components/LoadingOverlay';
import { UploadIcon, SwitchCameraIcon, XCircleIcon, CameraIcon, LinkIcon } from 'src/components/icons';
import BanamimatorButton from 'src/components/BanamimatorButton';
import { useThemeManager } from 'src/hooks/useThemeManager';
import ThemeSwitcher from 'src/components/features/theme/ThemeSwitcher';
import ThemeCustomizer from 'src/components/features/theme/ThemeCustomizer';
import FileUploadManager, { FileUploadManagerHandles } from 'src/components/features/uploader/FileUploadManager';
import ErrorBoundary from 'src/components/ErrorBoundary';
import { useAnimationCreator } from 'src/hooks/useAnimationCreator';
import { useObjectDetection } from 'src/hooks/useObjectDetection';
import { usePostProcessing } from 'src/hooks/usePostProcessing';
import { appReducer, initialState } from 'src/reducers/appReducer';
import { categorizeError, getErrorTitle } from 'src/utils/errorHandler';
import {
  FRAME_COUNTS,
  TYPING_ANIMATION_TEXT,
  TYPING_ANIMATION_SPEED,
  TYPING_ANIMATION_DELETING_SPEED,
  TYPING_ANIMATION_PAUSE_MS,
  TYPING_ANIMATION_SHORT_PAUSE_MS,
} from 'src/constants/app';

// --- FEATURE FLAGS ---
// Set to `true` to make uploading or capturing an image mandatory to create an animation.
// Set to `false` to allow creating animations from only a text prompt.
const REQUIRE_IMAGE_FOR_ANIMATION = true;

// Set to `true` to allow selecting multiple emoji suggestions to combine prompts.
// Set to `false` to only allow one emoji suggestion to be active at a time.
const ALLOW_MULTIPLE_EMOJI_SELECTION = true;

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
  const [state, dispatch] = useReducer(appReducer, initialState);
  const {
    appStatus,
    imageState,
    styleIntensity,
    animationAssets,
    detectedObjects,
    loadingMessage,
    error,
    storyPrompt,
    typedPlaceholder,
    isPromptFocused,
    frameCount,
    postProcessStrength,
    hasMultipleCameras,
    isCameraOpen,
  } = state;

  const cameraViewRef = useRef<CameraViewHandles>(null);
  const storyPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileUploadManagerRef = useRef<FileUploadManagerHandles>(null);
  const shouldAnimateAfterCapture = useRef<boolean>(false);
  const typingAnimationRef = useRef<TypingAnimationState | null>(null);

  const { handleCreateAnimation } = useAnimationCreator(
    imageState,
    storyPrompt,
    frameCount,
    (payload) => dispatch({ type: 'SET_APP_STATUS', payload }),
    (payload) => dispatch({ type: 'SET_LOADING_MESSAGE', payload }),
    (payload) => dispatch({ type: 'SET_ERROR', payload }),
    (payload) => dispatch({ type: 'SET_ANIMATION_ASSETS', payload }),
    (payload) => dispatch({ type: 'SET_STORY_PROMPT', payload }),
  );

  const { handleDetectObjects } = useObjectDetection(
    animationAssets,
    (payload) => dispatch({ type: 'SET_APP_STATUS', payload }),
    (payload) => dispatch({ type: 'SET_LOADING_MESSAGE', payload }),
    (payload) => dispatch({ type: 'SET_ERROR', payload }),
    (payload) => dispatch({ type: 'SET_DETECTED_OBJECTS', payload }),
  );

  const { handlePostProcess } = usePostProcessing(
    animationAssets,
    imageState,
    frameCount,
    styleIntensity,
    postProcessStrength,
    (payload) => dispatch({ type: 'SET_APP_STATUS', payload }),
    (payload) => dispatch({ type: 'SET_LOADING_MESSAGE', payload }),
    (payload) => dispatch({ type: 'SET_ERROR', payload }),
    (payload) => dispatch({ type: 'SET_ANIMATION_ASSETS', payload }),
  );


  useEffect(() => {
    const checkForMultipleCameras = async () => {
      if (navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputCount = devices.filter(d => d.kind === 'videoinput').length;
          dispatch({ type: 'SET_HAS_MULTIPLE_CAMERAS', payload: videoInputCount > 1 });
        } catch (err) {
          console.error("Failed to enumerate media devices:", err);
        }
      }
    };
    checkForMultipleCameras();
  }, []);
  
  useEffect(() => {
    // This cleanup function is for the *previous* effect. It runs before the new effect logic.
    // It's crucial to access the *current* value of the ref to clear any running timeout.
    const cleanup = () => {
      if (typingAnimationRef.current?.timeoutId) {
        clearTimeout(typingAnimationRef.current.timeoutId);
      }
    };

    // Condition to STOP the animation and clear the placeholder.
    if (storyPrompt.trim() || isPromptFocused) {
      cleanup(); // Ensure any active animation is stopped immediately.
      dispatch({ type: 'SET_TYPED_PLACEHOLDER', payload: '' });
      return; // Exit the effect.
    }

    // Condition to START the animation.
    typingAnimationRef.current = {
      fullText: TYPING_ANIMATION_TEXT,
      isDeleting: false,
      text: '',
      timeoutId: null,
      speed: TYPING_ANIMATION_SPEED,
    };

    const tick = () => {
      const state = typingAnimationRef.current;
      // If the state was cleared (e.g., by a fast dependency change), stop ticking.
      if (!state) return;

      let { fullText, isDeleting, text } = state;

      if (isDeleting) {
        text = fullText.substring(0, text.length - 1);
      } else {
        text = fullText.substring(0, text.length + 1);
      }

      dispatch({ type: 'SET_TYPED_PLACEHOLDER', payload: text });

      let newSpeed = isDeleting ? TYPING_ANIMATION_DELETING_SPEED : TYPING_ANIMATION_SPEED;

      if (!isDeleting && text === fullText) {
        newSpeed = TYPING_ANIMATION_PAUSE_MS;
        state.isDeleting = true;
      } else if (isDeleting && text === '') {
        state.isDeleting = false;
        newSpeed = TYPING_ANIMATION_SHORT_PAUSE_MS;
      }

      state.text = text;
      state.timeoutId = setTimeout(tick, newSpeed);
    };

    // Start the first tick.
    typingAnimationRef.current.timeoutId = setTimeout(tick, TYPING_ANIMATION_SPEED);

    // Return the cleanup function to be run when the component unmounts or dependencies change.
    return cleanup;
  }, [storyPrompt, isPromptFocused]);
  
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
    dispatch({ type: 'SET_IMAGE_STATE', payload: { original: imageDataUrl } });
    dispatch({ type: 'SET_IS_CAMERA_OPEN', payload: false });
  }, []);

  const handleFlipCamera = () => {
    cameraViewRef.current?.flipCamera();
  };

  const handleCameraError = useCallback((message: string) => {
    dispatch({ type: 'SET_ERROR', payload: message });
    dispatch({ type: 'SET_APP_STATUS', payload: AppStatus.Error });
  }, []);

  const handleClearImage = () => {
    dispatch({ type: 'SET_IMAGE_STATE', payload: { original: null } });
    dispatch({ type: 'SET_IS_CAMERA_OPEN', payload: false });
  };
  
  const handleBack = () => {
    dispatch({ type: 'SET_APP_STATUS', payload: AppStatus.Capturing });
    dispatch({ type: 'SET_ANIMATION_ASSETS', payload: null });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_DETECTED_OBJECTS', payload: null });
  };
  
  const handleSuggestionClick = (prompt: string) => {
    if (ALLOW_MULTIPLE_EMOJI_SELECTION) {
      const prompts = storyPrompt.split(', ').filter(p => p.trim() !== '');
      const promptIndex = prompts.indexOf(prompt);
      if (promptIndex > -1) {
        prompts.splice(promptIndex, 1);
      } else {
        prompts.push(prompt);
      }
      dispatch({ type: 'SET_STORY_PROMPT', payload: prompts.join(', ') });
    } else {
      dispatch({
        type: 'SET_STORY_PROMPT',
        payload: storyPrompt === prompt ? '' : prompt,
      });
    }
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
    switch (appStatus) {
      case AppStatus.Capturing:
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
                    onClick={() => dispatch({ type: 'SET_FRAME_COUNT', payload: count })}
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
                onChange={e => dispatch({ type: 'SET_STORY_PROMPT', payload: e.target.value })}
                onFocus={() => dispatch({ type: 'SET_IS_PROMPT_FOCUSED', payload: true })}
                onBlur={() => {
                  // We add a small delay to allow click events on other elements to fire before the blur causes a layout shift.
                  setTimeout(() => dispatch({ type: 'SET_IS_PROMPT_FOCUSED', payload: false }), 150);
                }}
                aria-label="Animation prompt"
              />
            </div>
            <FileUploadManager
              ref={fileUploadManagerRef}
              imageState={imageState}
              setImageState={(payload) => dispatch({ type: 'SET_IMAGE_STATE', payload })}
              styleIntensity={styleIntensity}
              setStyleIntensity={(payload) => dispatch({ type: 'SET_STYLE_INTENSITY', payload })}
              setStoryPrompt={(payload) => dispatch({ type: 'SET_STORY_PROMPT', payload })}
              setAppState={(payload) => dispatch({ type: 'SET_APP_STATUS', payload })}
              setLoadingMessage={(payload) => dispatch({ type: 'SET_LOADING_MESSAGE', payload })}
              setError={(payload) => dispatch({ type: 'SET_ERROR', payload })}
            />
            {error && (() => {
              const errorInfo = categorizeError(error);
              const errorTitle = getErrorTitle(errorInfo);
              return (
                <div className="w-full bg-[var(--color-danger-surface)] border border-[var(--color-danger)] text-[var(--color-danger-text)] px-4 py-3 rounded-lg relative mb-4 animate-shake" role="alert">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <strong className="font-bold block">{errorTitle}</strong>
                      {errorInfo.suggestion && (
                        <span className="text-sm block mt-1">{errorInfo.suggestion}</span>
                      )}
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer hover:underline">Technical details</summary>
                        <pre className="text-xs mt-1 whitespace-pre-wrap break-words">{errorInfo.message}</pre>
                      </details>
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                      className="p-1 -mr-2 flex-shrink-0"
                      aria-label="Close error message"
                    >
                      <XCircleIcon className="w-6 h-6" />
                    </button>
                  </div>
                  {errorInfo.canRetry && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          dispatch({ type: 'SET_ERROR', payload: null });
                          handleCreateAnimation();
                        }}
                        className="bg-[var(--color-accent)] text-white font-semibold py-2 px-4 rounded hover:bg-[var(--color-accent-hover)] transition-colors duration-300 text-sm"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                        className="bg-[var(--color-surface)] text-[var(--color-text-base)] font-semibold py-2 px-4 rounded hover:bg-[var(--color-surface-hover)] transition-colors duration-300 text-sm border border-[var(--color-border)]"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
            
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
                          onClick={() => dispatch({ type: 'SET_IS_CAMERA_OPEN', payload: false })}
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
                      onClick={() => dispatch({ type: 'SET_IS_CAMERA_OPEN', payload: true })}
                      className="w-52 bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                      aria-label="Use camera to take a photo"
                    >
                      <CameraIcon className="w-6 h-6 mr-3" />
                      Open Camera
                    </button>
                    <button
                      onClick={() => fileUploadManagerRef.current?.handleUploadClick()}
                      className="w-52 bg-[var(--color-button)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-button-hover)] transition-colors duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                      aria-label="Upload an image from your device"
                    >
                      <UploadIcon className="w-6 h-6 mr-3" />
                      Upload Image
                    </button>
                    <button
                      onClick={() => fileUploadManagerRef.current?.handlePasteUrl('main')}
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
      case AppStatus.Processing:
        return <LoadingOverlay message={loadingMessage} />;
      case AppStatus.Animating:
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
            clearError={() => dispatch({ type: 'SET_ERROR', payload: null })}
            styleImage={imageState.style}
            postProcessStrength={postProcessStrength}
            onPostProcessStrengthChange={(payload) => dispatch({ type: 'SET_POST_PROCESS_STRENGTH', payload })}
          />
        ) : null;
      case AppStatus.Error:
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