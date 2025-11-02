/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect, useReducer, useMemo } from 'react';
import { AppState, AppStatus, AppError } from 'src/types/types';
import { AnimationAssets, BoundingBox } from 'src/services/gemini';
import { promptSuggestions } from 'prompts';
import CameraView, { CameraViewHandles } from 'src/components/CameraView';
import AnimationPlayer from 'src/components/AnimationPlayer';
import ExportModal from 'src/components/ExportModal';
import LoadingOverlay from 'src/components/LoadingOverlay';
import { UploadIcon, SwitchCameraIcon, XCircleIcon, CameraIcon, LinkIcon } from 'src/components/icons';
import AniMkrGeminiButton from 'src/components/AniMkrGeminiButton';
import { useThemeManager } from 'src/hooks/useThemeManager';
import ThemeSwitcher from 'src/components/features/theme/ThemeSwitcher';
import ThemeCustomizer from 'src/components/features/theme/ThemeCustomizer';
import FileUploadManager, { FileUploadManagerHandles } from 'src/components/features/uploader/FileUploadManager';
import AssetManager from 'src/components/features/uploader/AssetManager';
import ErrorBoundary from 'src/components/ErrorBoundary';
import { useAnimationCreator } from 'src/hooks/useAnimationCreator';
import { useObjectDetection } from 'src/hooks/useObjectDetection';
import { usePostProcessing } from 'src/hooks/usePostProcessing';
import { appReducer, initialState } from 'src/reducers/appReducer';
import { categorizeError, getErrorTitle } from 'src/utils/errorHandler';
import { debounce } from 'lodash';
import {
  FRAME_COUNTS,
  TYPING_ANIMATION_TEXT,
  TYPING_ANIMATION_SPEED,
  TYPING_ANIMATION_DELETING_SPEED,
  TYPING_ANIMATION_PAUSE_MS,
  TYPING_ANIMATION_SHORT_PAUSE_MS,
} from 'src/constants/app';

import CaptureView from 'src/components/views/CaptureView';
import AnimationView from 'src/components/views/AnimationView';
import ErrorView from 'src/components/views/ErrorView';
import LoadingView from 'src/components/views/LoadingView';

// --- FEATURE FLAGS ---
// Set to `true` to make uploading or capturing an image mandatory to create an animation.
// Set to `false` to allow creating animations from only a text prompt.
const REQUIRE_IMAGE_FOR_ANIMATION = false;

// Set to `true` to allow selecting multiple emoji suggestions to combine prompts.
// Set to `false` to only allow one emoji suggestion to be active at a time.
const ALLOW_MULTIPLE_EMOJI_SELECTION = true;

interface TypingAnimationState {
  id: number;
  fullText: string;
  isDeleting: boolean;
  text: string;
  timeoutId: number | null;
  speed: number;
}

const createAppError = (type: AppError['type'], message: string, originalError?: Error): AppError => ({
  type,
  message,
  retryable: ['network', 'api'].includes(type),
  originalError,
});

/**
 * The main App component.
 * @returns {React.ReactElement} The rendered component.
 */
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

  const stableCallbacks = useMemo(() => ({
    setAppStatus: (payload: AppStatus) => dispatch({ type: 'SET_APP_STATUS', payload }),
    setLoadingMessage: (payload: string) => dispatch({ type: 'SET_LOADING_MESSAGE', payload }),
    setError: (payload: AppError | null) => dispatch({ type: 'SET_ERROR', payload }),
    setAnimationAssets: (payload: AnimationAssets | null) => dispatch({ type: 'SET_ANIMATION_ASSETS', payload }),
    setStoryPrompt: (payload: string) => dispatch({ type: 'SET_STORY_PROMPT', payload }),
  }), []);

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
    isExportModalOpen,
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
    stableCallbacks.setAppStatus,
    stableCallbacks.setLoadingMessage,
    stableCallbacks.setError,
    stableCallbacks.setAnimationAssets,
    stableCallbacks.setStoryPrompt,
    state.selectedAsset,
  );

  const animationCallbackRef = useRef(handleCreateAnimation);
  useEffect(() => {
    animationCallbackRef.current = handleCreateAnimation;
  }, [handleCreateAnimation]);

  const debouncedCreateAnimation = useMemo(
    () => debounce(
      () => {
        animationCallbackRef.current(false);
      },
      500
    ),
    []
  );

  const handleAssetSelect = (asset: any) => {
    dispatch({ type: 'SET_SELECTED_ASSET', payload: asset });
  };

  const { handleDetectObjects } = useObjectDetection(
    animationAssets,
    stableCallbacks.setAppStatus,
    stableCallbacks.setLoadingMessage,
    stableCallbacks.setError,
    (payload) => dispatch({ type: 'SET_DETECTED_OBJECTS', payload }),
  );

  const { handlePostProcess } = usePostProcessing(
    animationAssets,
    imageState,
    frameCount,
    styleIntensity,
    postProcessStrength,
    stableCallbacks.setAppStatus,
    stableCallbacks.setLoadingMessage,
    stableCallbacks.setError,
    stableCallbacks.setAnimationAssets,
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
  
  const deferredTypingUpdate = useMemo(() =>
    debounce((text: string) => {
      requestIdleCallback(() => {
        dispatch({ type: 'SET_TYPED_PLACEHOLDER', payload: text });
      });
    }, 16),
  []);

  useEffect(() => {
    if (storyPrompt.trim() || isPromptFocused) {
      dispatch({ type: 'SET_TYPED_PLACEHOLDER', payload: '' });
      return;
    }

    const animationId = Date.now();
    typingAnimationRef.current = {
      id: animationId,
      fullText: TYPING_ANIMATION_TEXT,
      isDeleting: false,
      text: '',
      timeoutId: null,
      speed: TYPING_ANIMATION_SPEED,
    };

    const tick = () => {
      const state = typingAnimationRef.current;
      if (!state || state.id !== animationId) return;

      let { fullText, isDeleting, text } = state;

      if (isDeleting) {
        text = fullText.substring(0, text.length - 1);
      } else {
        text = fullText.substring(0, text.length + 1);
      }

      deferredTypingUpdate(text);

      let newSpeed = isDeleting ? TYPING_ANIMATION_DELETING_SPEED : TYPING_ANIMATION_SPEED;

      if (!isDeleting && text === fullText) {
        newSpeed = TYPING_ANIMATION_PAUSE_MS;
        state.isDeleting = true;
      } else if (isDeleting && text === '') {
        state.isDeleting = false;
        newSpeed = TYPING_ANIMATION_SHORT_PAUSE_MS;
      }

      state.text = text;
      if (typingAnimationRef.current) {
        typingAnimationRef.current.timeoutId = setTimeout(tick, newSpeed);
      }
    };

    const startTimeoutId = setTimeout(tick, TYPING_ANIMATION_SPEED);
    if (typingAnimationRef.current) {
      typingAnimationRef.current.timeoutId = startTimeoutId;
    }

    return () => {
      const state = typingAnimationRef.current;
      if (state && state.id === animationId) {
        if (state.timeoutId) {
          clearTimeout(state.timeoutId);
        }
        typingAnimationRef.current = null;
      }
    };
  }, [storyPrompt, isPromptFocused, deferredTypingUpdate]);
  
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

  const handleCapture = useCallback(async (imageDataUrl: string) => {
    try {
      if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
        throw createAppError('validation', 'Invalid image data received from camera');
      }

      dispatch({ type: 'SET_IMAGE_STATE', payload: { original: imageDataUrl } });
      dispatch({ type: 'SET_IS_CAMERA_OPEN', payload: false });

      await new Promise(resolve => requestAnimationFrame(resolve));

      if (shouldAnimateAfterCapture.current) {
        shouldAnimateAfterCapture.current = false;
        try {
          await handleCreateAnimation();
        } catch (animationError) {
          const appError = createAppError('api', 'Failed to create animation from captured image', animationError as Error);
          dispatch({ type: 'SET_ERROR', payload: appError });
        }
      }
    } catch (error) {
      console.error('Error in handleCapture:', error);
      const appError = error instanceof Error ? createAppError('unknown', error.message, error) : createAppError('unknown', 'Failed to process captured image');
      dispatch({ type: 'SET_ERROR', payload: appError });
    }
  }, [handleCreateAnimation]);

  const handleFlipCamera = () => {
    cameraViewRef.current?.flipCamera();
  };

  const handleCameraError = useCallback((message: string) => {
    const appError = createAppError('permission', message);
    dispatch({ type: 'SET_ERROR', payload: appError });
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
        debouncedCreateAnimation();
    }
  }, [isCameraOpen, debouncedCreateAnimation]);
  
  const isAniMkrGeminiDisabled = !isCameraOpen && !imageState.original && (REQUIRE_IMAGE_FOR_ANIMATION || !storyPrompt.trim());

  const renderContent = useMemo(() => {
    switch (appStatus) {
      case AppStatus.Capturing:
        return (
          <CaptureView
            state={state}
            dispatch={dispatch}
            handleSuggestionClick={handleSuggestionClick}
            handleCreateAnimation={handleCreateAnimation}
            handleCapture={handleCapture}
            handleClearImage={handleClearImage}
            handleFlipCamera={handleFlipCamera}
            fileUploadManagerRef={fileUploadManagerRef}
            cameraViewRef={cameraViewRef}
            storyPromptTextareaRef={storyPromptTextareaRef}
            isAniMkrGeminiDisabled={isAniMkrGeminiDisabled}
            handlePrimaryAction={handlePrimaryAction}
            hasMultipleCameras={hasMultipleCameras}
            isCameraOpen={isCameraOpen}
            REQUIRE_IMAGE_FOR_ANIMATION={REQUIRE_IMAGE_FOR_ANIMATION}
            ALLOW_MULTIPLE_EMOJI_SELECTION={ALLOW_MULTIPLE_EMOJI_SELECTION}
          />
        );
      case AppStatus.Processing:
        return <LoadingView state={state} />;
      case AppStatus.Animating:
        return (
          <AnimationView
            state={state}
            handleCreateAnimation={handleCreateAnimation}
            handleBack={handleBack}
            handlePostProcess={handlePostProcess}
            handleDetectObjects={handleDetectObjects}
            dispatch={dispatch}
          />
        );
      case AppStatus.Error:
        return (
          <ErrorView
            state={state}
            handleBack={handleBack}
          />
        );
    }
  }, [
    state,
    appStatus,
    dispatch,
    handleSuggestionClick,
    handleCreateAnimation,
    handleCapture,
    handleClearImage,
    handleFlipCamera,
    isAniMkrGeminiDisabled,
    handlePrimaryAction,
    hasMultipleCameras,
    isCameraOpen,
    handleBack,
    handlePostProcess,
    handleDetectObjects,
  ]);

  return (
    <div className="h-dvh bg-[var(--color-background)] text-[var(--color-text-base)] flex flex-col items-center p-4 overflow-y-auto animate-fade-in">
      <ErrorBoundary>
        <div className="w-full grow flex items-center [@media(max-height:750px)]:items-start justify-center animate-fade-in-up">
          {renderContent}
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
      {isExportModalOpen && animationAssets && (
        <div className="animate-scale-in">
          <ExportModal
            frames={animationAssets.frames}
            width={512}
            height={512}
            onClose={() => dispatch({ type: 'SET_IS_EXPORT_MODAL_OPEN', payload: false })}
          />
        </div>
      )}
    </div>
  );
};

export default App;