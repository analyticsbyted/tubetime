import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Copy, Download, FileText, Clock, Globe, BarChart3, X, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

/**
 * TranscriptViewer - Main component for displaying transcript content
 * 
 * Performance Note:
 * - For 15-minute videos (hard limit), rendering performance is excellent without virtualization
 * - Typical transcripts: ~200-500 segments, renders smoothly
 * - If future iterations support longer videos (>30 min), consider adding react-window
 *   for virtualization when segment count exceeds 500
 * 
 * @param {Object} props
 * @param {Object} props.transcript - Transcript data from API
 * @param {Object} props.video - Video metadata
 * @param {Function} props.onClose - Close handler
 */
const TranscriptViewer = ({ transcript, video, onClose }) => {
  const [showFullText, setShowFullText] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const contentRef = useRef(null);
  const matchRefs = useRef([]);

  // Format timestamp from seconds to [MM:SS]
  const formatTimestamp = (seconds) => {
    if (typeof seconds !== 'number') return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
  };

  // Parse segments if available
  const segments = useMemo(() => {
    if (!transcript.segments || !Array.isArray(transcript.segments)) {
      return null;
    }
    return transcript.segments;
  }, [transcript.segments]);

  // Find all matches in text
  const findMatches = (text, query) => {
    if (!query || !text) return [];
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
    return matches;
  };

  // Highlight text with search matches
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const matches = findMatches(text, query);
    if (matches.length === 0) return text;

    const parts = [];
    let lastIndex = 0;

    matches.forEach((match) => {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), isMatch: false });
      }
      // Add highlighted match
      parts.push({
        text: text.substring(match.index, match.index + match.length),
        isMatch: true,
      });
      lastIndex = match.index + match.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isMatch: false });
    }

    return parts;
  };

  // Update match count when search query changes
  useEffect(() => {
    // Reset match refs when search changes
    matchRefs.current = [];

    if (!searchQuery.trim()) {
      setMatchCount(0);
      setCurrentMatchIndex(0);
      return;
    }

    const text = showFullText ? transcript.content : 
      (segments ? segments.map(s => s.text || s).join(' ') : transcript.content);
    const matches = findMatches(text, searchQuery);
    setMatchCount(matches.length);
    setCurrentMatchIndex(0);
  }, [searchQuery, showFullText, transcript.content, segments]);

  // Scroll to current match
  useEffect(() => {
    if (matchCount === 0 || !searchQuery.trim()) return;

    const currentRef = matchRefs.current[currentMatchIndex];
    if (currentRef && contentRef.current) {
      currentRef.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentMatchIndex, matchCount, searchQuery]);

  // Handle search navigation
  const handleNextMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
  };

  const handlePreviousMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
  };

  // Handle keyboard shortcuts for search navigation
  useEffect(() => {
    if (!searchQuery.trim()) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        // Focus search input (handled by browser default)
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handlePreviousMatch();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleNextMatch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, matchCount]);

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript.content);
      toast.success('Transcript copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy transcript');
    }
  };

  // Handle export as text file
  const handleExport = () => {
    try {
      const blob = new Blob([transcript.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${video.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Transcript exported');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export transcript');
    }
  };

  // Format metadata values
  const formatMetadata = () => {
    const items = [];
    
    if (transcript.language) {
      items.push({ icon: Globe, label: transcript.language.toUpperCase() });
    }
    
    if (transcript.wordCount) {
      items.push({ 
        icon: BarChart3, 
        label: `${transcript.wordCount.toLocaleString()} words` 
      });
    }
    
    if (transcript.confidence) {
      items.push({ 
        icon: BarChart3, 
        label: `${Math.round(transcript.confidence * 100)}% confidence` 
      });
    }
    
    if (transcript.duration) {
      const mins = Math.floor(transcript.duration / 60);
      const secs = transcript.duration % 60;
      items.push({ 
        icon: Clock, 
        label: `${mins}:${secs.toString().padStart(2, '0')}` 
      });
    }
    
    return items;
  };

  const metadataItems = formatMetadata();

  // Render text with highlighted matches
  const renderHighlightedText = (text, query, startMatchIndex = 0) => {
    if (!query || !query.trim()) {
      return { element: <span>{text}</span>, nextMatchIndex: startMatchIndex };
    }

    const parts = highlightText(text, query);
    let matchIndex = startMatchIndex;

    const element = (
      <>
        {parts.map((part, index) => {
          if (part.isMatch) {
            const isCurrentMatch = matchIndex === currentMatchIndex;
            const currentMatchIndexForRef = matchIndex;
            const matchRef = (el) => {
              if (el) {
                matchRefs.current[currentMatchIndexForRef] = el;
              }
            };
            matchIndex++;
            return (
              <mark
                key={index}
                ref={matchRef}
                className={`${
                  isCurrentMatch
                    ? 'bg-red-500 text-zinc-100 font-semibold'
                    : 'bg-yellow-500/30 text-zinc-200'
                } rounded px-0.5`}
                aria-current={isCurrentMatch ? 'true' : undefined}
              >
                {part.text}
              </mark>
            );
          }
          return <span key={index}>{part.text}</span>;
        })}
      </>
    );

    return { element, nextMatchIndex: matchIndex };
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-400" aria-hidden="true" />
          <h2 id="transcript-modal-title" className="text-lg font-semibold text-zinc-100">
            Transcript: {video.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded p-1"
          aria-label="Close transcript"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Metadata */}
      {metadataItems.length > 0 && (
        <div
          id="transcript-modal-description"
          className="px-4 py-3 border-b border-zinc-800 flex flex-wrap gap-4 text-xs text-zinc-400"
          role="region"
          aria-label="Transcript metadata"
        >
          {metadataItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center gap-1">
                <Icon className="w-3 h-3" aria-hidden="true" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="relative flex items-center gap-2">
          <label htmlFor="transcript-search" className="sr-only">
            Search in transcript
          </label>
          <Search className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" aria-hidden="true" />
          <input
            id="transcript-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in transcript..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 transition-colors text-sm"
            aria-label="Search in transcript"
            aria-describedby={searchQuery.trim() && matchCount > 0 ? "search-results" : undefined}
          />
          {searchQuery.trim() && matchCount > 0 && (
            <div id="search-results" className="flex items-center gap-2 text-xs text-zinc-400" role="status" aria-live="polite">
              <span className="font-mono" aria-label={`Match ${currentMatchIndex + 1} of ${matchCount}`}>
                {currentMatchIndex + 1} / {matchCount}
              </span>
              <button
                onClick={handlePreviousMatch}
                className="p-1 hover:bg-zinc-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
                title="Previous match (Shift+Enter)"
                aria-label={`Go to previous match, currently on match ${currentMatchIndex + 1} of ${matchCount}`}
              >
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleNextMatch}
                className="p-1 hover:bg-zinc-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
                title="Next match (Enter)"
                aria-label={`Go to next match, currently on match ${currentMatchIndex + 1} of ${matchCount}`}
              >
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
          {searchQuery.trim() && matchCount === 0 && (
            <span className="text-xs text-zinc-500" role="status" aria-live="polite">No matches</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-label="Copy transcript to clipboard"
        >
          <Copy className="w-4 h-4" aria-hidden="true" />
          Copy
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-label="Export transcript as text file"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Export
        </button>
        {segments && (
          <button
            onClick={() => {
              setShowFullText(!showFullText);
              setSearchQuery(''); // Clear search when switching views
            }}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            aria-label={showFullText ? 'Switch to segments view' : 'Switch to full text view'}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            {showFullText ? 'Show Segments' : 'Show Full Text'}
          </button>
        )}
      </div>

      {/* Transcript Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto p-4"
        role="region"
        aria-label="Transcript content"
        tabIndex={0}
      >
        {showFullText ? (
          // Full text view with highlighting
          (() => {
            const { element } = renderHighlightedText(transcript.content, searchQuery, 0);
            return (
              <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {element}
              </div>
            );
          })()
        ) : segments ? (
          // Segments view with highlighting
          (() => {
            let matchIndex = 0;
            return (
              <div className="space-y-4">
                {segments.map((segment, index) => {
                  const segmentText = segment.text || segment;
                  const { element, nextMatchIndex } = renderHighlightedText(
                    segmentText,
                    searchQuery,
                    matchIndex
                  );
                  matchIndex = nextMatchIndex;
                  return (
                    <div
                      key={index}
                      className="pb-4 border-b border-zinc-800 last:border-b-0"
                    >
                      {segment.start !== undefined && (
                        <div className="text-xs font-mono text-red-400 mb-2">
                          {formatTimestamp(segment.start)}
                          {segment.end !== undefined && ` - ${formatTimestamp(segment.end)}`}
                        </div>
                      )}
                      <p className="text-zinc-300 leading-relaxed">{element}</p>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          // Fallback to full text if no segments
          (() => {
            const { element } = renderHighlightedText(transcript.content, searchQuery, 0);
            return (
              <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {element}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;

