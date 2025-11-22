import React from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { parseISODurationToSeconds } from '../utils/duration';

/**
 * Estimates transcription time based on video duration
 * Rough estimate: ~1 minute of processing per minute of video
 * @param {string|number} duration - ISO duration string or seconds
 * @returns {number} Estimated processing time in seconds
 */
function estimateProcessingTime(duration) {
  const seconds = typeof duration === 'string' 
    ? parseISODurationToSeconds(duration) 
    : duration;
  
  if (!seconds || seconds <= 0) {
    return 60; // Default 1 minute
  }
  
  // Rough estimate: 1 minute of processing per minute of video
  // Minimum 30 seconds, maximum 5 minutes
  const estimated = Math.max(30, Math.min(seconds, 300));
  return estimated;
}

/**
 * Formats seconds into a human-readable time string
 */
function formatTime(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * TranscriptionProgress component
 * Shows progress for queued/processing transcriptions
 */
export default function TranscriptionProgress({ 
  queueItems = [], 
  onViewTranscript,
  onDismiss 
}) {
  if (!queueItems || queueItems.length === 0) {
    return null;
  }

  const pendingItems = queueItems.filter(item => item.status === 'pending');
  const processingItems = queueItems.filter(item => item.status === 'processing');
  const completedItems = queueItems.filter(item => item.status === 'completed');
  const failedItems = queueItems.filter(item => item.status === 'failed');

  const hasActiveItems = pendingItems.length > 0 || processingItems.length > 0;

  if (!hasActiveItems && completedItems.length === 0 && failedItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-full max-w-md">
      <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Transcription Queue
          </h3>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>

        {/* Processing Items */}
        {processingItems.map((item) => {
          const estimatedTime = estimateProcessingTime(item.video?.duration);
          const startedAt = item.processingStartedAt 
            ? new Date(item.processingStartedAt) 
            : new Date();
          const elapsed = (Date.now() - startedAt.getTime()) / 1000;
          const remaining = Math.max(0, estimatedTime - elapsed);

          return (
            <div
              key={item.id}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">
                    {item.video?.title || 'Processing...'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Transcribing audio...
                  </p>
                </div>
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>
                  {remaining > 0 
                    ? `~${formatTime(remaining)} remaining`
                    : 'Almost done...'
                  }
                </span>
              </div>
            </div>
          );
        })}

        {/* Pending Items */}
        {pendingItems.map((item) => {
          const estimatedTime = estimateProcessingTime(item.video?.duration);
          
          return (
            <div
              key={item.id}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">
                    {item.video?.title || 'Queued'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Waiting to process...
                  </p>
                </div>
                <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>Est. {formatTime(estimatedTime)}</span>
              </div>
            </div>
          );
        })}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <div className="space-y-2">
            {completedItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-green-900/20 border border-green-800/50 rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-100 truncate">
                      {item.video?.title || 'Completed'}
                    </p>
                    <p className="text-xs text-green-400/80 mt-1">
                      Transcript ready!
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                </div>
                {onViewTranscript && item.videoId && (
                  <button
                    onClick={() => onViewTranscript(item.videoId)}
                    className="mt-2 text-xs text-green-300 hover:text-green-200 underline"
                  >
                    View Transcript →
                  </button>
                )}
              </div>
            ))}
            {completedItems.length > 3 && (
              <p className="text-xs text-zinc-400 text-center">
                +{completedItems.length - 3} more completed
              </p>
            )}
          </div>
        )}

        {/* Failed Items */}
        {failedItems.length > 0 && (
          <div className="space-y-2">
            {failedItems.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="bg-red-900/20 border border-red-800/50 rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-100 truncate">
                      {item.video?.title || 'Failed'}
                    </p>
                    <p className="text-xs text-red-400/80 mt-1">
                      {item.errorMessage || 'Transcription failed'}
                    </p>
                  </div>
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                </div>
              </div>
            ))}
            {failedItems.length > 2 && (
              <p className="text-xs text-zinc-400 text-center">
                +{failedItems.length - 2} more failed
              </p>
            )}
          </div>
        )}

        {/* Summary */}
        {(pendingItems.length > 0 || processingItems.length > 0) && (
          <div className="pt-2 border-t border-zinc-700">
            <p className="text-xs text-zinc-400 text-center">
              {pendingItems.length > 0 && `${pendingItems.length} pending`}
              {pendingItems.length > 0 && processingItems.length > 0 && ' • '}
              {processingItems.length > 0 && `${processingItems.length} processing`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

