import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Set up environment variables for tests that need them
// This ensures they're available before any modules are imported
if (!process.env.TRANSCRIPTION_WORKER_URL) {
  process.env.TRANSCRIPTION_WORKER_URL = 'https://test-worker.example.com';
}
if (!process.env.TRANSCRIPTION_WORKER_SECRET) {
  process.env.TRANSCRIPTION_WORKER_SECRET = 'test-secret-key';
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

