// src/config/features.ts
export const FEATURES = {
  REQUIRE_IMAGE_FOR_ANIMATION: import.meta.env.VITE_REQUIRE_IMAGE === 'true',
  ALLOW_MULTIPLE_EMOJI_SELECTION: import.meta.env.VITE_MULTIPLE_EMOJI !== 'false',
  ENABLE_OBJECT_DETECTION: import.meta.env.VITE_OBJECT_DETECTION !== 'false',
  ENABLE_STYLE_TRANSFER: import.meta.env.VITE_STYLE_TRANSFER !== 'false',
  MAX_FRAME_COUNT: parseInt(import.meta.env.VITE_MAX_FRAMES || '16', 10),
  DEFAULT_FRAME_COUNT: parseInt(import.meta.env.VITE_DEFAULT_FRAMES || '8', 10),
} as const;

// Create a feature flag hook
export const useFeatureFlag = (flag: keyof typeof FEATURES) => {
  return FEATURES[flag];
};
