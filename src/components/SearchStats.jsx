import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, Users, Clock, Star } from 'lucide-react';
import { formatDuration } from '../services/youtubeService';
import { saveFavorite, isFavorited, deleteFavorite, getFavorite } from '../utils/favorites';
import { toast } from 'sonner';

const SearchStats = ({ videos, totalResults, onChannelClick, currentSearchParams }) => {
  const [favoritedChannels, setFavoritedChannels] = useState(new Set());

  useEffect(() => {
    // Check which channels are favorited (async)
    let cancelled = false;
    
    const checkFavoritedChannels = async () => {
      if (!videos || videos.length === 0) {
        setFavoritedChannels(new Set());
        return;
      }
      
      const channels = new Set(videos.map(v => v.channelTitle));
      const favorited = new Set();
      
      // Check each channel asynchronously
      const checks = Array.from(channels).map(async (channel) => {
        if (cancelled) return;
        try {
          const isFav = await isFavorited(channel, 'channel');
          if (isFav && !cancelled) {
            favorited.add(channel);
          }
        } catch (error) {
          // Silently handle all errors - utility layer handles 401s gracefully
          // Only log unexpected errors that aren't related to authentication
          if (!error.message?.includes('Unauthorized') && !error.message?.includes('sign in')) {
            // Suppress console warnings for expected errors
          }
        }
      });
      
      await Promise.all(checks);
      if (!cancelled) {
        setFavoritedChannels(favorited);
      }
    };
    
    checkFavoritedChannels();
    
    return () => {
      cancelled = true;
    };
  }, [videos]);

  const handleToggleFavorite = async (e, channelName) => {
    e.stopPropagation();
    
    try {
      const isFav = favoritedChannels.has(channelName);
      
      if (isFav) {
        // Remove from favorites
        const favorite = await getFavorite(channelName, 'channel');
        if (favorite) {
          await deleteFavorite(favorite.id);
          setFavoritedChannels(prev => {
            const next = new Set(prev);
            next.delete(channelName);
            return next;
          });
          toast.success(`"${channelName}" removed from favorites`);
        }
      } else {
        // Add to favorites - include current search parameters (dates, etc.)
        const favoriteData = {
          channelName: channelName,
          // Include current search parameters if available
          startDate: currentSearchParams?.startDate,
          endDate: currentSearchParams?.endDate,
          duration: currentSearchParams?.duration,
          language: currentSearchParams?.language,
        };
        await saveFavorite(channelName, 'channel', favoriteData);
        setFavoritedChannels(prev => new Set(prev).add(channelName));
        toast.success(`"${channelName}" added to favorites`);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error(error.message || 'Failed to update favorite.');
    }
  };
  if (!videos || videos.length === 0) return null;

  // Calculate statistics
  const channels = new Set(videos.map(v => v.channelTitle));
  const channelCounts = {};
  videos.forEach(v => {
    channelCounts[v.channelTitle] = (channelCounts[v.channelTitle] || 0) + 1;
  });
  
  const durations = videos.filter(v => v.duration).map(v => v.duration);
  const totalDurationSeconds = durations.reduce((acc, dur) => {
    const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return acc;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return acc + hours * 3600 + minutes * 60 + seconds;
  }, 0);
  const avgDurationSeconds = durations.length > 0 ? totalDurationSeconds / durations.length : 0;
  
  const dateRange = videos.length > 0 ? {
    earliest: new Date(Math.min(...videos.map(v => new Date(v.publishedAt).getTime()))),
    latest: new Date(Math.max(...videos.map(v => new Date(v.publishedAt).getTime()))),
  } : null;

  const topChannels = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-red-500" />
        Search Statistics
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Results */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-400 mb-1">Total Results</div>
          <div className="text-2xl font-bold text-zinc-100">{totalResults || videos.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Showing {videos.length}</div>
        </div>

        {/* Unique Channels */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Unique Channels
          </div>
          <div className="text-2xl font-bold text-zinc-100">{channels.size}</div>
        </div>

        {/* Average Duration */}
        {avgDurationSeconds > 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Avg Duration
            </div>
            <div className="text-2xl font-bold text-zinc-100 font-mono">
              {formatDuration(`PT${Math.floor(avgDurationSeconds / 60)}M${avgDurationSeconds % 60}S`)}
            </div>
          </div>
        )}

        {/* Date Range */}
        {dateRange && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Date Range
            </div>
            <div className="text-sm font-mono text-zinc-100">
              {dateRange.earliest.toLocaleDateString()} - {dateRange.latest.toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* Top Channels */}
      {topChannels.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-zinc-400 mb-2">Top Channels</div>
          <div className="space-y-1">
            {topChannels.map(([channel, count]) => {
              const isFav = favoritedChannels.has(channel);
              return (
                <div key={channel} className="flex items-center justify-between text-xs group">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={(e) => handleToggleFavorite(e, channel)}
                      className={`flex-shrink-0 p-1 rounded transition-colors ${
                        isFav 
                          ? 'text-red-500 hover:text-red-400' 
                          : 'text-zinc-500 hover:text-red-400'
                      }`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    {onChannelClick ? (
                      <button
                        onClick={() => onChannelClick(channel)}
                        className="text-zinc-300 hover:text-red-400 truncate flex-1 text-left transition-colors cursor-pointer hover:underline"
                        title={`Filter by ${channel}`}
                      >
                        {channel}
                      </button>
                    ) : (
                      <span className="text-zinc-300 truncate flex-1">{channel}</span>
                    )}
                  </div>
                  <span className="text-zinc-500 font-mono ml-2">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchStats;

