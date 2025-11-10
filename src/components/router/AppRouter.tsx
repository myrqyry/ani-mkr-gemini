import React, { useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { AppStatus, AppError } from '@types/types';
import { CameraViewHandles } from '@components/CameraView';
import { FileUploadManagerHandles } from '@components/features/uploader/FileUploadManager';
import { useAnimationCreator } from '@hooks/useAnimationCreator';
import { useObjectDetection } from '@hooks/useObjectDetection';
import { usePostProcessing } from '@hooks/usePostProcessing';
import { useTypingAnimation } from '@hooks/useTypingAnimation';
import { useValidatedCapture } from '@hooks/useValidatedCapture';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { debounce } from 'lodash';
import { useUIState, useAnimationState, useImageState } from '@contexts/AppStateContext';
import ViewSkeleton from '@components/common/ViewSkeleton';
import LazyComponentBoundary from '@components/common/LazyComponentBoundary';

import { FEATURES } from '@/config/features';

const CaptureView = lazy(() => import('@components/views/CaptureView'));
const AnimationView = lazy(() => import('@components/views/AnimationView'));
const ErrorView = lazy(() => import('@components/views/ErrorView'));
const LoadingView = lazy(() => import('@components/views/LoadingView'));

const createAppError = (type: AppError['type'], message: string, originalError?: Error): AppError => ({
  type,
  message,
  retryable: ['network', 'api'].includes(type),
  originalError,
});


const AppRouter: React.FC = () => {
  const { ui: uiState, actions: uiActions } = useUIState();
  const { animation: animationState, actions: animationActions } = useAnimationState();
  const { image: imageStateSlice, actions: imageActions } = useImageState();

  const {
    appStatus,
    isPromptFocused,
    isCameraOpen,
    hasMultipleCameras,
  } = uiState;

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

  const [isDebouncing, setIsDebouncing] = React.useState(false);

  const debouncedCreateAnimation = useMemo(
    () => debounce(
      () => {
        setIsDebouncing(false);
        animationCallbackRef.current(false);
      },
      500,
      { leading: false, trailing: true }
    ),
    []
  );

  // Add cleanup effect
  useEffect(() => {
    return () => {
      debouncedCreateAnimation.cancel();
    };
  }, [debouncedCreateAnimation]);

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

  const processImageCapture = useCallback(async (imageDataUrl: string) => {
    try {
      // Set image state
      imageActions.setImageState({ original: imageDataUrl });
      uiActions.setIsCameraOpen(false);

      // Wait for state to settle
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Only create animation if flag is set
      if (shouldAnimateAfterCapture.current) {
        shouldAnimateAfterCapture.current = false;
        await animationCallbackRef.current();
      }
    } catch (error) {
      const appError = createAppError(
        'api',
        'Failed to process captured image',
        error as Error
      );
      uiActions.setError(appError);
      uiActions.setAppStatus(AppStatus.Error);
    }
  }, [imageActions, uiActions, handleCreateAnimation]);

  const { handleCapture } = useValidatedCapture(processImageCapture);

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
        setIsDebouncing(true);
        debouncedCreateAnimation();
    }
  }, [isCameraOpen, debouncedCreateAnimation]);

  const isAniMkrGeminiDisabled = !isCameraOpen && !imageState.original && (FEATURES.REQUIRE_IMAGE_FOR_ANIMATION || !storyPrompt.trim());

  const state = { ...ui, ...animation, ...image, typedPlaceholder };

  useKeyboardShortcuts([
    {
      key: 'Enter',
      ctrlKey: true,
      callback: handlePrimaryAction,
      disabled: isAniMkrGeminiDisabled || appStatus !== AppStatus.Capturing,
    },
    {
      key: 'Escape',
      callback: () => {
        if (isCameraOpen) {
          uiActions.setIsCameraOpen(false);
        } else if (appStatus === AppStatus.Animating) {
          handleBack();
        }
      },
    },
    {
      key: 'c',
      ctrlKey: true,
      callback: () => {
        if (appStatus === AppStatus.Capturing && !isCameraOpen) {
          uiActions.setIsCameraOpen(true);
        }
      },
      disabled: isCameraOpen,
    },
  ]);

  const AppContent = () => {
    switch (appStatus) {
      case AppStatus.Capturing:
        return (
          <LazyComponentBoundary
            skeletonType="capture"
            onError={(error) => {
              console.error('Failed to load CaptureView:', error);
              uiActions.setError(createAppError('system', 'Failed to load capture interface'));
            }}
          >
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
              isAniMkrGeminiDisabled={isAniMkrGeminiDisabled || isDebouncing}
              handlePrimaryAction={handlePrimaryAction}
              hasMultipleCameras={hasMultipleCameras}
              isCameraOpen={isCameraOpen}
              isDebouncing={isDebouncing}
              REQUIRE_IMAGE_FOR_ANIMATION={FEATURES.REQUIRE_IMAGE_FOR_ANIMATION}
              ALLOW_MULTIPLE_EMOJI_SELECTION={FEATURES.ALLOW_MULTIPLE_EMOJI_SELECTION}
            />
          </LazyComponentBoundary>
        );
      case AppStatus.Processing:
        return (
          <LazyComponentBoundary skeletonType="loading">
            <LoadingView state={state} />
          </LazyComponentBoundary>
        );
      case AppStatus.Animating:
        return (
          <LazyComponentBoundary
            skeletonType="animation"
            onError={(error) => {
              console.error('Failed to load AnimationView:', error);
              uiActions.setError(createAppError('system', 'Failed to load animation interface'));
            }}
          >
            <AnimationView
              state={state}
              actions={{ ...uiActions, ...animationActions, ...imageActions }}
              handleCreateAnimation={handleCreateAnimation}
              handleBack={handleBack}
              handlePostProcess={handlePostProcess}
              handleDetectObjects={handleDetectObjects}
            />
          </LazyComponentBoundary>
        );
      case AppStatus.Error:
        return (
          <LazyComponentBoundary skeletonType="error">
            <ErrorView
              state={state}
              handleBack={handleBack}
            />
          </LazyComponentBoundary>
        );
      default:
        return null;
    }
  }

  return <AppContent />;
};
export default AppRouter;
