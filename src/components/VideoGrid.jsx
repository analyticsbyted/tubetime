import React from 'react';
import { Search, Youtube } from 'lucide-react';
import VideoCard from './VideoCard';

const VideoGrid = ({ videos, selection, onToggleSelection, hasSearched }) => {
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
      {selection.size > 0 && (
        <div className="mb-4 text-xs text-zinc-400">
          {selection.size} of {videos.length} selected
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map(video => (
          <VideoCard
            key={video.id}
            video={video}
            isSelected={selection.has(video.id)}
            onToggleSelection={onToggleSelection}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;
