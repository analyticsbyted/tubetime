'use client';

import React from 'react';
import { Youtube, Star } from 'lucide-react';

export default function Header({ selectedCount, onOpenFavorites }) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg">
            <Youtube className="w-6 h-6 text-white fill-current" />
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">
            Tube<span className="text-red-500">Time</span>
          </h1>
          {selectedCount > 0 && (
            <span className="text-xs text-zinc-400 font-mono ml-2">
              ({selectedCount} selected)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFavorites}
            className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors flex items-center gap-2"
            title="Favorites"
          >
            <Star className="w-3 h-3" />
            Favorites
          </button>
        </div>
      </div>
    </header>
  );
}

