import { useState } from 'react';
import { History, X, Clock, Loader2, AlertCircle, Trash2, Search } from 'lucide-react';
import { useSearchHistoryQuery, useSearchHistoryMutation } from '../hooks/useSearchHistoryQuery';
import { formatHistoryTimestamp } from '../utils/searchHistory';

const SearchHistory = ({ onSelectSearch, isOpen, onClose }) => {
  // Local UI state
  const [confirmClear, setConfirmClear] = useState(false);

  // React Query Hooks
  // Only fetch when modal is open (performance optimization)
  const { 
    data: history = [], 
    isLoading, 
    isError 
  } = useSearchHistoryQuery({ 
    enabled: isOpen, // Only fetch when modal is open
    limit: 50 // Match the default limit from utils
  });

  const { clearHistory, deleteEntry } = useSearchHistoryMutation();

  // Handle clear history with confirmation
  const handleClearHistory = () => {
    if (window.confirm('Clear all search history?')) {
      clearHistory.mutate(null, {
        onSuccess: () => {
          setConfirmClear(false);
          onClose();
        },
        onError: (error) => {
          console.error('Failed to clear search history:', error);
          // Still close modal even if API call fails
          setConfirmClear(false);
        },
      });
    }
  };

  // Handle delete single item
  const handleDeleteItem = (e, id) => {
    e.stopPropagation();
    deleteEntry.mutate(id);
  };

  // Handle select search - maintain backward compatibility with existing signature
  const handleSelect = (entry) => {
    // Pass all search parameters for full restoration (maintains existing signature)
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

  // Don't render if modal is closed
  if (!isOpen) return null;

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
              !confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Are you sure?</span>
                  <button
                    onClick={handleClearHistory}
                    disabled={clearHistory.isPending}
                    className="text-xs font-medium text-red-500 hover:text-red-400 disabled:opacity-50"
                  >
                    {clearHistory.isPending ? 'Clearing...' : 'Yes, Clear'}
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              )
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
          ) : isError ? (
            <div className="text-center py-12 text-red-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Failed to load history</p>
              <p className="text-xs text-zinc-500 mt-2">Please try again later</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-zinc-400">No search history</p>
              <p className="text-sm">Your recent searches will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry, index) => {
                const displayQuery = entry.query || entry.channelName || 'Channel search';
                return (
                  <div
                    key={entry.id || index}
                    onClick={() => handleSelect(entry)}
                    className="group flex items-center justify-between p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all cursor-pointer border border-zinc-700 hover:border-zinc-600"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1 min-w-[16px] shrink-0">
                        <Search className="w-4 h-4 text-zinc-500 group-hover:text-red-500 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
                          {displayQuery}
                        </p>
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
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {formatHistoryTimestamp(entry.timestamp || entry.createdAt)}
                      </div>
                      <button
                        onClick={(e) => handleDeleteItem(e, entry.id)}
                        disabled={deleteEntry.isPending}
                        className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                        title="Remove from history"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
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
