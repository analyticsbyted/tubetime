import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST } from '../route';

// Mock Next.js Request
class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this._body = options.body;
  }

  async json() {
    return JSON.parse(this._body || '{}');
  }
}

// Mock environment variable
const originalEnv = process.env;

describe('POST /api/youtube/search', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    // Set up environment
    process.env = {
      ...originalEnv,
      YOUTUBE_API_KEY: 'test-api-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('API Key Validation', () => {
    it('should return 500 error if API key is not configured', async () => {
      delete process.env.YOUTUBE_API_KEY;

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('API key is not configured');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 error if neither query nor channelName is provided', async () => {
      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Either a search query or channel name must be provided');
    });

    it('should accept empty query if channelName is provided', async () => {
      // Mock fetch for YouTube API
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [],
            pageInfo: { totalResults: 0 },
          }),
        });

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          channelName: 'Test Channel',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
    });
  });

  describe('Successful Search', () => {
    it('should return search results successfully', async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { videoId: 'video-1' },
            snippet: {
              title: 'Test Video 1',
              channelTitle: 'Test Channel',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: { high: { url: 'https://example.com/thumb.jpg' } },
            },
          },
        ],
        nextPageToken: 'next-token',
        pageInfo: { totalResults: 1 },
      };

      const mockVideoDetailsResponse = {
        items: [
          {
            id: 'video-1',
            statistics: {
              viewCount: '1000',
              likeCount: '50',
              commentCount: '10',
            },
            contentDetails: {
              duration: 'PT4M13S',
            },
            snippet: {
              categoryId: '22',
            },
          },
        ],
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockVideoDetailsResponse,
        });

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test',
          maxResults: 20,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toMatchObject({
        id: 'video-1',
        title: 'Test Video 1',
        channelTitle: 'Test Channel',
        viewCount: 1000,
        likeCount: 50,
        commentCount: 10,
      });
      expect(data.nextPageToken).toBe('next-token');
      expect(data.totalResults).toBe(1);
    });

    it('should handle pagination with pageToken', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [],
            pageInfo: { totalResults: 0 },
          }),
        });

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test',
          pageToken: 'token-123',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('pageToken=token-123')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle YouTube API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            message: 'API key not valid',
          },
        }),
      });

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('API key not valid');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeTruthy();
    });

    it('should return empty results if search returns no items', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pageInfo: { totalResults: 0 },
        }),
      });

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'nonexistent query that returns no results',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
      expect(data.totalResults).toBe(0);
    });
  });

  describe('Channel Filtering', () => {
    it('should filter results by channel name', async () => {
      const mockSearchResponse = {
        items: [
          {
            id: { videoId: 'video-1' },
            snippet: {
              title: 'Video 1',
              channelTitle: 'Target Channel',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: { high: { url: 'https://example.com/thumb.jpg' } },
            },
          },
          {
            id: { videoId: 'video-2' },
            snippet: {
              title: 'Video 2',
              channelTitle: 'Other Channel',
              publishedAt: '2024-01-01T00:00:00Z',
              thumbnails: { high: { url: 'https://example.com/thumb2.jpg' } },
            },
          },
        ],
        pageInfo: { totalResults: 2 },
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              { id: 'video-1', statistics: {}, contentDetails: {}, snippet: {} },
              { id: 'video-2', statistics: {}, contentDetails: {}, snippet: {} },
            ],
          }),
        });

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test',
          channelName: 'Target Channel',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].channelTitle).toBe('Target Channel');
    });
  });

  describe('Date Filtering', () => {
    it('should include date filters in API request', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          pageInfo: { totalResults: 0 },
        }),
      });

      const request = new MockRequest('http://localhost:3000/api/youtube/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'test',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('publishedAfter=2024-01-01T00%3A00%3A00Z')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('publishedBefore=2024-01-31T23%3A59%3A59Z')
      );
    });
  });
});

