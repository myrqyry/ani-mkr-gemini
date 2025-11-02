import React from 'react';
import { AppState, AppStatus } from 'src/types/types';
import { promptSuggestions } from 'prompts';
import { FRAME_COUNTS } from 'src/constants/app';
import { UploadIcon, XCircleIcon, CameraIcon, LinkIcon, SwitchCameraIcon } from 'src/components/icons';
import AniMkrGeminiButton from 'src/components/AniMkrGeminiButton';
import FileUploadManager, { FileUploadManagerHandles } from 'src/components/features/uploader/FileUploadManager';
import AssetManager from 'src/components/features/uploader/AssetManager';
import CameraView, { CameraViewHandles } from 'src/components/CameraView';
import { categorizeError, getErrorTitle } from 'src/utils/errorHandler';

interface CaptureViewProps {
  state: AppState;
  dispatch: React.Dispatch<any>;
  handleSuggestionClick: (prompt: string) => void;
  handleCreateAnimation: (isRegeneration?: boolean) => Promise<void>;
  handleCapture: (imageDataUrl: string) => void;
  handleClearImage: () => void;
  handleFlipCamera: () => void;
  fileUploadManagerRef: React.RefObject<FileUploadManagerHandles>;
  cameraViewRef: React.RefObject<CameraViewHandles>;
  storyPromptTextareaRef: React.RefObject<HTMLTextAreaElement>;
  isAniMkrGeminiDisabled: boolean;
  handlePrimaryAction: () => void;
  hasMultipleCameras: boolean;
  isCameraOpen: boolean;
  REQUIRE_IMAGE_FOR_ANIMATION: boolean;
  ALLOW_MULTIPLE_EMOJI_SELECTION: boolean;
}

const CONTAINER_CLASSES = "flex flex-col items-center justify-center w-full max-w-md mx-auto";

const CaptureView: React.FC<CaptureViewProps> = ({
  state,
  dispatch,
  handleSuggestionClick,
  handleCreateAnimation,
  handleCapture,
  handleClearImage,
  handleFlipCamera,
  fileUploadManagerRef,
  cameraViewRef,
  storyPromptTextareaRef,
  isAniMkrGeminiDisabled,
  handlePrimaryAction,
  hasMultipleCameras,
  isCameraOpen,
  REQUIRE_IMAGE_FOR_ANIMATION,
  ALLOW_MULTIPLE_EMOJI_SELECTION,
}) => {
  const {
    storyPrompt,
    frameCount,
    imageState,
    isPromptFocused,
    typedPlaceholder,
    error,
    styleIntensity,
  } = state;

  return (
    <div className={CONTAINER_CLASSES}>
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
                className={`text-3xl p-2 rounded-full transform transition-colors transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:ring-[var(--color-accent)] ${isActive ? 'bg-[var(--color-accent)] scale-110' : 'hover:bg-[var(--color-overlay)] hover:scale-110'}`}
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
            className={`px-4 py-1 rounded-md text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:ring-[var(--color-accent)] ${frameCount === count
                ? 'bg-[var(--color-accent)] text-white scale-105'
                : 'bg-[var(--color-button)] text-[var(--color-text-muted)] hover:bg-[var(--color-button-hover)] hover:scale-105'
              }`}
          >
            {count} Frames
          </button>
        ))}
      </div>
      <div className="w-full mb-2 relative">
        {!storyPrompt && !isPromptFocused && (
          <div data-testid="placeholder-text" className="absolute top-0 left-0 px-4 py-3 text-[var(--color-text-muted)] text-lg pointer-events-none" aria-hidden="true">
            What would you like to <span className="text-[var(--color-warning)]">create</span>?<br />
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
            dispatch({ type: 'SET_IS_PROMPT_FOCUSED', payload: false });
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
      <AssetManager onAssetSelect={(asset) => dispatch({ type: 'SET_SELECTED_ASSET', payload: asset })} />
      {error && (() => {
        const errorInfo = categorizeError(error);
        const errorTitle = getErrorTitle(errorInfo);
        return (
          <div className="w-full bg-[var(--color-danger-surface)] border border-[var(--color-danger)] text-[var(--color-danger-text)] px-4 py-3 rounded-lg relative mb-4 animate-fade-in" role="alert">
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
                  className="bg-[var(--color-accent)] text-white font-semibold py-2 px-4 rounded hover:bg-[var(--color-accent-hover)] transition-colors transition-transform duration-300 text-sm transform hover:scale-105"
                >
                  Try Again
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                  className="bg-[var(--color-surface)] text-[var(--color-text-base)] font-semibold py-2 px-4 rounded hover:bg-[var(--color-surface-hover)] transition-colors transition-transform duration-300 text-sm border border-[var(--color-border)] transform hover:scale-105"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        );
      })()}

      <div
        className="relative w-full [@media(max-height:750px)]:w-96 [@media(max-height:650px)]:w-72 aspect-square bg-[var(--color-surface)] rounded-lg overflow-hidden shadow-2xl flex items-center justify-center"
        onDragEnter={(e) => fileUploadManagerRef.current?.handleDragEnter(e)}
        onDragLeave={(e) => fileUploadManagerRef.current?.handleDragLeave(e)}
        onDragOver={(e) => fileUploadManagerRef.current?.handleDragOver(e)}
        onDrop={(e) => fileUploadManagerRef.current?.handleMainDrop(e)}
      >
        {imageState.original ? (
          <>
            <img src={imageState.original} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={handleClearImage}
              className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors transition-transform duration-200 transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
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
              className="absolute top-4 left-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors transition-transform duration-200 transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
              aria-label="Close camera"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
            {hasMultipleCameras && (
              <button
                onClick={handleFlipCamera}
                className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-black/75 transition-colors transition-transform duration-200 transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)]"
                aria-label="Flip camera"
              >
                <SwitchCameraIcon className="w-6 h-6" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full pb-32">
            <p className="mb-4 text-[var(--color-text-muted)] text-lg">
              {REQUIRE_IMAGE_FOR_ANIMATION ? 'Add an image to start' : 'Optionally, add an image to start'}
            </p>
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => dispatch({ type: 'SET_IS_CAMERA_OPEN', payload: true })}
                className="w-52 bg-[var(--color-accent)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors transition-transform duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)] transform hover:scale-105"
                aria-label="Use camera to take a photo"
              >
                <CameraIcon className="w-6 h-6 mr-3" />
                Open Camera
              </button>
              <button
                onClick={() => fileUploadManagerRef.current?.handleUploadClick()}
                className="w-52 bg-[var(--color-button)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-button-hover)] transition-colors transition-transform duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)] transform hover:scale-105"
                aria-label="Upload an image from your device"
              >
                <UploadIcon className="w-6 h-6 mr-3" />
                Upload Image
              </button>
              <button
                onClick={() => fileUploadManagerRef.current?.handlePasteUrl('main')}
                className="w-52 bg-[var(--color-button)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--color-button-hover)] transition-colors transition-transform duration-300 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)] transform hover:scale-105"
                aria-label="Paste an image URL"
              >
                <LinkIcon className="w-6 h-6 mr-3" />
                Paste URL
              </button>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <AniMkrGeminiButton
            onClick={handlePrimaryAction}
            disabled={isAniMkrGeminiDisabled}
            aria-label={isCameraOpen ? 'Capture and Animate' : 'Create Animation'}
          />
        </div>
      </div>
    </div>
  );
};

export default CaptureView;