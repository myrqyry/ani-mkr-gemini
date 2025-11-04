
import { AppState, AppAction, AppStatus } from '../types/types';

export const uiReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_APP_STATUS':
      return { ...state, appStatus: action.payload };
    case 'SET_LOADING_MESSAGE':
      return { ...state, loadingMessage: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_IS_PROMPT_FOCUSED':
      return { ...state, isPromptFocused: action.payload };
    case 'SET_IS_CAMERA_OPEN':
      return { ...state, isCameraOpen: action.payload };
    case 'SET_IS_EXPORT_MODAL_OPEN':
      return { ...state, isExportModalOpen: action.payload };
    case 'SET_HAS_MULTIPLE_CAMERAS':
        return { ...state, hasMultipleCameras: action.payload };
    case 'SET_TYPED_PLACEHOLDER':
        return { ...state, typedPlaceholder: action.payload };
    default:
      return state;
  }
};
