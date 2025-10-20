/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimationAssets, BoundingBox } from '../services/geminiService';

export enum AppStatus {
  Capturing,
  Processing,
  Animating,
  Error,
}

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Theme = 'default' | 'rose-pine' | 'catppuccin';

export type CustomThemes = Partial<Record<Theme, Partial<Record<string, string>>>>;

export interface ImageState {
  original: string | null;
  style: string | null;
  motion: string | null;
}

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