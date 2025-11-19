import React from 'react';

/**
 * Loading skeleton for VideoGrid
 * Server Component - no hooks needed
 */
export default function VideoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-zinc-800" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
            <div className="h-3 bg-zinc-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

