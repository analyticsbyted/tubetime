'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import Header from '../src/components/Header';
import Footer from '../src/components/Footer';
import EnhancedSearchBar from '../src/components/EnhancedSearchBar';
import SearchHistory from '../src/components/SearchHistory';
import SearchStats from '../src/components/SearchStats';
import SortBar from '../src/components/SortBar';
import CollectionModal from '../src/components/CollectionModal';
import FavoritesSidebar from '../src/components/FavoritesSidebar';
import VideoGrid from '../src/components/VideoGrid';
import VideoGridSkeleton from '../src/components/VideoGridSkeleton';
import ActionBar from '../src/components/ActionBar';
import { useSearchParamsState } from '../src/hooks/useSearchParams';
import { useVideoSearch } from '../src/hooks/useVideoSearch';
import { useVideoSort } from '../src/hooks/useVideoSort';
import { useSelection } from '../src/hooks/useSelection';
import { addToQueue } from '../src/utils/transcriptionQueue';
import { toast } from 'sonner';
import { getDatePreset } from '../src/utils/datePresets';

function HomePageContent() {
  // URL-based state management
  const { searchParams, updateSearchParams } = useSearchParamsState();
  
  // Video search state
  const { 
    videos, 
    isLoading, 
    hasSearched, 
    nextPageToken, 
    totalResults, 
    availableChannels,
    searchVideos,
    loadMore,
  } = useVideoSearch();
  
  // Selection state (local to this component)
  const selectionHook = useSelection();
  const { selection, toggle: toggleSelection, clear: clearSelection, selectAll, deselectAll } = selectionHook;
  
  // Sorting
  const sortedVideos = useVideoSort(videos, searchParams.order);
  
  // Modal states (component-level, not global)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  // Effect: Search when URL params change
  useEffect(() => {
    const hasQuery = searchParams.query?.trim().length > 0;
    const hasChannelName = searchParams.channelName?.trim().length > 0;
    
    if (hasQuery || hasChannelName) {
      // Convert URL params to search format
      const searchParamsForAPI = {
        query: searchParams.query,
        channelName: searchParams.channelName,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        duration: searchParams.duration,
        language: searchParams.language,
        order: searchParams.order,
        maxResults: searchParams.maxResults,
      };
      
      searchVideos(searchParamsForAPI, false, clearSelection);
    }
    // Note: We intentionally exclude searchVideos and clearSelection from deps
    // to avoid re-running on every render. They are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams.query,
    searchParams.channelName,
    searchParams.startDate,
    searchParams.endDate,
    searchParams.duration,
    searchParams.language,
    searchParams.order,
    searchParams.maxResults,
  ]);

  // Handle search from search bar
  const handleSearch = (searchParamsFromBar) => {
    // Update URL params, which will trigger the useEffect above
    updateSearchParams({
      query: searchParamsFromBar.query || '',
      channelName: searchParamsFromBar.channelName || '',
      startDate: searchParamsFromBar.startDate || '',
      endDate: searchParamsFromBar.endDate || '',
      duration: searchParamsFromBar.duration || '',
      language: searchParamsFromBar.language || '',
      order: searchParamsFromBar.order || 'date',
      maxResults: searchParamsFromBar.maxResults || 20,
    });
  };

  // Handle load more
  const handleLoadMore = () => {
    if (nextPageToken && !isLoading) {
      const searchParamsForAPI = {
        query: searchParams.query,
        channelName: searchParams.channelName,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        duration: searchParams.duration,
        language: searchParams.language,
        order: searchParams.order,
        maxResults: searchParams.maxResults,
      };
      loadMore(searchParamsForAPI, clearSelection);
    }
  };

  // Handle queue for transcription
  const handleQueue = async () => {
    const selectedIds = Array.from(selection);

    if (selectedIds.length === 0) {
      toast.error('No videos selected.');
      return;
    }

    try {
      const result = await addToQueue(selectedIds);

      if (result.success) {
        console.log('Queued for transcription:', selectedIds);
        toast.success(result.message);
        clearSelection();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to queue videos:', error);
      toast.error(error.message || 'Failed to queue videos for transcription.');
    }
  };

  // Handle history selection (now supports full search parameters)
  const handleSelectHistory = (query, startDate, endDate, channelName, duration, language, order, maxResults) => {
    handleSearch({
      query: query || '',
      channelName: channelName || '',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      duration: duration || undefined,
      language: language || undefined,
      order: order || 'date',
      maxResults: maxResults || 20,
    });
  };

  // Handle favorite selection
  const handleSelectFavorite = (favorite) => {
    setIsFavoritesOpen(false);
    if (favorite.type === 'channel') {
      const searchParamsForFavorite = {
        query: '',
        channelName: favorite.data.channelName,
        startDate: favorite.data.startDate,
        endDate: favorite.data.endDate,
        duration: favorite.data.duration,
        language: favorite.data.language,
      };

      // If no dates saved, use default (last 7 days)
      if (!searchParamsForFavorite.startDate && !searchParamsForFavorite.endDate) {
        const preset = getDatePreset('last7days');
        const startDateObj = new Date(preset.startDate + 'T00:00:00Z');
        const endDateObj = new Date(preset.endDate + 'T23:59:59Z');
        searchParamsForFavorite.startDate = startDateObj.toISOString();
        searchParamsForFavorite.endDate = endDateObj.toISOString();
      }

      handleSearch(searchParamsForFavorite);
    } else {
      handleSearch(favorite.data);
    }
  };

  // Get selected videos
  const getSelectedVideos = () => {
    return videos.filter(v => selection.has(v.id));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-500/30 flex flex-col">
      <Toaster position="top-center" theme="dark" />
      <Header 
        selectedCount={selection.size} 
        onOpenFavorites={() => setIsFavoritesOpen(true)} 
      />
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 relative overflow-hidden">
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
          onSelectFavorite={handleSelectFavorite}
        />
        <EnhancedSearchBar 
          onSearch={handleSearch} 
          isLoading={isLoading}
          onShowHistory={() => setIsHistoryOpen(true)}
          availableChannels={availableChannels}
          lastSearchParams={searchParams}
        />
        {hasSearched && videos.length > 0 && (
          <>
            <SearchStats 
              videos={videos} 
              totalResults={totalResults}
              currentSearchParams={searchParams}
              onChannelClick={(channelName) => {
                // Update URL with channel filter
                handleSearch({
                  ...searchParams,
                  channelName: channelName,
                });
              }}
            />
            <SortBar 
              sortOrder={searchParams.order} 
              onSortChange={(newOrder) => updateSearchParams({ order: newOrder })} 
            />
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
              videos={sortedVideos} 
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

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
