
import { AppState, AppAction } from '@types/types';

export const imageReducer = (state: Partial<AppState>, action: AppAction): Partial<AppState> => {
  switch (action.type) {
    case 'SET_IMAGE_STATE':
      return { ...state, imageState: { ...state.imageState, ...action.payload } };
    case 'SET_SELECTED_ASSET':
      return { ...state, selectedAsset: action.payload };
    default:
      return state;
  }
};
