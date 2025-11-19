import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Youtube, Key, Loader2 } from 'lucide-react';
import SearchBar from './components/SearchBar';
import VideoGrid from './components/VideoGrid';
import ActionBar from './components/ActionBar';
import SettingsModal from './components/SettingsModal';
import Footer from './components/Footer';
import { useSelection } from './hooks/useSelection';
import * as youtubeService from './services/youtubeService';

const API_KEY_STORAGE_KEY = 'tubetime_youtube_api_key';

function App() {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    // Initialize from localStorage or env variable
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    return stored || import.meta.env.VITE_YOUTUBE_API_KEY || '';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { selection, toggle, clear } = useSelection();

  // Persist API key to localStorage whenever it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [apiKey]);

  const handleSearch = async (query, startDate, endDate) => {
    if (!apiKey) {
      toast.error('YouTube API Key is not set. Please add it in settings.');
      setIsSettingsOpen(true);
      return;
    }

    if (!query.trim()) {
      toast.error('Please enter a search query.');
      return;
    }

    setIsLoading(true);
    clear(); // Clear selection when new search is performed
    setHasSearched(true);

    try {
      const results = await youtubeService.searchVideos({ query, startDate, endDate, apiKey });
      setVideos(results);
      if (results.length === 0) {
        toast.info('No videos found matching your criteria.');
      } else {
        toast.success(`Found ${results.length} video${results.length !== 1 ? 's' : ''}.`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to search videos.');
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueue = () => {
    const selectedIds = Array.from(selection);
    console.log('Queued for transcription:', selectedIds);
    toast.success(`${selectedIds.length} video${selectedIds.length !== 1 ? 's' : ''} queued for transcription.`);
    clear();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-500/30 flex flex-col">
      <Toaster position="top-right" theme="dark" />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={setApiKey}
        currentApiKey={apiKey}
      />
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg">
              <Youtube className="w-6 h-6 text-white fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">
              Tube<span className="text-red-500">Time</span>
            </h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2
              ${apiKey 
                ? 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600' 
                : 'border-red-900/50 text-red-400 bg-red-900/10 hover:bg-red-900/20'
              }`}
          >
            <Key className="w-3 h-3" />
            {apiKey ? 'API Key Configured' : 'Set API Key'}
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 animate-pulse">
            <Loader2 className="w-10 h-10 mb-4 animate-spin text-red-500" />
            <p>Scanning the archives...</p>
          </div>
        ) : (
          <VideoGrid videos={videos} selection={selection} onToggleSelection={toggle} hasSearched={hasSearched} />
        )}
      </main>
      <Footer />
      <ActionBar
        selectedCount={selection.size}
        onQueue={handleQueue}
        onClear={clear}
      />
    </div>
  );
}

export default App;