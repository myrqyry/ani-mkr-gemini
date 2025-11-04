/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AppStatus, AppError } from 'src/types/types';
import { AnimationAssets } from 'src/services/gemini';
import CameraView, { CameraViewHandles } from 'src/components/CameraView';
import ExportModal from 'src/components/ExportModal';
import { useThemeManager } from 'src/hooks/useThemeManager';
import ThemeSwitcher from 'src/components/features/theme/ThemeSwitcher';
import ThemeCustomizer from 'src/components/features/theme/ThemeCustomizer';
import { FileUploadManagerHandles } from 'src/components/features/uploader/FileUploadManager';
import ErrorBoundary from 'src/components/ErrorBoundary';
import { useAnimationCreator } from 'src/hooks/useAnimationCreator';
import { useObjectDetection } from 'src/hooks/useObjectDetection';
import { usePostProcessing } from 'src/hooks/usePostProcessing';
import { useTypingAnimation } from 'src/hooks/useTypingAnimation';
import { debounce } from 'lodash';

import CaptureView from 'src/components/views/CaptureView';
import AnimationView from 'src/components/views/AnimationView';
import ErrorView from 'src/components/views/ErrorView';
import LoadingView from 'src/components/views/LoadingView';
import { useUIState, useAnimationState, useImageState } from 'src/contexts/AppStateContext';

// --- FEATURE FLAGS ---
const REQUIRE_IMAGE_FOR_ANIMATION = false;
const ALLOW_MULTIPLE_EMOJI_SELECTION = true;

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

  const { ui, actions: uiActions } = useUIState();
  const { animation, actions: animationActions } = useAnimationState();
  const { image, actions: imageActions } = useImageState();

  const {
    appStatus,
    isPromptFocused,
    isCameraOpen,
    isExportModalOpen,
    hasMultipleCameras,
  } = ui;

  const {
    animationAssets,
    storyPrompt,
    frameCount,
    postProcessStrength,
    styleIntensity,
  } = animation;

  const { imageState, selectedAsset } = image;

  const typedPlaceholder = useTypingAnimation(storyPrompt, isPromptFocused);

  const cameraViewRef = useRef<CameraViewHandles>(null);
  const storyPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileUploadManagerRef = useRef<FileUploadManagerHandles>(null);
  const shouldAnimateAfterCapture = useRef<boolean>(false);

  const { handleCreateAnimation } = useAnimationCreator(
    imageState,
    storyPrompt,
    frameCount,
    uiActions.setAppStatus,
    uiActions.setLoadingMessage,
    uiActions.setError,
    animationActions.setAnimationAssets,
    animationActions.setStoryPrompt,
    selectedAsset,
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

  const { handleDetectObjects } = useObjectDetection(
    animationAssets,
    uiActions.setAppStatus,
    uiActions.setLoadingMessage,
    uiActions.setError,
    animationActions.setDetectedObjects,
  );

  const { handlePostProcess } = usePostProcessing(
    animationAssets,
    imageState,
    frameCount,
    styleIntensity,
    postProcessStrength,
    uiActions.setAppStatus,
    uiActions.setLoadingMessage,
    uiActions.setError,
    animationActions.setAnimationAssets,
  );

  useEffect(() => {
    const checkForMultipleCameras = async () => {
      if (navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputCount = devices.filter(d => d.kind === 'videoinput').length;
          uiActions.setHasMultipleCameras(videoInputCount > 1);
        } catch (err) {
          console.error("Failed to enumerate media devices:", err);
        }
      }
    };
    checkForMultipleCameras();
  }, [uiActions]);

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
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      } else {
        textarea.style.height = '';
      }
    }
  }, [storyPrompt, isPromptFocused]);

  const handleCapture = useCallback(async (imageDataUrl: string) => {
    try {
      if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
        throw createAppError('validation', 'Invalid image data received from camera');
      }

      imageActions.setImageState({ original: imageDataUrl });
      uiActions.setIsCameraOpen(false);

      await new Promise(resolve => requestAnimationFrame(resolve));

      if (shouldAnimateAfterCapture.current) {
        shouldAnimateAfterCapture.current = false;
        try {
          await handleCreateAnimation();
        } catch (animationError) {
          const appError = createAppError('api', 'Failed to create animation from captured image', animationError as Error);
          uiActions.setError(appError);
        }
      }
    } catch (error) {
      console.error('Error in handleCapture:', error);
      const appError = error instanceof Error ? createAppError('unknown', error.message, error) : createAppError('unknown', 'Failed to process captured image');
      uiActions.setError(appError);
    }
  }, [handleCreateAnimation, imageActions, uiActions]);

  const handleFlipCamera = () => {
    cameraViewRef.current?.flipCamera();
  };

  const handleCameraError = useCallback((message: string) => {
    const appError = createAppError('permission', message);
    uiActions.setError(appError);
    uiActions.setAppStatus(AppStatus.Error);
  }, [uiActions]);

  const handleClearImage = () => {
    imageActions.setImageState({ original: null });
    uiActions.setIsCameraOpen(false);
  };

  const handleBack = () => {
    uiActions.setAppStatus(AppStatus.Capturing);
    animationActions.setAnimationAssets(null);
    uiActions.setError(null);
    animationActions.setDetectedObjects(null);
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
      animationActions.setStoryPrompt(prompts.join(', '));
    } else {
      animationActions.setStoryPrompt(storyPrompt === prompt ? '' : prompt);
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
    const state = { ...ui, ...animation, ...image, typedPlaceholder };
    switch (appStatus) {
      case AppStatus.Capturing:
        return (
          <CaptureView
            state={state}
            actions={{ ...uiActions, ...animationActions, ...imageActions }}
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
            actions={{ ...uiActions, ...animationActions, ...imageActions }}
            handleCreateAnimation={handleCreateAnimation}
            handleBack={handleBack}
            handlePostProcess={handlePostProcess}
            handleDetectObjects={handleDetectObjects}
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
    appStatus,
    ui,
    animation,
    image,
    typedPlaceholder,
    uiActions,
    animationActions,
    imageActions,
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
            onClose={() => uiActions.setIsExportModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default App;