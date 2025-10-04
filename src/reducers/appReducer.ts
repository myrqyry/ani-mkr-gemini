import { AppState, AppAction, AppStatus } from '@/src/types/types';

export const initialState: AppState = {
  appStatus: AppStatus.Capturing,
  imageState: {
    original: null,
    style: null,
    motion: null,
  },
  styleIntensity: 0.7,
  animationQuality: 'balanced',
  animationAssets: null,
  animationHistory: [],
  currentSequenceId: null,
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
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_APP_STATUS':
      return { ...state, appStatus: action.payload };
    case 'SET_IMAGE_STATE':
      return { ...state, imageState: { ...state.imageState, ...action.payload } };
    case 'SET_STYLE_INTENSITY':
      return { ...state, styleIntensity: action.payload };
    case 'SET_ANIMATION_ASSETS':
      return { ...state, animationAssets: action.payload };
    case 'SET_DETECTED_OBJECTS':
      return { ...state, detectedObjects: action.payload };
    case 'SET_LOADING_MESSAGE':
      return { ...state, loadingMessage: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_STORY_PROMPT':
      return { ...state, storyPrompt: action.payload };
    case 'SET_TYPED_PLACEHOLDER':
      return { ...state, typedPlaceholder: action.payload };
    case 'SET_IS_PROMPT_FOCUSED':
      return { ...state, isPromptFocused: action.payload };
    case 'SET_FRAME_COUNT':
      return { ...state, frameCount: action.payload };
    case 'SET_POST_PROCESS_STRENGTH':
      return { ...state, postProcessStrength: action.payload };
    case 'SET_HAS_MULTIPLE_CAMERAS':
      return { ...state, hasMultipleCameras: action.payload };
    case 'SET_IS_CAMERA_OPEN':
      return { ...state, isCameraOpen: action.payload };
    case 'SET_ANIMATION_QUALITY':
      return { ...state, animationQuality: action.payload };
    case 'SET_ANIMATION_HISTORY':
      return { ...state, animationHistory: action.payload };
    case 'SET_CURRENT_SEQUENCE_ID':
      return { ...state, currentSequenceId: action.payload };
    default:
      return state;
  }
};