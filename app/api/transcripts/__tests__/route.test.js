import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
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

describe('GET /api/transcripts', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = prisma;
    mockReset(mockPrisma);
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      auth.mockResolvedValueOnce(null);

      const request = new MockRequest('http://localhost:3000/api/transcripts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Success Cases', () => {
    it('should return list of transcripts with default pagination', async () => {
      const mockTranscripts = [
        {
          id: 'transcript-1',
          videoId: 'video-1',
          content: 'Transcript 1',
          wordCount: 100,
          language: 'en',
          createdAt: new Date('2025-01-01'),
          video: {
            id: 'video-1',
            title: 'Video 1',
            channelTitle: 'Channel 1',
            publishedAt: new Date('2025-01-01'),
            thumbnailUrl: 'https://example.com/thumb1.jpg',
          },
        },
        {
          id: 'transcript-2',
          videoId: 'video-2',
          content: 'Transcript 2',
          wordCount: 200,
          language: 'en',
          createdAt: new Date('2025-01-02'),
          video: {
            id: 'video-2',
            title: 'Video 2',
            channelTitle: 'Channel 2',
            publishedAt: new Date('2025-01-02'),
            thumbnailUrl: 'https://example.com/thumb2.jpg',
          },
        },
      ];

      auth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockPrisma.transcript.findMany.mockResolvedValueOnce(mockTranscripts);
      mockPrisma.transcript.count.mockResolvedValueOnce(2);

      const request = new MockRequest('http://localhost:3000/api/transcripts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Dates are serialized to ISO strings in JSON responses
      expect(data.transcripts).toHaveLength(2);
      expect(data.transcripts[0].id).toBe(mockTranscripts[0].id);
      expect(data.transcripts[0].videoId).toBe(mockTranscripts[0].videoId);
      expect(data.transcripts[0].content).toBe(mockTranscripts[0].content);
      expect(data.transcripts[0].video.title).toBe(mockTranscripts[0].video.title);
      expect(data.total).toBe(2);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it('should filter by language when language query param is provided', async () => {
      const mockTranscripts = [
        {
          id: 'transcript-1',
          videoId: 'video-1',
          content: 'Spanish transcript',
          language: 'es',
          video: {
            id: 'video-1',
            title: 'Video 1',
            channelTitle: 'Channel 1',
            publishedAt: new Date('2025-01-01'),
            thumbnailUrl: 'https://example.com/thumb1.jpg',
          },
        },
      ];

      auth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockPrisma.transcript.findMany.mockResolvedValueOnce(mockTranscripts);
      mockPrisma.transcript.count.mockResolvedValueOnce(1);

      const request = new MockRequest('http://localhost:3000/api/transcripts?language=es');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transcripts).toHaveLength(1);
      expect(data.transcripts[0].language).toBe('es');
      expect(mockPrisma.transcript.findMany).toHaveBeenCalledWith({
        where: { language: 'es' },
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
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should handle pagination with limit and offset', async () => {
      auth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockPrisma.transcript.findMany.mockResolvedValueOnce([]);
      mockPrisma.transcript.count.mockResolvedValueOnce(100);

      const request = new MockRequest('http://localhost:3000/api/transcripts?limit=10&offset=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
      expect(mockPrisma.transcript.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for database errors', async () => {
      auth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockPrisma.transcript.findMany.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const request = new MockRequest('http://localhost:3000/api/transcripts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch transcripts.');
    });
  });
});

