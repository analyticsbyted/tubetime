import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getQueue,
  addToQueue,
  removeFromQueue,
  clearQueue,
  isInQueue,
  getQueueSize,
} from '@/utils/transcriptionQueue';

describe('transcriptionQueue', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    
    global.localStorage = localStorageMock;
  });

  describe('getQueue', () => {
    it('should return empty array when queue is empty', () => {
      const queue = getQueue();
      expect(queue).toEqual([]);
    });

    it('should return queue from localStorage', () => {
      const mockQueue = ['video-1', 'video-2', 'video-3'];
      localStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));
      
      const queue = getQueue();
      expect(queue).toEqual(mockQueue);
    });

    it('should handle corrupted data gracefully', () => {
      localStorage.getItem.mockReturnValue('invalid json');
      
      const queue = getQueue();
      expect(queue).toEqual([]);
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should filter out invalid entries', () => {
      const mockQueue = ['video-1', '', null, 'video-2', 123];
      localStorage.getItem.mockReturnValue(JSON.stringify(mockQueue));
      
      const queue = getQueue();
      expect(queue).toEqual(['video-1', 'video-2']);
    });
  });

  describe('addToQueue', () => {
    beforeEach(() => {
      localStorage.getItem.mockReturnValue(null);
    });

    it('should add videos to empty queue', () => {
      const result = addToQueue(['video-1', 'video-2']);
      
      expect(result.success).toBe(true);
      expect(result.added).toBe(2);
      expect(result.skipped).toBe(0);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should skip duplicate videos', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify(['video-1']));
      
      const result = addToQueue(['video-1', 'video-2']);
      
      expect(result.success).toBe(true);
      expect(result.added).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should handle Set input', () => {
      const result = addToQueue(new Set(['video-1', 'video-2']));
      
      expect(result.success).toBe(true);
      expect(result.added).toBe(2);
    });

    it('should filter out invalid IDs', () => {
      const result = addToQueue(['video-1', '', null, 'video-2']);
      
      expect(result.success).toBe(true);
      expect(result.added).toBe(2);
      expect(result.skipped).toBeGreaterThan(0);
    });

    it('should return error when no IDs provided', () => {
      const result = addToQueue([]);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No video IDs provided');
    });

    it('should handle quota exceeded error', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      // Mock getQueue to return a large queue
      localStorage.getItem.mockReturnValue(
        JSON.stringify(Array.from({ length: 600 }, (_, i) => `video-${i}`))
      );
      
      const result = addToQueue(['new-video']);
      
      // Should attempt cleanup and retry
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('removeFromQueue', () => {
    beforeEach(() => {
      localStorage.getItem.mockReturnValue(
        JSON.stringify(['video-1', 'video-2', 'video-3'])
      );
    });

    it('should remove videos from queue', () => {
      const result = removeFromQueue(['video-1', 'video-2']);
      
      expect(result.success).toBe(true);
      expect(result.removed).toBe(2);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should handle Set input', () => {
      const result = removeFromQueue(new Set(['video-1']));
      
      expect(result.success).toBe(true);
      expect(result.removed).toBe(1);
    });

    it('should not remove videos not in queue', () => {
      const result = removeFromQueue(['video-999']);
      
      expect(result.success).toBe(true);
      expect(result.removed).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('should clear the queue', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify(['video-1', 'video-2']));
      
      const result = clearQueue();
      
      expect(result.success).toBe(true);
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('isInQueue', () => {
    it('should return true if video is in queue', () => {
      localStorage.getItem.mockReturnValue(
        JSON.stringify(['video-1', 'video-2'])
      );
      
      expect(isInQueue('video-1')).toBe(true);
    });

    it('should return false if video is not in queue', () => {
      localStorage.getItem.mockReturnValue(
        JSON.stringify(['video-1', 'video-2'])
      );
      
      expect(isInQueue('video-999')).toBe(false);
    });
  });

  describe('getQueueSize', () => {
    it('should return correct queue size', () => {
      localStorage.getItem.mockReturnValue(
        JSON.stringify(['video-1', 'video-2', 'video-3'])
      );
      
      expect(getQueueSize()).toBe(3);
    });

    it('should return 0 for empty queue', () => {
      localStorage.getItem.mockReturnValue(null);
      
      expect(getQueueSize()).toBe(0);
    });
  });
});

