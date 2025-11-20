import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { saveCollection } from '../utils/collections';

const CollectionModal = ({ isOpen, onClose, selectedVideos, selectedIds }) => {
  const [collectionName, setCollectionName] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!collectionName.trim()) {
      alert('Please enter a collection name');
      return;
    }

    try {
      saveCollection(collectionName.trim(), Array.from(selectedIds), selectedVideos);
      setCollectionName('');
      onClose();
    } catch (error) {
      alert('Failed to save collection: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Save className="w-5 h-5 text-red-500" />
            Save Collection
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Collection Name
            </label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="My Video Collection"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:outline-none focus:border-red-500 transition-colors"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>
          
          <div className="text-xs text-zinc-500">
            {selectedIds.size} video{selectedIds.size !== 1 ? 's' : ''} will be saved to this collection
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!collectionName.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-zinc-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Collection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionModal;

