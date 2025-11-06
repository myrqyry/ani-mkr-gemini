import { z } from 'zod';

export const imageDataSchema = z.string()
  .min(1, 'Image data cannot be empty')
  .startsWith('data:image/', 'Invalid image data format')
  .max(APP_CONFIG.MAX_IMAGE_SIZE, 'Image data too large'); // 10MB limit

export const animationConfigSchema = z.object({
  frameCount: z.number().int().min(1).max(60),
  postProcessStrength: z.number().min(0).max(1),
  styleIntensity: z.number().min(0).max(1),
  storyPrompt: z.string().min(1, 'Story prompt is required').max(500),
});
