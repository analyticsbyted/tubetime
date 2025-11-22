'use client';

import React, { useState, useEffect } from 'react';
import { Search, FileText, Grid, List, Loader2, AlertCircle } from 'lucide-react';
import { getTranscripts } from '@/services/transcriptService';
import TranscriptModal from '@/components/TranscriptModal';
import { toast } from 'sonner';

/**
 * TranscriptsPage - Lists all user's transcripts with search and view functionality
 */
export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  // Fetch transcripts on mount
  useEffect(() => {
    fetchTranscripts();
  }, []);

  // Filter transcripts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTranscripts(transcripts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = transcripts.filter((t) => {
      const title = t.video?.title?.toLowerCase() || '';
      const channel = t.video?.channelTitle?.toLowerCase() || '';
      const content = t.content?.toLowerCase() || '';
      
      return title.includes(query) || channel.includes(query) || content.includes(query);
    });

    setFilteredTranscripts(filtered);
  }, [searchQuery, transcripts]);

  const fetchTranscripts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getTranscripts({ limit: 100 });
      setTranscripts(result.transcripts || []);
      setFilteredTranscripts(result.transcripts || []);
    } catch (err) {
      console.error('Failed to fetch transcripts:', err);
      setError(err.message || 'Failed to load transcripts. Please try again.');
      toast.error('Failed to load transcripts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewTranscript = (videoId) => {
    setSelectedVideoId(videoId);
  };

  const handleCloseTranscript = () => {
    setSelectedVideoId(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-red-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading transcripts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Error Loading Transcripts</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={fetchTranscripts}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-zinc-100 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-red-400" />
              <h1 className="text-2xl font-bold text-zinc-100">My Transcripts</h1>
              <span className="text-sm text-zinc-500 font-mono">
                ({filteredTranscripts.length} {filteredTranscripts.length === 1 ? 'transcript' : 'transcripts'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-red-600 text-zinc-100'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                aria-label="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-red-600 text-zinc-100'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, channel, or content..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTranscripts.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-400 mb-2">
              {searchQuery ? 'No transcripts found' : 'No transcripts yet'}
            </h2>
            <p className="text-zinc-500">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Start by queuing videos for transcription from the main search page.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <TranscriptGrid
            transcripts={filteredTranscripts}
            onViewTranscript={handleViewTranscript}
            formatDate={formatDate}
            formatDuration={formatDuration}
          />
        ) : (
          <TranscriptList
            transcripts={filteredTranscripts}
            onViewTranscript={handleViewTranscript}
            formatDate={formatDate}
            formatDuration={formatDuration}
          />
        )}
      </div>

      {/* Transcript Modal */}
      <TranscriptModal
        videoId={selectedVideoId}
        isOpen={!!selectedVideoId}
        onClose={handleCloseTranscript}
        video={filteredTranscripts.find(t => t.videoId === selectedVideoId)?.video}
      />
    </div>
  );
}

/**
 * Grid view component for transcripts
 */
function TranscriptGrid({ transcripts, onViewTranscript, formatDate, formatDuration }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {transcripts.map((transcript) => (
        <div
          key={transcript.id}
          className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors cursor-pointer group"
          onClick={() => onViewTranscript(transcript.videoId)}
        >
          {transcript.video?.thumbnailUrl && (
            <div className="relative aspect-video overflow-hidden">
              <img
                src={transcript.video.thumbnailUrl}
                alt={transcript.video.title || 'Video thumbnail'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <div className="text-xs font-mono text-red-400">
                  {formatDuration(transcript.duration)}
                </div>
              </div>
            </div>
          )}
          <div className="p-4">
            <div className="text-xs font-mono text-red-400 mb-2">
              {formatDate(transcript.video?.publishedAt)}
            </div>
            <h3 className="text-zinc-100 font-semibold mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
              {transcript.video?.title || 'Untitled Video'}
            </h3>
            <p className="text-xs text-zinc-500 mb-3 line-clamp-2">
              {transcript.video?.channelTitle || 'Unknown Channel'}
            </p>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{transcript.wordCount?.toLocaleString() || 0} words</span>
              {transcript.language && (
                <span className="uppercase">{transcript.language}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * List view component for transcripts
 */
function TranscriptList({ transcripts, onViewTranscript, formatDate, formatDuration }) {
  return (
    <div className="space-y-4">
      {transcripts.map((transcript) => (
        <div
          key={transcript.id}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors cursor-pointer group"
          onClick={() => onViewTranscript(transcript.videoId)}
        >
          <div className="flex gap-4">
            {transcript.video?.thumbnailUrl && (
              <div className="relative w-32 h-20 flex-shrink-0 rounded overflow-hidden">
                <img
                  src={transcript.video.thumbnailUrl}
                  alt={transcript.video.title || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-zinc-100 font-semibold group-hover:text-red-400 transition-colors line-clamp-2">
                  {transcript.video?.title || 'Untitled Video'}
                </h3>
                <div className="text-xs font-mono text-red-400 ml-4 flex-shrink-0">
                  {formatDate(transcript.video?.publishedAt)}
                </div>
              </div>
              <p className="text-sm text-zinc-400 mb-2">
                {transcript.video?.channelTitle || 'Unknown Channel'}
              </p>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>{formatDuration(transcript.duration)}</span>
                <span>{transcript.wordCount?.toLocaleString() || 0} words</span>
                {transcript.language && (
                  <span className="uppercase">{transcript.language}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

