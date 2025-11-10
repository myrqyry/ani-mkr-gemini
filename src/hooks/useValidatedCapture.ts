import { useCallback } from 'react';
import { z } from 'zod';
import { imageDataSchema } from '@schemas/validation';
import { AppError } from '@types/types';

const createAppError = (type: AppError['type'], message: string, originalError?: Error): AppError => ({
    type,
    message,
    retryable: ['network', 'api'].includes(type),
    originalError,
});

export const useValidatedCapture = (
    processImageCapture: (imageData: string) => Promise<void>
) => {
  const handleCapture = useCallback(async (imageDataUrl: string) => {
    try {
      const validatedImageData = imageDataSchema.parse(imageDataUrl);
      await processImageCapture(validatedImageData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createAppError('validation', error.errors[0].message);
      }
      throw error;
    }
  }, [processImageCapture]);

  return { handleCapture };
};
