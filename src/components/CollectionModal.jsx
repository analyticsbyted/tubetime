import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useCollectionsMutation } from '../hooks/useCollectionsQuery';

const CollectionModal = ({ isOpen, onClose, selectedVideos, selectedIds }) => {
  const [collectionName, setCollectionName] = useState('');
  const { data: session, status } = useSession();
  const { createCollection, addVideos } = useCollectionsMutation();

  if (!isOpen) return null;

  const handleSave = () => {
    if (!collectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    const trimmedName = collectionName.trim();

    // Require authentication for database-only operations
    if (!session || status === 'loading') {
      toast.error('Please sign in to save collections.');
      return;
    }

    // Create collection first, then add videos
    createCollection.mutate(trimmedName, {
      onSuccess: (collection) => {
        // After collection is created, add videos to it
        addVideos.mutate(
          { collectionId: collection.id, videos: selectedVideos },
          {
            onSuccess: (addResult) => {
              if (addResult.failed > 0) {
                toast.warning(
                  `Collection created, but ${addResult.failed} video(s) failed to add. ${addResult.success} video(s) added successfully.`
                );
              } else {
                toast.success(`Collection "${trimmedName}" saved successfully!`);
              }
              setCollectionName('');
              onClose();
            },
            onError: (error) => {
              toast.error(error.message || 'Failed to add videos to collection. Please try again.');
            },
          }
        );
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to save collection. Please try again.');
      },
    });
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
          
          {!session && status !== 'loading' && (
            <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">
              <p className="font-medium mb-1">⚠️ Sign in required</p>
              <p className="text-red-300/80">Please sign in to save collections. Collections are stored securely in your account.</p>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={createCollection.isPending || addVideos.isPending}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!collectionName.trim() || createCollection.isPending || addVideos.isPending || status === 'loading'}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-zinc-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(createCollection.isPending || addVideos.isPending) ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Collection'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionModal;

