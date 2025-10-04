/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { categorizeError, getErrorTitle, ErrorType } from './errorHandler';

describe('errorHandler', () => {
  describe('categorizeError', () => {
    it('should categorize rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.RATE_LIMIT);
      expect(result.canRetry).toBe(true);
      expect(result.suggestion).toContain('wait');
    });

    it('should categorize API errors', () => {
      const error = new Error('Invalid response from API');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.API_ERROR);
      expect(result.canRetry).toBe(true);
    });

    it('should categorize network errors', () => {
      const error = new Error('Network connection failed');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.canRetry).toBe(true);
      expect(result.suggestion).toContain('internet connection');
    });

    it('should categorize invalid input errors', () => {
      const error = new Error('Could not process the image');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.INVALID_INPUT);
      expect(result.canRetry).toBe(false);
    });

    it('should categorize processing errors', () => {
      const error = new Error('Failed to process image');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.PROCESSING_ERROR);
      expect(result.canRetry).toBe(true);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something unexpected happened');
      const result = categorizeError(error);
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.canRetry).toBe(true);
    });

    it('should handle non-Error objects', () => {
      const result = categorizeError('String error');
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('String error');
    });
  });

  describe('getErrorTitle', () => {
    it('should return correct title for rate limit error', () => {
      const errorInfo = { type: ErrorType.RATE_LIMIT, message: '', canRetry: true };
      expect(getErrorTitle(errorInfo)).toBe('Rate Limit Reached');
    });

    it('should return correct title for API error', () => {
      const errorInfo = { type: ErrorType.API_ERROR, message: '', canRetry: true };
      expect(getErrorTitle(errorInfo)).toBe('API Error');
    });

    it('should return correct title for network error', () => {
      const errorInfo = { type: ErrorType.NETWORK_ERROR, message: '', canRetry: true };
      expect(getErrorTitle(errorInfo)).toBe('Connection Error');
    });

    it('should return correct title for invalid input error', () => {
      const errorInfo = { type: ErrorType.INVALID_INPUT, message: '', canRetry: false };
      expect(getErrorTitle(errorInfo)).toBe('Invalid Input');
    });

    it('should return correct title for processing error', () => {
      const errorInfo = { type: ErrorType.PROCESSING_ERROR, message: '', canRetry: true };
      expect(getErrorTitle(errorInfo)).toBe('Processing Error');
    });

    it('should return default title for unknown error', () => {
      const errorInfo = { type: ErrorType.UNKNOWN, message: '', canRetry: true };
      expect(getErrorTitle(errorInfo)).toBe('Error');
    });
  });
});
