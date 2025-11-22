import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { POST, GET } from '../route';
import {
  transcribeVideo,
  getWorkerHealth,
  TranscriptionServiceError,
} from '@/services/transcriptionService';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep(),
}));

// Mock transcription service
vi.mock('@/services/transcriptionService', () => ({
  transcribeVideo: vi.fn(),
  getWorkerHealth: vi.fn(),
  TranscriptionServiceError: class TranscriptionServiceError extends Error {
    constructor(message, { status, retryable } = {}) {
      super(message);
      this.name = 'TranscriptionServiceError';
      this.status = status;
      this.retryable = retryable ?? true;
    }
  },
}));

// Mock Next.js Request
class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this._body = options.body;
    this._headers = new Map(options.headers || []);
  }

  async json() {
    return JSON.parse(this._body || '{}');
  }

  headers = {
    get: (name) => this._headers.get(name?.toLowerCase()),
  };
}

// Mock environment variables
const originalEnv = process.env;

describe('POST /api/transcription-worker', () => {
  let mockPrisma;

  beforeEach(() => {
    // Set up environment variables
    process.env = {
      ...originalEnv,
      TRANSCRIPTION_WORKER_SECRET: 'test-secret-key',
    };

    // Get the mocked Prisma instance
    mockPrisma = prisma;
    mockReset(mockPrisma);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Security', () => {
    it('should reject request with missing secret', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject request with invalid secret in Authorization header', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: [['authorization', 'Bearer wrong-secret']],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject request with invalid secret in body', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'wrong-secret' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject request with invalid secret in query parameter', async () => {
      const request = new MockRequest(
        'http://localhost:3000/api/transcription-worker?secret=wrong-secret',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept request with valid secret in Authorization header', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: [['authorization', 'Bearer test-secret-key']],
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([]);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(0);
    });

    it('should accept request with valid secret in body', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key' }),
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([]);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(0);
    });

    it('should accept request with valid secret in query parameter', async () => {
      const request = new MockRequest(
        'http://localhost:3000/api/transcription-worker?secret=test-secret-key',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([]);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(0);
    });
  });

  describe('Happy Path', () => {
    it('should process pending queue item and move it to completed', async () => {
      const mockQueueItem = {
        id: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        retryCount: 0,
        processingStartedAt: null,
        video: {
          id: 'video-123',
          title: 'Test Video',
          channelTitle: 'Test Channel',
          publishedAt: new Date(),
          thumbnailUrl: 'https://example.com/thumb.jpg',
        },
      };

      const mockTranscriptData = {
        text: 'This is a test transcript.',
        segments: [{ start: 0, end: 5, text: 'This is a test' }],
        language: 'en',
        confidence: 0.95,
        duration: 10,
        wordCount: 5,
        processingDuration: 2,
      };

      const mockTranscriptRecord = {
        id: 'transcript-1',
        videoId: 'video-123',
        content: 'This is a test transcript.',
      };

      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key' }),
      });

      // Mock: Fetch queue items
      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([mockQueueItem]);

      // Mock: Check for existing transcript (none exists)
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(null);

      // Mock: Update queue item to processing
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce(mockQueueItem);

      // Mock: Transcription service returns data
      transcribeVideo.mockResolvedValueOnce(mockTranscriptData);

      // Mock: Create transcript record
      mockPrisma.transcript.create.mockResolvedValueOnce(mockTranscriptRecord);

      // Mock: Mark queue item as completed
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce({
        ...mockQueueItem,
        status: 'completed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);
      expect(data.completed).toBe(1);
      expect(data.failed).toBe(0);
      expect(data.results).toHaveLength(1);
      expect(data.results[0]).toMatchObject({
        queueItemId: 'queue-item-1',
        videoId: 'video-123',
        status: 'completed',
        transcriptId: 'transcript-1',
      });

      // Verify transcript was created with correct data
      expect(mockPrisma.transcript.create).toHaveBeenCalledWith({
        data: {
          videoId: 'video-123',
          content: 'This is a test transcript.',
          segments: [{ start: 0, end: 5, text: 'This is a test' }],
          language: 'en',
          confidence: 0.95,
          duration: 10,
          wordCount: 5,
          processingDuration: 2,
        },
      });

      // Verify queue item was marked as completed
      expect(mockPrisma.transcriptionQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-item-1' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
          errorMessage: null,
        },
      });
    });
  });

  describe('Caching Logic', () => {
    it('should immediately complete queue item if transcript already exists', async () => {
      const mockQueueItem = {
        id: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        retryCount: 0,
        processingStartedAt: null,
        video: {
          id: 'video-123',
          title: 'Test Video',
        },
      };

      const mockExistingTranscript = {
        id: 'transcript-1',
        videoId: 'video-123',
        content: 'Existing transcript',
      };

      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key' }),
      });

      // Mock: Fetch queue items
      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([mockQueueItem]);

      // Mock: Check for existing transcript (exists!)
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(mockExistingTranscript);

      // Mock: Mark queue item as completed (cached)
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce({
        ...mockQueueItem,
        status: 'completed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);
      expect(data.completed).toBe(1);
      expect(data.results[0]).toMatchObject({
        queueItemId: 'queue-item-1',
        videoId: 'video-123',
        status: 'cached',
        transcriptId: 'transcript-1',
      });

      // Verify transcription service was NOT called
      expect(transcribeVideo).not.toHaveBeenCalled();

      // Verify transcript was NOT created
      expect(mockPrisma.transcript.create).not.toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should move job back to pending and increment retryCount on retryable error (first retry)', async () => {
      const mockQueueItem = {
        id: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        retryCount: 0,
        processingStartedAt: null,
        video: {
          id: 'video-123',
          title: 'Test Video',
        },
      };

      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key' }),
      });

      // Mock: Fetch queue items
      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([mockQueueItem]);

      // Mock: Check for existing transcript (none)
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(null);

      // Mock: Update queue item to processing
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce(mockQueueItem);

      // Mock: Transcription service throws retryable error
      const retryableError = new TranscriptionServiceError('Server error', {
        status: 500,
        retryable: true,
      });
      transcribeVideo.mockRejectedValueOnce(retryableError);

      // Mock: Update queue item back to pending with incremented retryCount
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce({
        ...mockQueueItem,
        status: 'pending',
        retryCount: 1,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);
      expect(data.completed).toBe(0);
      expect(data.failed).toBe(0);
      expect(data.results[0]).toMatchObject({
        queueItemId: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        error: 'Server error',
        retryable: true,
      });

      // Verify queue item was updated with retry count
      expect(mockPrisma.transcriptionQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-item-1' },
        data: {
          status: 'pending',
          retryCount: 1,
          errorMessage: 'Server error',
          processingStartedAt: null,
        },
      });
    });

    it('should move job back to pending and increment retryCount on retryable error (second retry)', async () => {
      const mockQueueItem = {
        id: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        retryCount: 1,
        processingStartedAt: null,
        video: {
          id: 'video-123',
          title: 'Test Video',
        },
      };

      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key' }),
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([mockQueueItem]);
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(null);
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce(mockQueueItem);

      const retryableError = new TranscriptionServiceError('Server error', {
        status: 500,
        retryable: true,
      });
      transcribeVideo.mockRejectedValueOnce(retryableError);

      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce({
        ...mockQueueItem,
        status: 'pending',
        retryCount: 2,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].status).toBe('pending');
      expect(data.results[0].retryable).toBe(true);

      // Verify retryCount was incremented to 2
      expect(mockPrisma.transcriptionQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-item-1' },
        data: expect.objectContaining({
          retryCount: 2,
        }),
      });
    });
  });

  describe('Failure Logic', () => {
    it('should move job to failed state after exhausting three retries', async () => {
      const mockQueueItem = {
        id: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        retryCount: 2, // Already retried twice
        processingStartedAt: null,
        video: {
          id: 'video-123',
          title: 'Test Video',
        },
      };

      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key' }),
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([mockQueueItem]);
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(null);
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce(mockQueueItem);

      const retryableError = new TranscriptionServiceError('Server error', {
        status: 500,
        retryable: true,
      });
      transcribeVideo.mockRejectedValueOnce(retryableError);

      // Mock: Update queue item to failed (exhausted retries)
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce({
        ...mockQueueItem,
        status: 'failed',
        retryCount: 3,
        completedAt: expect.any(Date),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);
      expect(data.completed).toBe(0);
      expect(data.failed).toBe(1);
      expect(data.results[0]).toMatchObject({
        queueItemId: 'queue-item-1',
        videoId: 'video-123',
        status: 'failed',
        error: 'Server error',
        retryable: true,
      });

      // Verify queue item was moved to failed state
      expect(mockPrisma.transcriptionQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-item-1' },
        data: {
          status: 'failed',
          retryCount: 3,
          errorMessage: 'Server error',
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('Permanent Failure', () => {
    it('should immediately move job to failed state on non-retryable error', async () => {
      const mockQueueItem = {
        id: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        retryCount: 0,
        processingStartedAt: null,
        video: {
          id: 'video-123',
          title: 'Test Video',
        },
      };

      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key' }),
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([mockQueueItem]);
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(null);
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce(mockQueueItem);

      // Mock: Transcription service throws non-retryable error
      const nonRetryableError = new TranscriptionServiceError('Video not found', {
        status: 404,
        retryable: false,
      });
      transcribeVideo.mockRejectedValueOnce(nonRetryableError);

      // Mock: Update queue item to failed immediately
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce({
        ...mockQueueItem,
        status: 'failed',
        retryCount: 1,
        completedAt: expect.any(Date),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);
      expect(data.completed).toBe(0);
      expect(data.failed).toBe(1);
      expect(data.results[0]).toMatchObject({
        queueItemId: 'queue-item-1',
        videoId: 'video-123',
        status: 'failed',
        error: 'Video not found',
        retryable: false,
      });

      // Verify queue item was immediately moved to failed (not pending)
      expect(mockPrisma.transcriptionQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-item-1' },
        data: {
          status: 'failed',
          retryCount: 1, // Incremented once, but not retried
          errorMessage: 'Video not found',
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should return empty results when queue is empty', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key' }),
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([]);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(0);
      expect(data.completed).toBe(0);
      expect(data.failed).toBe(0);
      expect(data.results).toEqual([]);
    });

    it('should handle maxItems parameter correctly (boundary: 1)', async () => {
      const mockQueueItem = {
        id: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        retryCount: 0,
        processingStartedAt: null,
        video: { id: 'video-123', title: 'Test Video' },
      };

      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key', maxItems: 1 }),
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([mockQueueItem]);
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(null);
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce(mockQueueItem);

      transcribeVideo.mockResolvedValueOnce({ text: 'Test' });
      mockPrisma.transcript.create.mockResolvedValueOnce({ id: 'transcript-1' });
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce({
        ...mockQueueItem,
        status: 'completed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);

      // Verify findMany was called with take: 1
      expect(mockPrisma.transcriptionQueue.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        include: { video: true },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: 1,
      });
    });

    it('should handle maxItems parameter correctly (boundary: 5)', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key', maxItems: 5 }),
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([]);

      await POST(request);

      // Verify findMany was called with take: 5
      expect(mockPrisma.transcriptionQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should cap maxItems at MAX_ITEMS_PER_RUN (5) when value exceeds limit', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({ secret: 'test-secret-key', maxItems: 10 }),
      });

      mockPrisma.transcriptionQueue.findMany.mockResolvedValueOnce([]);

      await POST(request);

      // Verify findMany was called with take: 5 (capped)
      expect(mockPrisma.transcriptionQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should handle queueItemId parameter for single item processing', async () => {
      const mockQueueItem = {
        id: 'queue-item-1',
        videoId: 'video-123',
        status: 'pending',
        retryCount: 0,
        processingStartedAt: null,
        video: { id: 'video-123', title: 'Test Video' },
      };

      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({
          secret: 'test-secret-key',
          queueItemId: 'queue-item-1',
        }),
      });

      // Mock: findUnique for specific queue item
      mockPrisma.transcriptionQueue.findUnique.mockResolvedValueOnce(mockQueueItem);
      mockPrisma.transcript.findUnique.mockResolvedValueOnce(null);
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce(mockQueueItem);

      transcribeVideo.mockResolvedValueOnce({ text: 'Test' });
      mockPrisma.transcript.create.mockResolvedValueOnce({ id: 'transcript-1' });
      mockPrisma.transcriptionQueue.update.mockResolvedValueOnce({
        ...mockQueueItem,
        status: 'completed',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(1);

      // Verify findUnique was called instead of findMany
      expect(mockPrisma.transcriptionQueue.findUnique).toHaveBeenCalledWith({
        where: { id: 'queue-item-1' },
        include: { video: true },
      });
      expect(mockPrisma.transcriptionQueue.findMany).not.toHaveBeenCalled();
    });

    it('should handle queueItemId that does not exist', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'POST',
        body: JSON.stringify({
          secret: 'test-secret-key',
          queueItemId: 'non-existent-id',
        }),
      });

      // Mock: findUnique returns null (item doesn't exist)
      mockPrisma.transcriptionQueue.findUnique.mockResolvedValueOnce(null);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(0);
      expect(data.results).toEqual([]);
    });
  });
});

describe('GET /api/transcription-worker', () => {
  let mockPrisma;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TRANSCRIPTION_WORKER_SECRET: 'test-secret-key',
    };

    mockPrisma = prisma;
    mockReset(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Security', () => {
    it('should reject request with missing secret', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept request with valid secret', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'GET',
        headers: [['authorization', 'Bearer test-secret-key']],
      });

      mockPrisma.transcriptionQueue.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(2) // processing
        .mockResolvedValueOnce(10) // completed
        .mockResolvedValueOnce(1); // failed

      getWorkerHealth.mockResolvedValueOnce({ status: 'healthy' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pending).toBe(5);
      expect(data.processing).toBe(2);
      expect(data.completed).toBe(10);
      expect(data.failed).toBe(1);
      expect(data.total).toBe(18);
      expect(data.worker).toEqual({ status: 'healthy' });
    });
  });

  describe('Queue Statistics', () => {
    it('should return correct queue counts', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'GET',
        headers: [['authorization', 'Bearer test-secret-key']],
      });

      mockPrisma.transcriptionQueue.count
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(1) // processing
        .mockResolvedValueOnce(7) // completed
        .mockResolvedValueOnce(0); // failed

      getWorkerHealth.mockResolvedValueOnce({ status: 'healthy' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pending).toBe(3);
      expect(data.processing).toBe(1);
      expect(data.completed).toBe(7);
      expect(data.failed).toBe(0);
      expect(data.total).toBe(11);
    });

    it('should handle worker health check failure gracefully', async () => {
      const request = new MockRequest('http://localhost:3000/api/transcription-worker', {
        method: 'GET',
        headers: [['authorization', 'Bearer test-secret-key']],
      });

      mockPrisma.transcriptionQueue.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const healthError = new TranscriptionServiceError('Worker unreachable', {
        retryable: true,
      });
      getWorkerHealth.mockRejectedValueOnce(healthError);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.worker).toEqual({
        status: 'unreachable',
        error: 'Worker unreachable',
      });
    });
  });
});

