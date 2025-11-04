import { AppState, AppStatus } from '../types/types';

/**
 * The initial state for the app.
 */
export const initialState: AppState = {
  appStatus: AppStatus.Capturing,
  imageState: {
    original: null,
    style: null,
    motion: null,
  },
  styleIntensity: 100,
  animationAssets: null,
  detectedObjects: null,
  loadingMessage: '',
  error: null,
  storyPrompt: '',
  typedPlaceholder: '',
  isPromptFocused: false,
  frameCount: 9,
  postProcessStrength: 0.9,
  hasMultipleCameras: false,
  isCameraOpen: false,
  isExportModalOpen: false,
  selectedAsset: null,
};
