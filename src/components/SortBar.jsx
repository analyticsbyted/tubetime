import React from 'react';
import { ArrowUpDown } from 'lucide-react';

const SortBar = ({ sortOrder, onSortChange }) => {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sort Results</span>
      </div>
      <select
        value={sortOrder}
        onChange={(e) => onSortChange(e.target.value)}
        className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark] min-w-[180px]"
      >
        <option value="date">Date (Newest First)</option>
        <option value="dateAsc">Date (Oldest First)</option>
        <option value="relevance">Relevance</option>
        <option value="rating">Rating</option>
        <option value="title">Title (A-Z)</option>
        <option value="titleDesc">Title (Z-A)</option>
        <option value="viewCount">Most Views</option>
        <option value="viewCountAsc">Least Views</option>
        <option value="channel">Channel (A-Z)</option>
        <option value="channelDesc">Channel (Z-A)</option>
      </select>
    </div>
  );
};

export default SortBar;

