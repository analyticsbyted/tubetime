import React, { useState } from 'react';
import { X, FileText, Download, ChevronDown, Save } from 'lucide-react';
import { exportToJSON, exportToCSV, exportVideoIds } from '../utils/export';

const ActionBar = ({ selectedCount, selectedVideos, selectedIds, onQueue, onClear, onSaveCollection }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleExport = (format) => {
    if (!selectedVideos || selectedVideos.length === 0) return;
    
    const selectedIds = new Set(selectedVideos.map(v => v.id));
    
    switch (format) {
      case 'json':
        exportToJSON(selectedVideos, selectedIds);
        break;
      case 'csv':
        exportToCSV(selectedVideos, selectedIds);
        break;
      case 'ids':
        exportVideoIds(selectedIds);
        break;
      default:
        break;
    }
    setShowExportMenu(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-auto sm:right-4 sm:w-auto z-30">
      <div className="bg-zinc-900/95 backdrop-blur-md border-t sm:border border-zinc-800 sm:rounded-xl shadow-xl p-3 flex items-center justify-between sm:justify-center sm:gap-3">
        <span className="font-semibold text-sm text-zinc-200">
          {selectedCount} <span className="hidden sm:inline">selected</span>
        </span>
        
        {/* Save Collection */}
        {onSaveCollection && (
          <button
            onClick={onSaveCollection}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2 px-3 rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <Save size={16} />
            Save Collection
          </button>
        )}

        {/* Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2 px-3 rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <Download size={16} />
            Export
            <ChevronDown size={14} className={showExportMenu ? 'rotate-180' : ''} />
          </button>
          
          {showExportMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute bottom-full right-0 mb-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-50 min-w-[150px]">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('ids')}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Export IDs Only
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onQueue}
          className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-zinc-100 font-semibold py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors shadow-lg shadow-red-900/20"
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
