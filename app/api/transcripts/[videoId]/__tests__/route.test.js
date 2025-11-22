import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { GET } from '../route';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep(),
}));

// Mock Next.js Request
class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
  }
}

describe('GET /api/transcripts/[videoId]', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = prisma;
    mockReset(mockPrisma);
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      auth.mockResolvedValueOnce(null);

      const request = new MockRequest('http://localhost:3000/api/transcripts/video-123');
      const response = await GET(request, { params: Promise.resolve({ videoId: 'video-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no user ID', async () => {
      auth.mockResolvedValueOnce({ user: {} });

      const request = new MockRequest('http://localhost:3000/api/transcripts/video-123');
      const response = await GET(request, { params: Promise.resolve({ videoId: 'video-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 if videoId is missing', async () => {
      auth.mockResolvedValueOnce({ user: { id: 'user-123' } });

      const request = new MockRequest('http://localhost:3000/api/transcripts/');
      const response = await GET(request, { params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Video ID is required.');
    });
  });

  describe('Success Cases', () => {
    it('should return transcript with video metadata when transcript exists', async () => {
      const mockTranscript = {
        id: 'transcript-123',
        videoId: 'video-123',
        content: 'This is a test transcript.',
        segments: [
          { start: 0, end: 5, text: 'This is a test' },
          { start: 5, end: 10, text: 'transcript.' },
        ],
        language: 'en',
        confidence: 0.95,
        duration: 10,
        wordCount: 5,
        processingDuration: 2,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        video: {
          id: 'video-123',
          title: 'Test Video',
          channelTitle: 'Test Channel',
          publishedAt: new Date('2025-01-01'),
          thumbnailUrl: 'https://example.com/thumb.jpg',
        },
      };

      auth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(mockTranscript);

      const request = new MockRequest('http://localhost:3000/api/transcripts/video-123');
      const response = await GET(request, { params: Promise.resolve({ videoId: 'video-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Dates are serialized to ISO strings in JSON responses
      expect(data.id).toBe(mockTranscript.id);
      expect(data.videoId).toBe(mockTranscript.videoId);
      expect(data.content).toBe(mockTranscript.content);
      expect(data.language).toBe(mockTranscript.language);
      expect(data.confidence).toBe(mockTranscript.confidence);
      expect(data.video.id).toBe(mockTranscript.video.id);
      expect(data.video.title).toBe(mockTranscript.video.title);
      expect(mockPrisma.transcript.findUnique).toHaveBeenCalledWith({
        where: { videoId: 'video-123' },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              channelTitle: true,
              publishedAt: true,
              thumbnailUrl: true,
            },
          },
        },
      });
    });

    it('should return 404 if transcript does not exist', async () => {
      auth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(null);

      const request = new MockRequest('http://localhost:3000/api/transcripts/video-123');
      const response = await GET(request, { params: Promise.resolve({ videoId: 'video-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Transcript not found for this video.');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for database errors', async () => {
      auth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockPrisma.transcript.findUnique.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const request = new MockRequest('http://localhost:3000/api/transcripts/video-123');
      const response = await GET(request, { params: Promise.resolve({ videoId: 'video-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch transcript.');
    });
  });
});

