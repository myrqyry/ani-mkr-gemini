import { AppState, AppAction } from '@types/types';
import { uiReducer } from './uiReducer';
import { animationReducer } from './animationReducer';
import { imageReducer } from './imageReducer';

export const rootReducer = ({ ui, animation, image }: AppState, action: AppAction): AppState => ({
  ui: uiReducer(ui, action),
  animation: animationReducer(animation, action),
  image: imageReducer(image, action),
});
