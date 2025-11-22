import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTranscript, getTranscripts, checkTranscriptStatus } from '../transcriptService';

const originalFetch = global.fetch;

describe('transcriptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getTranscript', () => {
    it('should return transcript data on successful response', async () => {
      const mockTranscript = {
        id: 'transcript-123',
        videoId: 'video-123',
        content: 'This is a test transcript.',
        segments: [{ start: 0, end: 5, text: 'This is a test' }],
        language: 'en',
        confidence: 0.95,
        video: {
          id: 'video-123',
          title: 'Test Video',
          channelTitle: 'Test Channel',
        },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTranscript,
      });

      const result = await getTranscript('video-123');

      expect(result).toEqual(mockTranscript);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/transcripts/video-123',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return null for 404 (transcript not found)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Transcript not found' }),
      });

      const result = await getTranscript('video-123');

      expect(result).toBeNull();
    });

    it('should return null for 401 (unauthorized)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const result = await getTranscript('video-123');

      expect(result).toBeNull();
    });

    it('should throw error for other HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(getTranscript('video-123')).rejects.toThrow('Server error');
    });

    it('should throw error if videoId is missing', async () => {
      await expect(getTranscript()).rejects.toThrow('Video ID is required');
      await expect(getTranscript(null)).rejects.toThrow('Video ID is required');
      await expect(getTranscript(123)).rejects.toThrow('Video ID is required');
    });

    it('should throw error on network failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getTranscript('video-123')).rejects.toThrow('Network error');
    });
  });

  describe('getTranscripts', () => {
    it('should return transcripts list with default options', async () => {
      const mockResponse = {
        transcripts: [
          {
            id: 'transcript-1',
            videoId: 'video-1',
            content: 'Transcript 1',
            video: { id: 'video-1', title: 'Video 1' },
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await getTranscripts();

      expect(result).toEqual(mockResponse);
      // URLSearchParams may not include offset=0, so check that limit is included
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transcripts'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      // Verify limit is in the URL
      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[0]).toContain('limit=50');
    });

    it('should include query parameters when provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ transcripts: [], total: 0, limit: 10, offset: 20 }),
      });

      await getTranscripts({ language: 'es', limit: 10, offset: 20 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('language=es'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.any(Object)
      );
    });

    it('should return empty result for 401 (unauthorized)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const result = await getTranscripts();

      expect(result).toEqual({
        transcripts: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
    });

    it('should throw error for other HTTP errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(getTranscripts()).rejects.toThrow('Server error');
    });
  });

  describe('checkTranscriptStatus', () => {
    it('should return true if transcript exists', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'transcript-123', videoId: 'video-123' }),
      });

      const result = await checkTranscriptStatus('video-123');

      expect(result).toBe(true);
    });

    it('should return false if transcript does not exist (404)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      const result = await checkTranscriptStatus('video-123');

      expect(result).toBe(false);
    });

    it('should return false if user is unauthorized (401)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      const result = await checkTranscriptStatus('video-123');

      expect(result).toBe(false);
    });

    it('should return false if videoId is invalid', async () => {
      const result1 = await checkTranscriptStatus(null);
      const result2 = await checkTranscriptStatus('');
      const result3 = await checkTranscriptStatus(123);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should return false on network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkTranscriptStatus('video-123');

      expect(result).toBe(false);
    });
  });
});

