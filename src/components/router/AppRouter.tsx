import React, { useCallback, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { AppStatus, AppError } from '../../types/types';
import { CameraViewHandles } from '../CameraView';
import { FileUploadManagerHandles } from '../features/uploader/FileUploadManager';
import { useAnimationCreator } from '../../hooks/useAnimationCreator';
import { useObjectDetection } from '../../hooks/useObjectDetection';
import { usePostProcessing } from '../../hooks/usePostProcessing';
import { useTypingAnimation } from '../../hooks/useTypingAnimation';
import { useValidatedCapture } from '../../hooks/useValidatedCapture';
import { debounce } from 'lodash';
import { useUIState, useAnimationState, useImageState } from '../../contexts/AppStateContext';
import ViewSkeleton from '../common/ViewSkeleton';

const CaptureView = lazy(() => import('../views/CaptureView'));
const AnimationView = lazy(() => import('../views/AnimationView'));
const ErrorView = lazy(() => import('../views/ErrorView'));
const LoadingView = lazy(() => import('../views/LoadingView'));

// --- FEATURE FLAGS ---
const REQUIRE_IMAGE_FOR_ANIMATION = false;
const ALLOW_MULTIPLE_EMOJI_SELECTION = true;

const createAppError = (type: AppError['type'], message: string, originalError?: Error): AppError => ({
  type,
  message,
  retryable: ['network', 'api'].includes(type),
  originalError,
});


const AppRouter: React.FC = () => {
  const { ui, actions: uiActions } = useUIState();
  const { animation, actions: animationActions } = useAnimationState();
  const { image, actions: imageActions } = useImageState();

  const {
    appStatus,
    isPromptFocused,
    isCameraOpen,
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

  const processImageCapture = async (imageDataUrl: string) => {
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
  };

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

  const state = { ...ui, ...animation, ...image, typedPlaceholder };

  const AppContent = () => {
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
      default:
          return null;
    }
  }

  return (
    <Suspense fallback={<ViewSkeleton />}>
      <AppContent />
    </Suspense>
  );
};
export default AppRouter;
