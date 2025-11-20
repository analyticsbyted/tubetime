import React, { useState, useEffect } from 'react';
import { History, X, Clock, Loader2 } from 'lucide-react';
import { getSearchHistory, formatHistoryTimestamp, clearSearchHistory } from '../utils/searchHistory';

const SearchHistory = ({ onSelectSearch, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load history when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    let cancelled = false;
    
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const loadedHistory = await getSearchHistory();
        if (!cancelled) {
          setHistory(loadedHistory);
        }
      } catch (error) {
        console.error('Failed to load search history:', error);
        if (!cancelled) {
          setHistory([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    
    loadHistory();
    
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (entry) => {
    // Pass all search parameters for full restoration
    onSelectSearch(
      entry.query || '',
      entry.startDate || '',
      entry.endDate || '',
      entry.channelName || '',
      entry.duration || '',
      entry.language || '',
      entry.order || '',
      entry.maxResults || null
    );
    onClose();
  };

  const handleClear = async () => {
    if (window.confirm('Clear all search history?')) {
      try {
        await clearSearchHistory();
        setHistory([]);
        onClose();
      } catch (error) {
        console.error('Failed to clear search history:', error);
        // Still clear local state even if API call fails
        setHistory([]);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 pt-20">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-red-500" />
            Search History
          </h3>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <div className="text-center py-12 text-zinc-500">
              <Loader2 className="w-12 h-12 mx-auto mb-4 opacity-20 animate-spin" />
              <p>Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No search history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry, index) => {
                const displayQuery = entry.query || entry.channelName || 'Channel search';
                return (
                  <button
                    key={entry.id || index}
                    onClick={() => handleSelect(entry)}
                    className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-100 truncate">{displayQuery}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
                          {entry.channelName && entry.query && (
                            <span className="text-zinc-500">Channel: {entry.channelName}</span>
                          )}
                          {entry.startDate && (
                            <span>From: {new Date(entry.startDate).toLocaleDateString()}</span>
                          )}
                          {entry.endDate && (
                            <span>To: {new Date(entry.endDate).toLocaleDateString()}</span>
                          )}
                          {entry.duration && (
                            <span>Duration: {entry.duration}</span>
                          )}
                          {entry.language && (
                            <span>Lang: {entry.language}</span>
                          )}
                          {!entry.startDate && !entry.endDate && !entry.channelName && !entry.duration && !entry.language && (
                            <span>No filters</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatHistoryTimestamp(entry.timestamp || entry.createdAt)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchHistory;

