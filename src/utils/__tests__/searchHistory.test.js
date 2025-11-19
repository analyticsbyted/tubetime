import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  saveSearchHistory, 
  getSearchHistory, 
  clearSearchHistory,
  formatHistoryTimestamp 
} from '../searchHistory';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

global.localStorage = localStorageMock;

describe('searchHistory', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should save search to history', () => {
    saveSearchHistory('test query', '2024-01-01', '2024-01-31');
    const history = getSearchHistory();
    expect(history.length).toBe(1);
    expect(history[0].query).toBe('test query');
  });

  it('should limit history to MAX_HISTORY_ITEMS', () => {
    for (let i = 0; i < 15; i++) {
      saveSearchHistory(`query ${i}`, '', '');
    }
    const history = getSearchHistory();
    expect(history.length).toBeLessThanOrEqual(10);
  });

  it('should remove duplicates', () => {
    saveSearchHistory('test', '2024-01-01', '2024-01-31');
    saveSearchHistory('test', '2024-01-01', '2024-01-31');
    const history = getSearchHistory();
    expect(history.length).toBe(1);
  });

  it('should clear history', () => {
    saveSearchHistory('test', '', '');
    expect(getSearchHistory().length).toBe(1);
    clearSearchHistory();
    expect(getSearchHistory().length).toBe(0);
  });

  it('should format timestamps correctly', () => {
    const now = new Date();
    const oneMinAgo = new Date(now.getTime() - 60000);
    const result = formatHistoryTimestamp(oneMinAgo.toISOString());
    expect(result).toContain('ago');
  });
});

