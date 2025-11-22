/**
 * Custom error classes for TubeTime services
 */

/**
 * Error class for transcription service errors
 * Includes status code and retryable flag for error handling
 */
export class TranscriptionServiceError extends Error {
  constructor(message, { status, retryable } = {}) {
    super(message);
    this.name = 'TranscriptionServiceError';
    this.status = status;
    this.retryable = retryable ?? true;
  }
}

