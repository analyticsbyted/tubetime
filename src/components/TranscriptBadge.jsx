import React from 'react';
import { FileText, Loader2 } from 'lucide-react';

/**
 * TranscriptBadge - Status indicator badge for video cards
 * 
 * @param {Object} props
 * @param {string} props.videoId - YouTube video ID
 * @param {string|null} props.status - 'available' | 'processing' | 'failed' | null
 * @param {Function} props.onClick - Click handler to open transcript
 */
const TranscriptBadge = ({ videoId, status, onClick }) => {
  if (!status) {
    return null;
  }

  const handleClick = (e) => {
    e.stopPropagation(); // Prevent video card selection
    if (onClick && status === 'available') {
      onClick(videoId);
    }
  };

  const getBadgeStyles = () => {
    switch (status) {
      case 'available':
        return 'bg-green-600/20 border-green-500 text-green-400 hover:bg-green-600/30 cursor-pointer';
      case 'processing':
        return 'bg-yellow-600/20 border-yellow-500 text-yellow-400 cursor-default';
      case 'failed':
        return 'bg-red-600/20 border-red-500 text-red-400 cursor-default';
      default:
        return 'bg-zinc-600/20 border-zinc-500 text-zinc-400';
    }
  };

  const getIcon = () => {
    if (status === 'processing') {
      return <Loader2 className="w-3 h-3 animate-spin" />;
    }
    return <FileText className="w-3 h-3" />;
  };

  const getLabel = () => {
    switch (status) {
      case 'available':
        return 'Transcript';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Failed';
      default:
        return '';
    }
  };

  return (
    <div
      className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors ${getBadgeStyles()}`}
      onClick={handleClick}
      title={status === 'available' ? 'Click to view transcript' : getLabel()}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </div>
  );
};

export default TranscriptBadge;

