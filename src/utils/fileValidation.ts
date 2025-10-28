/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const FILE_VALIDATION = {
  MAX_FILE_SIZE: 4 * 1024 * 1024, // 4MB
  MAX_IMAGE_WIDTH: 4096,
  MAX_IMAGE_HEIGHT: 4096,
  MIN_IMAGE_WIDTH: 64,
  MIN_IMAGE_HEIGHT: 64,
} as const;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const ALLOWED_MOTION_TYPES = ['image/gif', 'image/webp', 'image/avif'] as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file size
 */
export function validateFileSize(file: File): ValidationResult {
  if (file.size > FILE_VALIDATION.MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (FILE_VALIDATION.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds the maximum allowed size of ${maxSizeMB}MB. Please use a smaller file.`,
    };
  }
  return { valid: true };
}

/**
 * Validates file type
 */
export function validateFileType(file: File, allowedTypes: readonly string[]): ValidationResult {
  if (!allowedTypes.includes(file.type)) {
    const formats = allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ');
    return {
      valid: false,
      error: `File type "${file.type}" is not supported. Please use one of: ${formats}.`,
    };
  }
  return { valid: true };
}

/**
 * Validates image dimensions
 */
export async function validateImageDimensions(dataUrl: string): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      
      if (width < FILE_VALIDATION.MIN_IMAGE_WIDTH || height < FILE_VALIDATION.MIN_IMAGE_HEIGHT) {
        resolve({
          valid: false,
          error: `Image dimensions (${width}x${height}) are too small. Minimum size is ${FILE_VALIDATION.MIN_IMAGE_WIDTH}x${FILE_VALIDATION.MIN_IMAGE_HEIGHT} pixels.`,
        });
        return;
      }
      
      if (width > FILE_VALIDATION.MAX_IMAGE_WIDTH || height > FILE_VALIDATION.MAX_IMAGE_HEIGHT) {
        resolve({
          valid: false,
          error: `Image dimensions (${width}x${height}) are too large. Maximum size is ${FILE_VALIDATION.MAX_IMAGE_WIDTH}x${FILE_VALIDATION.MAX_IMAGE_HEIGHT} pixels.`,
        });
        return;
      }
      
      resolve({ valid: true });
    };
    
    img.onerror = () => {
      resolve({
        valid: false,
        error: 'Failed to load image for dimension validation.',
      });
    };
    
    img.src = dataUrl;
  });
}

/**
 * Performs complete file validation for images
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
  // Check file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) {
    return sizeResult;
  }
  
  // Check file type
  const typeResult = validateFileType(file, ALLOWED_IMAGE_TYPES);
  if (!typeResult.valid) {
    return typeResult;
  }
  
  return { valid: true };
}

/**
 * Performs complete file validation for motion files
 */
export async function validateMotionFile(file: File): Promise<ValidationResult> {
  // Check file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.valid) {
    return sizeResult;
  }
  
  // Check file type
  const typeResult = validateFileType(file, ALLOWED_MOTION_TYPES);
  if (!typeResult.valid) {
    return typeResult;
  }
  
  return { valid: true };
}
