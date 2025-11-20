import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
vi.mock('../../../src/services/searchHistoryService', () => ({
  saveSearchHistory: vi.fn(),
  getSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  deleteSearchHistoryEntry: vi.fn(),
}));

import {
  saveSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  formatHistoryTimestamp,
} from '../../../src/utils/searchHistory';
import * as searchHistoryService from '../../../src/services/searchHistoryService';

const SEARCH_HISTORY_KEY = 'tubetime_search_history';

const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    __getStore: () => store,
  };
};

const localStorageMock = createLocalStorageMock();
global.localStorage = localStorageMock;

describe('searchHistory utils (dual-write)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('saves search to database (when available) and localStorage', async () => {
    searchHistoryService.saveSearchHistory.mockResolvedValue({
      id: 'db-entry',
      query: 'test query',
      createdAt: new Date().toISOString(),
    });

    const success = await saveSearchHistory({
      query: 'test query',
      startDate: '',
      endDate: '',
    });

    expect(success).toBe(true);
    expect(searchHistoryService.saveSearchHistory).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(localStorageMock.getItem(SEARCH_HISTORY_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0].query).toBe('test query');
  });

  it('falls back to localStorage when database save is unauthorized', async () => {
    searchHistoryService.saveSearchHistory.mockRejectedValue(
      new Error('Unauthorized: Please sign in')
    );

    const success = await saveSearchHistory({
      query: 'offline-query',
    });

    expect(success).toBe(true);
    expect(searchHistoryService.saveSearchHistory).toHaveBeenCalled();
    const stored = JSON.parse(localStorageMock.getItem(SEARCH_HISTORY_KEY));
    expect(stored[0].query).toBe('offline-query');
  });

  it('returns database history when available', async () => {
    const dbHistory = [
      {
        id: 'db1',
        query: 'db-query',
        createdAt: new Date().toISOString(),
      },
    ];
    searchHistoryService.getSearchHistory.mockResolvedValue(dbHistory);

    const history = await getSearchHistory();

    expect(history).toEqual(dbHistory);
    expect(searchHistoryService.getSearchHistory).toHaveBeenCalledWith({
      limit: 10,
    });
  });

  it('falls back to localStorage when database fetch fails', async () => {
    searchHistoryService.getSearchHistory.mockRejectedValue(
      new Error('Unauthorized: Please sign in')
    );
    localStorageMock.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify([
        {
          query: 'local-query',
          timestamp: new Date().toISOString(),
        },
      ])
    );

    const history = await getSearchHistory();

    expect(history).toHaveLength(1);
    expect(history[0].query).toBe('local-query');
  });

  it('clears both database and localStorage history', async () => {
    searchHistoryService.clearSearchHistory.mockResolvedValue(undefined);
    localStorageMock.setItem(
      SEARCH_HISTORY_KEY,
      JSON.stringify([{ query: 'to-remove', timestamp: new Date().toISOString() }])
    );

    const result = await clearSearchHistory();

    expect(result).toBe(true);
    expect(searchHistoryService.clearSearchHistory).toHaveBeenCalled();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(SEARCH_HISTORY_KEY);
  });

  it('formats timestamps correctly', () => {
    const now = new Date();
    const oneMinAgo = new Date(now.getTime() - 60000);
    const result = formatHistoryTimestamp(oneMinAgo.toISOString());
    expect(result === 'Just now' || result.includes('ago')).toBe(true);
  });
});

