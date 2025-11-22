'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { getTranscript } from '../services/transcriptService';
import TranscriptViewer from './TranscriptViewer';
import { toast } from 'sonner';

/**
 * TranscriptModal - Modal wrapper for TranscriptViewer with loading and error states
 * 
 * @param {Object} props
 * @param {string} props.videoId - YouTube video ID
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Object} [props.video] - Optional video metadata (if not provided, will be fetched from transcript)
 */
const TranscriptModal = ({ videoId, isOpen, onClose, video: providedVideo }) => {
  const [transcript, setTranscript] = useState(null);
  const [video, setVideo] = useState(providedVideo || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen && videoId) {
      fetchTranscript();
    } else {
      // Reset state when modal closes
      setTranscript(null);
      setVideo(providedVideo || null);
      setError(null);
    }
  }, [isOpen, videoId]);

  const fetchTranscript = async () => {
    if (!videoId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getTranscript(videoId);
      
      if (!data) {
        setError('Transcript not found for this video.');
        return;
      }

      setTranscript(data);
      // Use video data from transcript if not provided
      if (data.video && !providedVideo) {
        setVideo(data.video);
      }
    } catch (err) {
      console.error('Failed to fetch transcript:', err);
      setError(err.message || 'Failed to load transcript. Please try again.');
      toast.error('Failed to load transcript');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Escape key and focus management
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement;
      
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Focus the modal container for accessibility
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
    } else {
      // Restore focus to previous element when modal closes
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={handleBackdropClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={modalRef}
        className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transcript-modal-title"
        aria-describedby="transcript-modal-description"
      >
        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-red-400 animate-spin mx-auto mb-4" />
              <p className="text-zinc-400">Loading transcript...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 id="transcript-error-title" className="text-lg font-semibold text-zinc-100 mb-2">
                Unable to Load Transcript
              </h3>
              <p id="transcript-error-description" className="text-zinc-400 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={fetchTranscript}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-zinc-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  aria-label="Retry loading transcript"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  aria-label="Close transcript modal"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Content */}
        {transcript && video && !isLoading && !error && (
          <TranscriptViewer
            transcript={transcript}
            video={video}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default TranscriptModal;

