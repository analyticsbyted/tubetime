import React from 'react';
import { Users, X } from 'lucide-react';
import { findMatchingChannels } from '../utils/channelMatcher';

const ChannelSuggestions = ({ 
  searchTerm, 
  availableChannels, 
  onSelectChannel, 
  onClose,
  isVisible 
}) => {
  if (!isVisible || !searchTerm || !searchTerm.trim() || !availableChannels || availableChannels.length === 0) {
    return null;
  }

  const matches = findMatchingChannels(searchTerm, availableChannels, 0.2, 8);

  if (matches.length === 0) {
    return (
      <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
        <div className="p-3 text-xs text-zinc-400 text-center">
          No matching channels found
        </div>
      </div>
    );
  }

  return (
    <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
      <div className="p-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Users className="w-3 h-3" />
          <span>Matching Channels ({matches.length})</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="py-1">
        {matches.map((match, index) => (
          <button
            key={`${match.name}-${index}`}
            onClick={() => onSelectChannel(match.name)}
            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-red-400 transition-colors flex items-center justify-between group"
          >
            <span className="truncate flex-1">{match.name}</span>
            <span className="text-xs text-zinc-500 ml-2 font-mono">
              {Math.round(match.similarity * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChannelSuggestions;

