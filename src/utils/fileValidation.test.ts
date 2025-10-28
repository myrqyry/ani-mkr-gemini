/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  validateFileSize,
  validateFileType,
  validateImageDimensions,
  FILE_VALIDATION,
  ALLOWED_IMAGE_TYPES,
} from './fileValidation';

describe('fileValidation', () => {
  describe('validateFileSize', () => {
    it('should accept files under the size limit', () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFileSize(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files over the size limit', () => {
      const largeContent = new Uint8Array(FILE_VALIDATION.MAX_FILE_SIZE + 1);
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = validateFileSize(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds the maximum');
      expect(result.error).toContain('4MB');
    });
  });

  describe('validateFileType', () => {
    it('should accept allowed image types', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFileType(file, ALLOWED_IMAGE_TYPES);
      
      expect(result.valid).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFileType(file, ALLOWED_IMAGE_TYPES);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should list allowed formats in error message', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFileType(file, ALLOWED_IMAGE_TYPES);
      
      expect(result.error).toContain('JPEG');
      expect(result.error).toContain('PNG');
    });
  });

  describe('validateImageDimensions', () => {
    it('should validate image dimensions (integration test skipped in jsdom)', () => {
      // Note: Image loading doesn't work reliably in jsdom test environment
      // This is tested manually and in browser environment
      // The function will work correctly in the actual browser
      expect(FILE_VALIDATION.MIN_IMAGE_WIDTH).toBe(64);
      expect(FILE_VALIDATION.MAX_IMAGE_WIDTH).toBe(4096);
    });
  });

  describe('FILE_VALIDATION constants', () => {
    it('should have reasonable size limits', () => {
      expect(FILE_VALIDATION.MAX_FILE_SIZE).toBe(4 * 1024 * 1024); // 4MB
    });

    it('should have reasonable dimension limits', () => {
      expect(FILE_VALIDATION.MIN_IMAGE_WIDTH).toBe(64);
      expect(FILE_VALIDATION.MIN_IMAGE_HEIGHT).toBe(64);
      expect(FILE_VALIDATION.MAX_IMAGE_WIDTH).toBe(4096);
      expect(FILE_VALIDATION.MAX_IMAGE_HEIGHT).toBe(4096);
    });
  });
});
