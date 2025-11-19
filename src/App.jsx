'use client';

import React, { Suspense } from 'react';
import { Toaster } from 'sonner';
import { Youtube, Loader2, Star } from 'lucide-react';
import EnhancedSearchBar from './components/EnhancedSearchBar';
import SearchHistory from './components/SearchHistory';
import SearchStats from './components/SearchStats';
import SortBar from './components/SortBar';
import CollectionModal from './components/CollectionModal';
import FavoritesSidebar from './components/FavoritesSidebar';
import VideoGrid from './components/VideoGrid';
import VideoGridSkeleton from './components/VideoGridSkeleton';
import ActionBar from './components/ActionBar';
import Footer from './components/Footer';
import { useAppContext } from './context/AppContext';
import { getDatePreset } from './utils/datePresets';

function App() {
  const {
    videos,
    isLoading,
    hasSearched,
    nextPageToken,
    totalResults,
    lastSearchParams,
    availableChannels,
    handleSearch,
    handleLoadMore,
    handleSelectHistory,
    selection,
    toggleSelection,
    clearSelection,
    selectAll,
    deselectAll,
    getSelectedVideos,
    isHistoryOpen,
    setIsHistoryOpen,
    isCollectionModalOpen,
    setIsCollectionModalOpen,
    isFavoritesOpen,
    setIsFavoritesOpen,
    handleQueue,
    sortOrder,
    handleSortChange,
    getSortedVideos,
  } = useAppContext();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-500/30 flex flex-col">
      <Toaster position="top-right" theme="dark" />
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg">
              <Youtube className="w-6 h-6 text-white fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">
              Tube<span className="text-red-500">Time</span>
            </h1>
            {selection.size > 0 && (
              <span className="text-xs text-zinc-400 font-mono ml-2">
                ({selection.size} selected)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFavoritesOpen(true)}
              className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors flex items-center gap-2"
              title="Favorites"
            >
              <Star className="w-3 h-3" />
              Favorites
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1">
        <SearchHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelectSearch={handleSelectHistory}
        />
        <CollectionModal
          isOpen={isCollectionModalOpen}
          onClose={() => setIsCollectionModalOpen(false)}
          selectedVideos={videos.filter(v => selection.has(v.id))}
          selectedIds={selection}
        />
        <FavoritesSidebar
          isOpen={isFavoritesOpen}
          onClose={() => setIsFavoritesOpen(false)}
          onSelectFavorite={(favorite) => {
            setIsFavoritesOpen(false);
            if (favorite.type === 'channel') {
              // Use saved search params or default to last 7 days if not available
              const searchParams = {
                query: '',
                channelName: favorite.data.channelName,
                startDate: favorite.data.startDate,
                endDate: favorite.data.endDate,
                duration: favorite.data.duration,
                language: favorite.data.language,
              };
              
              // If no dates saved, use default (last 7 days)
              if (!searchParams.startDate && !searchParams.endDate) {
                const preset = getDatePreset('last7days');
                // Convert YYYY-MM-DD to RFC 3339 format (YYYY-MM-DDTHH:mm:ssZ)
                const startDateObj = new Date(preset.startDate + 'T00:00:00Z');
                const endDateObj = new Date(preset.endDate + 'T23:59:59Z');
                searchParams.startDate = startDateObj.toISOString();
                searchParams.endDate = endDateObj.toISOString();
              }
              
              handleSearch(searchParams);
            } else {
              handleSearch(favorite.data);
            }
          }}
        />
        <EnhancedSearchBar 
          onSearch={handleSearch} 
          isLoading={isLoading}
          onShowHistory={() => setIsHistoryOpen(true)}
          availableChannels={availableChannels}
          lastSearchParams={lastSearchParams}
        />
        {hasSearched && videos.length > 0 && (
          <>
            <SearchStats 
              videos={videos} 
              totalResults={totalResults}
              currentSearchParams={lastSearchParams}
              onChannelClick={(channelName) => {
                // Re-run search with channel filter, preserving other search params
                if (lastSearchParams) {
                  handleSearch({
                    ...lastSearchParams,
                    channelName: channelName,
                  });
                } else {
                  // Fallback: search with just channel name
                  handleSearch({
                    query: '',
                    channelName: channelName,
                  });
                }
              }}
            />
            <SortBar sortOrder={sortOrder} onSortChange={handleSortChange} />
          </>
        )}
        {isLoading && videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 animate-pulse">
            <Loader2 className="w-10 h-10 mb-4 animate-spin text-red-500" />
            <p>Scanning the archives...</p>
          </div>
        ) : (
          <Suspense fallback={<VideoGridSkeleton />}>
            <VideoGrid 
              videos={getSortedVideos()} 
              selection={selection} 
              onToggleSelection={toggleSelection}
              onSelectAll={() => selectAll(videos.map(v => v.id))}
              onDeselectAll={deselectAll}
              hasSearched={hasSearched}
              hasMore={!!nextPageToken}
              onLoadMore={handleLoadMore}
              totalResults={totalResults}
            />
          </Suspense>
        )}
      </main>
      <Footer />
      <ActionBar
        selectedCount={selection.size}
        selectedVideos={getSelectedVideos()}
        selectedIds={selection}
        onQueue={handleQueue}
        onClear={clearSelection}
        onSaveCollection={() => setIsCollectionModalOpen(true)}
      />
    </div>
  );
}

export default App;