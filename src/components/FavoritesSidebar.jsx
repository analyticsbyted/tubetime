import React from 'react';
import { X, Star, Search, Users, Trash2, Clock, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useFavoritesQuery, useFavoritesMutation } from '../hooks/useFavoritesQuery';
import { formatHistoryTimestamp } from '../utils/searchHistory';

const FavoritesSidebar = ({ isOpen, onClose, onSelectFavorite }) => {
  // React Query Hooks
  // Only fetch when sidebar is open (performance optimization)
  const { 
    data: favorites = [], 
    isLoading, 
    isError 
  } = useFavoritesQuery({ 
    enabled: isOpen // Only fetch when sidebar is open
  });

  const { deleteFavorite } = useFavoritesMutation();

  const handleDelete = (e, favoriteId) => {
    e.stopPropagation();
    deleteFavorite.mutate(favoriteId);
  };

  const handleSelect = (favorite) => {
    onSelectFavorite(favorite);
  };

  const favoritesByType = {
    search: favorites.filter(f => f.type === 'search'),
    channel: favorites.filter(f => f.type === 'channel'),
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`absolute top-0 right-0 h-full w-80 bg-zinc-950 border-l border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col shadow-2xl`}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-red-500 fill-current" />
            <h2 className="text-lg font-bold">Favorites</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-zinc-500">
              <Loader2 className="w-12 h-12 mx-auto mb-4 opacity-20 animate-spin" />
              <p className="text-sm">Loading favorites...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-red-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Failed to load favorites</p>
              <p className="text-xs text-zinc-500 mt-2">Please try again later</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No favorites yet</p>
              <p className="text-xs mt-2 opacity-60">
                Save searches or channels as favorites for quick access
              </p>
            </div>
          ) : (
            <>
              {/* Search Favorites */}
              {favoritesByType.search.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Searches ({favoritesByType.search.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {favoritesByType.search.map(favorite => (
                      <div
                        key={favorite.id}
                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-red-500/50 hover:bg-zinc-800/50 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => handleSelect(favorite)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="text-sm font-medium text-zinc-200 truncate mb-1">
                              {favorite.name}
                            </div>
                            {favorite.data.query && (
                              <div className="text-xs text-zinc-400 truncate mb-1">
                                "{favorite.data.query}"
                              </div>
                            )}
                            {favorite.data.channelName && (
                              <div className="text-xs text-zinc-400 truncate mb-1 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {favorite.data.channelName}
                              </div>
                            )}
                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatHistoryTimestamp(favorite.createdAt)}
                            </div>
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
                            <button
                              onClick={(e) => handleDelete(e, favorite.id)}
                              disabled={deleteFavorite.isPending}
                              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all p-1 disabled:opacity-50"
                              title="Delete favorite"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Channel Favorites */}
              {favoritesByType.channel.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Channels ({favoritesByType.channel.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {favoritesByType.channel.map(favorite => (
                      <div
                        key={favorite.id}
                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-red-500/50 hover:bg-zinc-800/50 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => handleSelect(favorite)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="text-sm font-medium text-zinc-200 truncate mb-1">
                              {favorite.name}
                            </div>
                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatHistoryTimestamp(favorite.createdAt)}
                            </div>
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
                            <button
                              onClick={(e) => handleDelete(e, favorite.id)}
                              disabled={deleteFavorite.isPending}
                              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all p-1 disabled:opacity-50"
                              title="Delete favorite"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default FavoritesSidebar;

