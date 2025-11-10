
import { AppState, AppAction } from '@types/types';

export const animationReducer = (state: Partial<AppState>, action: AppAction): Partial<AppState> => {
  switch (action.type) {
    case 'SET_ANIMATION_ASSETS':
      return { ...state, animationAssets: action.payload };
    case 'SET_DETECTED_OBJECTS':
      return { ...state, detectedObjects: action.payload };
    case 'SET_STORY_PROMPT':
      return { ...state, storyPrompt: action.payload };
    case 'SET_FRAME_COUNT':
      return { ...state, frameCount: action.payload };
    case 'SET_POST_PROCESS_STRENGTH':
      return { ...state, postProcessStrength: action.payload };
    case 'SET_STYLE_INTENSITY':
        return { ...state, styleIntensity: action.payload };
    default:
      return state;
  }
};
