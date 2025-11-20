import React, { useState } from 'react';
import { Search, Loader2, Filter, Calendar, ChevronDown, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { getDatePreset, DATE_PRESETS } from '../utils/datePresets';
import ChannelSuggestions from './ChannelSuggestions';
import { saveFavorite, isFavorited } from '../utils/favorites';

/**
 * Converts date input value to RFC 3339 format
 */
const toRFC3339 = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString();
};

const RESULTS_PER_PAGE_KEY = 'tubetime_results_per_page';

const EnhancedSearchBar = ({ onSearch, isLoading, onShowHistory, availableChannels = [], lastSearchParams }) => {
  // Initialize with "Last 7 Days" preset
  const initializeDates = () => {
    const { startDate, endDate } = getDatePreset('last7days');
    return { startDate, endDate };
  };

  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(() => initializeDates().startDate);
  const [endDate, setEndDate] = useState(() => initializeDates().endDate);
  const [showFilters, setShowFilters] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [showChannelSuggestions, setShowChannelSuggestions] = useState(false);
  const [duration, setDuration] = useState('');
  const [language, setLanguage] = useState('');
  const [maxResults, setMaxResults] = useState(() => {
    // Load from localStorage or default to 20
    try {
      const stored = localStorage.getItem(RESULTS_PER_PAGE_KEY);
      return stored ? parseInt(stored, 10) : 20;
    } catch {
      return 20;
    }
  });

  const handlePreset = (presetValue) => {
    const { startDate: presetStart, endDate: presetEnd } = getDatePreset(presetValue);
    setStartDate(presetStart);
    setEndDate(presetEnd);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate: either query or channelName must be provided
    const hasQuery = query.trim().length > 0;
    const hasChannelName = channelName.trim().length > 0;
    
    if (!hasQuery && !hasChannelName) {
      toast.error('Please enter a search query or channel name.');
      return;
    }
    
    const startDateRFC3339 = toRFC3339(startDate);
    const endDateRFC3339 = toRFC3339(endDate);
    
    // Save maxResults preference to localStorage
    try {
      localStorage.setItem(RESULTS_PER_PAGE_KEY, String(maxResults));
    } catch (error) {
      console.warn('Failed to save results per page preference:', error);
    }
    
    onSearch({
      query: query.trim() || undefined, // Allow empty query if channelName is provided
      startDate: startDateRFC3339,
      endDate: endDateRFC3339,
      channelName: channelName.trim() || undefined,
      duration: duration || undefined,
      order: 'date', // Default API order, client-side sorting handled by SortBar
      language: language || undefined,
      maxResults: maxResults,
    });
  };

  const clearFilters = () => {
    setChannelName('');
    setDuration('');
    setOrder('date');
    setLanguage('');
    setStartDate('');
    setEndDate('');
  };

  const clearAll = () => {
    setQuery('');
    clearFilters();
  };

  const handleSaveFavorite = async () => {
    const hasQuery = query.trim().length > 0;
    const hasChannelName = channelName.trim().length > 0;
    
    if (!hasQuery && !hasChannelName) {
      toast.error('Please enter a search query or channel name to save as favorite.');
      return;
    }
    
    try {
      const favoriteName = hasChannelName 
        ? channelName.trim() 
        : query.trim();
      const favoriteType = hasChannelName ? 'channel' : 'search';
      
      // Check if already favorited
      const isFav = await isFavorited(favoriteName, favoriteType);
      if (isFav) {
        toast.info('This is already in your favorites.');
        return;
      }
      
      const favoriteData = {
        query: query.trim() || undefined,
        channelName: channelName.trim() || undefined,
        startDate: toRFC3339(startDate) || undefined,
        endDate: toRFC3339(endDate) || undefined,
        duration: duration || undefined,
        language: language || undefined,
      };
      
      await saveFavorite(favoriteName, favoriteType, favoriteData);
      toast.success(`"${favoriteName}" saved to favorites!`);
    } catch (error) {
      console.error('Failed to save favorite:', error);
      toast.error(error.message || 'Failed to save favorite.');
    }
  };

  // Update maxResults preference when changed
  const handleMaxResultsChange = (value) => {
    const numValue = parseInt(value, 10);
    setMaxResults(numValue);
    try {
      localStorage.setItem(RESULTS_PER_PAGE_KEY, String(numValue));
    } catch (error) {
      console.warn('Failed to save results per page preference:', error);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-10 shadow-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Search Input */}
          <div className="md:col-span-3 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Search Query</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., 'Cyberpunk 2077 trailer' or 'SpaceX launch' (optional if channel name provided)"
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Date Presets */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Presets</label>
            <select
              value={(() => {
                // Determine which preset matches current dates
                const currentPreset = DATE_PRESETS.find(preset => {
                  const { startDate: presetStart, endDate: presetEnd } = getDatePreset(preset.value);
                  return presetStart === startDate && presetEnd === endDate;
                });
                return currentPreset ? currentPreset.value : '';
              })()}
              onChange={(e) => {
                if (e.target.value) {
                  handlePreset(e.target.value);
                }
              }}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark]"
            >
              <option value="">Select preset...</option>
              {DATE_PRESETS.map(preset => (
                <option key={preset.value} value={preset.value}>{preset.label}</option>
              ))}
            </select>
          </div>

          {/* Date Inputs */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark]"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark]"
            />
          </div>

          {/* Results Per Page */}
          <div className="md:col-span-1 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Per Page</label>
            <select
              value={maxResults}
              onChange={(e) => handleMaxResultsChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Clear All Button */}
          <div className="md:col-span-1 space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider opacity-0">Clear</label>
            <button
              type="button"
              onClick={clearAll}
              disabled={!query && !startDate && !endDate && !channelName && !duration && !language}
              className="w-full h-[46px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-700"
              title="Clear all fields"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider opacity-0">Search</label>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[46px] bg-red-600 hover:bg-red-500 text-zinc-100 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-3">
            {(query.trim() || channelName.trim()) && (
              <button
                type="button"
                onClick={handleSaveFavorite}
                className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                title="Save as favorite"
              >
                <Star className="w-4 h-4" />
                Save Favorite
              </button>
            )}
            {onShowHistory && (
              <button
                type="button"
                onClick={onShowHistory}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                History
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
            <div className="space-y-2 relative">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Channel Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => {
                    setChannelName(e.target.value);
                    setShowChannelSuggestions(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => {
                    if (channelName.trim().length > 0) {
                      setShowChannelSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicks on suggestions
                    setTimeout(() => setShowChannelSuggestions(false), 200);
                  }}
                  placeholder="Filter by channel (case-insensitive)..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all placeholder:text-zinc-600"
                />
                <ChannelSuggestions
                  searchTerm={channelName}
                  availableChannels={availableChannels}
                  onSelectChannel={(name) => {
                    setChannelName(name);
                    setShowChannelSuggestions(false);
                  }}
                  onClose={() => setShowChannelSuggestions(false)}
                  isVisible={showChannelSuggestions && channelName.trim().length > 0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark]"
              >
                <option value="">Any</option>
                <option value="short">Short (&lt; 4 min)</option>
                <option value="medium">Medium (4-20 min)</option>
                <option value="long">Long (&gt; 20 min)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark]"
              >
                <option value="">Any</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
          </div>
        )}

        {/* Clear Filters Button */}
        {(channelName || duration || language) && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Clear advanced filters
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default EnhancedSearchBar;

