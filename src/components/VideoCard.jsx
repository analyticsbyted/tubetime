import React from 'react';
import { Check, Calendar, Youtube, ExternalLink, Eye, ThumbsUp, MessageCircle, Clock } from 'lucide-react';
import { formatDuration } from '../services/youtubeService';

const VideoCard = ({ video, isSelected, onToggleSelection }) => {
  const { 
    id, 
    title, 
    channelTitle, 
    publishedAt, 
    thumbnailUrl,
    duration,
    viewCount,
    likeCount,
    commentCount,
  } = video;

  const formatDateReadable = (isoString) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div 
      className={`group flex flex-col bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-red-900/20 cursor-pointer ${
        isSelected 
          ? 'border-red-500 ring-2 ring-red-500/20' 
          : 'border-zinc-800 hover:border-zinc-600'
      }`}
      onClick={() => onToggleSelection(id)}
    >
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={thumbnailUrl} 
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-zinc-950/0 group-hover:bg-zinc-950/20 transition-colors flex items-center justify-center">
          <Youtube className="w-12 h-12 text-zinc-100 opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 drop-shadow-lg" />
        </div>
        <div 
          className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all shadow-lg ${
            isSelected 
              ? 'bg-red-600 border-red-600' 
              : 'bg-zinc-900/90 border-zinc-700 group-hover:border-zinc-600'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(id);
          }}
        >
          {isSelected && <Check size={12} className="text-zinc-100" strokeWidth={3} />}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="text-xs font-mono text-red-400 mb-2 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDateReadable(publishedAt)}
        </div>
        
        <h3 className="text-zinc-100 font-semibold leading-tight mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
          {title}
        </h3>
        
        {/* Metadata */}
        {(duration || viewCount !== undefined || likeCount !== undefined || commentCount !== undefined) && (
          <div className="flex flex-wrap gap-2 mb-2 text-xs text-zinc-500">
            {duration && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {formatDuration(duration)}
              </span>
            )}
            {viewCount !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatNumber(viewCount)}
              </span>
            )}
            {likeCount !== undefined && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {formatNumber(likeCount)}
              </span>
            )}
            {commentCount !== undefined && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {formatNumber(commentCount)}
              </span>
            )}
          </div>
        )}
        
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-zinc-800">
          <span className="text-zinc-400 text-xs font-medium truncate max-w-[70%]">
            {channelTitle}
          </span>
          <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
