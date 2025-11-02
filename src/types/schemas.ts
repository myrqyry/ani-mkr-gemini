import { z } from 'zod';

export const GenerateAnimationRequestSchema = z.object({
  imageData: z.string().optional(),
  prompt: z.string().min(1).max(5000),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']).optional(),
  fileUri: z.string().url().optional(),
  frameCount: z.number().int().min(1).max(20).default(8),
  temperature: z.number().min(0).max(2).default(1),
});

export const GenerateAnimationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    spriteSheet: z.string(),
    frames: z.array(z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })),
    metadata: z.object({
      totalFrames: z.number(),
      duration: z.number(),
    }),
  }).optional(),
  error: z.object({
    message: z.string(),
    code: z.string(),
    retryable: z.boolean(),
  }).optional(),
});

export type GenerateAnimationRequest = z.infer<typeof GenerateAnimationRequestSchema>;
export type GenerateAnimationResponse = z.infer<typeof GenerateAnimationResponseSchema>;