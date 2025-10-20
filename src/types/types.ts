/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimationAssets, BoundingBox } from '../services/geminiService';

/**
 * The status of the app.
 * @enum {number}
 */
export enum AppStatus {
  Capturing,
  Processing,
  Animating,
  Error,
}

/**
 * A frame in an animation.
 * @interface Frame
 * @property {number} x - The x-coordinate of the frame.
 * @property {number} y - The y-coordinate of the frame.
 * @property {number} width - The width of the frame.
 * @property {number} height - The height of the frame.
 */
export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The available themes.
 * @typedef {'default' | 'rose-pine' | 'catppuccin'} Theme
 */
export type Theme = 'default' | 'rose-pine' | 'catppuccin';

/**
 * The custom themes.
 * @typedef {Partial<Record<Theme, Partial<Record<string, string>>>>} CustomThemes
 */
export type CustomThemes = Partial<Record<Theme, Partial<Record<string, string>>>>;

/**
 * The state of the image.
 * @interface ImageState
 * @property {string | null} original - The original image.
 * @property {string | null} style - The style image.
 * @property {string | null} motion - The motion image.
 */
export interface ImageState {
  original: string | null;
  style: string | null;
  motion: string | null;
}

/**
 * The state of the app.
 * @interface AppState
 * @property {AppStatus} appStatus - The status of the app.
 * @property {ImageState} imageState - The state of the image.
 * @property {number} styleIntensity - The intensity of the style.
 */
export interface AppState {
  appStatus: AppStatus;
  imageState: ImageState;
  styleIntensity: number;
  animationAssets: AnimationAssets | null;
  detectedObjects: BoundingBox[] | null;
  loadingMessage: string;
  error: string | null;
  storyPrompt: string;
  typedPlaceholder: string;
  isPromptFocused: boolean;
  frameCount: number;
  postProcessStrength: number;
  hasMultipleCameras: boolean;
  isCameraOpen: boolean;
  isExportModalOpen: boolean;
}

/**
 * The actions that can be dispatched to the app reducer.
 * @typedef {object} AppAction
 * @property {'SET_IS_EXPORT_MODAL_OPEN'} type - The type of the action.
 * @property {boolean} payload - The payload for the action.
 * @property {'SET_APP_STATUS'} type - The type of the action.
 * @property {AppStatus} payload - The payload for the action.
 * @property {'SET_IMAGE_STATE'} type - The type of the action.
 * @property {Partial<ImageState>} payload - The payload for the action.
 */
export type AppAction =
  | { type: 'SET_IS_EXPORT_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_APP_STATUS'; payload: AppStatus }
  | { type: 'SET_IMAGE_STATE'; payload: Partial<ImageState> }
  | { type: 'SET_STYLE_INTENSITY'; payload: number }
  | { type: 'SET_ANIMATION_ASSETS'; payload: AnimationAssets | null }
  | { type: 'SET_DETECTED_OBJECTS'; payload: BoundingBox[] | null }
  | { type: 'SET_LOADING_MESSAGE'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STORY_PROMPT'; payload: string }
  | { type: 'SET_TYPED_PLACEHOLDER'; payload: string }
  | { type: 'SET_IS_PROMPT_FOCUSED'; payload: boolean }
  | { type: 'SET_FRAME_COUNT'; payload: number }
  | { type: 'SET_POST_PROCESS_STRENGTH'; payload: number }
  | { type: 'SET_HAS_MULTIPLE_CAMERAS'; payload: boolean }
  | { type: 'SET_IS_CAMERA_OPEN'; payload: boolean };