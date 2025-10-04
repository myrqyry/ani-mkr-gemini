/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ErrorType {
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_INPUT = 'INVALID_INPUT',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  canRetry: boolean;
  suggestion?: string;
}

/**
 * Categorizes an error and provides helpful information
 */
export function categorizeError(error: unknown): ErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Check for rate limit errors
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('quota') || lowerMessage.includes('429')) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: 'API rate limit exceeded',
      canRetry: true,
      suggestion: 'Please wait a moment before trying again. The API has usage limits.',
    };
  }

  // Check for API errors
  if (lowerMessage.includes('api') || lowerMessage.includes('invalid response') || lowerMessage.includes('no parts found')) {
    return {
      type: ErrorType.API_ERROR,
      message: 'API request failed',
      canRetry: true,
      suggestion: 'There was a problem communicating with the API. Please try again.',
    };
  }

  // Check for network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network connection error',
      canRetry: true,
      suggestion: 'Please check your internet connection and try again.',
    };
  }

  // Check for invalid input errors
  if (lowerMessage.includes('invalid') || lowerMessage.includes('could not process') || lowerMessage.includes('failed to read')) {
    return {
      type: ErrorType.INVALID_INPUT,
      message: 'Invalid input',
      canRetry: false,
      suggestion: 'Please try using a different image or prompt.',
    };
  }

  // Check for processing errors
  if (lowerMessage.includes('failed to process') || lowerMessage.includes('failed to detect') || lowerMessage.includes('failed to analyze')) {
    return {
      type: ErrorType.PROCESSING_ERROR,
      message: 'Processing failed',
      canRetry: true,
      suggestion: 'The processing step failed. Please try again with a different image or prompt.',
    };
  }

  // Default to unknown
  return {
    type: ErrorType.UNKNOWN,
    message: errorMessage,
    canRetry: true,
    suggestion: 'An unexpected error occurred. Please try again.',
  };
}

/**
 * Gets a user-friendly title for an error type
 */
export function getErrorTitle(errorInfo: ErrorInfo): string {
  switch (errorInfo.type) {
    case ErrorType.RATE_LIMIT:
      return 'Rate Limit Reached';
    case ErrorType.API_ERROR:
      return 'API Error';
    case ErrorType.NETWORK_ERROR:
      return 'Connection Error';
    case ErrorType.INVALID_INPUT:
      return 'Invalid Input';
    case ErrorType.PROCESSING_ERROR:
      return 'Processing Error';
    default:
      return 'Error';
  }
}
