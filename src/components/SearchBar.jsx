import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

/**
 * Converts date input value to RFC 3339 format
 * @param {string} dateString - Value from date input (YYYY-MM-DD)
 * @returns {string} RFC 3339 formatted string (YYYY-MM-DDTHH:mm:ssZ)
 */
const toRFC3339 = (dateString) => {
  if (!dateString) return '';
  // date input gives us YYYY-MM-DD, convert to ISO string
  return new Date(dateString).toISOString();
};

const SearchBar = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) {
      return;
    }
    const startDateRFC3339 = toRFC3339(startDate);
    const endDateRFC3339 = toRFC3339(endDate);
    onSearch(query, startDateRFC3339, endDateRFC3339);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-10 shadow-xl">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Search Input */}
        <div className="md:col-span-5 space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Search Query</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'Cyberpunk 2077 trailer' or 'SpaceX launch'"
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all placeholder:text-zinc-600"
              required
            />
          </div>
        </div>

        {/* Date Inputs */}
        <div className="md:col-span-3 space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark]"
          />
        </div>

        <div className="md:col-span-3 space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all [color-scheme:dark]"
          />
        </div>

        {/* Submit Button */}
        <div className="md:col-span-1">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[46px] bg-red-600 hover:bg-red-500 text-zinc-100 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-900/20"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
