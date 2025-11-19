import React from 'react';
import { X, FileText } from 'lucide-react';

const ActionBar = ({ selectedCount, onQueue, onClear }) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-auto sm:right-4 sm:w-auto z-30">
      <div className="bg-zinc-900/95 backdrop-blur-md border-t sm:border border-zinc-800 sm:rounded-xl shadow-xl p-3 flex items-center justify-between sm:justify-center sm:gap-3">
        <span className="font-semibold text-sm text-zinc-200">
          {selectedCount} <span className="hidden sm:inline">selected</span>
        </span>
        <button
          onClick={onQueue}
          className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors shadow-lg shadow-red-900/20"
        >
          <FileText size={16} />
          Queue for Transcription
        </button>
        <button 
          onClick={onClear} 
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          aria-label="Clear selection"
        >
          <X size={18} className="text-zinc-400" />
        </button>
      </div>
    </div>
  );
};

export default ActionBar;
