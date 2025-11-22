import React from 'react';
import { Search, Youtube, CheckSquare, Square } from 'lucide-react';
import VideoCard from './VideoCard';

const VideoGrid = ({ 
  videos, 
  selection, 
  onToggleSelection, 
  onSelectAll,
  onDeselectAll,
  hasSearched,
  hasMore,
  onLoadMore,
  totalResults,
  transcriptStatuses, // Map of videoId -> status
  onViewTranscript, // Handler for viewing transcript
}) => {
  const allSelected = videos.length > 0 && videos.every(v => selection.has(v.id));
  const someSelected = selection.size > 0 && !allSelected;

  if (videos.length === 0 && hasSearched) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="text-lg">No results found in this timeline.</p>
        <p className="text-sm opacity-60">Try adjusting your dates or keywords.</p>
      </div>
    );
  }

  if (videos.length === 0 && !hasSearched) {
    return (
      <div className="text-center py-20 text-zinc-600">
        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
          <Youtube className="w-8 h-8 opacity-50" />
        </div>
        <h2 className="text-xl font-medium text-zinc-300 mb-2">Ready to Time Travel</h2>
        <p className="max-w-md mx-auto opacity-70">
          Enter a topic and a date range above to uncover videos from specific moments in YouTube history.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Selection Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          {selection.size > 0 && (
            <span className="text-xs text-zinc-400 font-mono">
              {selection.size} of {videos.length} selected
              {totalResults > videos.length && ` (${totalResults} total)`}
            </span>
          )}
        </div>
        {totalResults > 0 && (
          <span className="text-xs text-zinc-500 font-mono">
            Showing {videos.length} of {totalResults} results
          </span>
        )}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map(video => (
          <VideoCard
            key={video.id}
            video={video}
            isSelected={selection.has(video.id)}
            onToggleSelection={onToggleSelection}
            transcriptStatus={transcriptStatuses?.get(video.id) || null}
            onViewTranscript={onViewTranscript}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={onLoadMore}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-3 px-6 rounded-xl text-sm transition-colors border border-zinc-700"
          >
            Load More Results
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoGrid;
