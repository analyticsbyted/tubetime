import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { createCollection, addVideosToCollection } from '../services/collectionsService';
import { saveCollection } from '../utils/collections';

const CollectionModal = ({ isOpen, onClose, selectedVideos, selectedIds }) => {
  const [collectionName, setCollectionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { data: session, status } = useSession();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!collectionName.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    setIsSaving(true);
    const trimmedName = collectionName.trim();
    const videoIdsArray = Array.from(selectedIds);

    try {
      // Dual-write pattern: Write to both database and localStorage
      let dbCollectionId = null;
      let dbSuccess = false;
      let localStorageSuccess = false;

      // 1. Try to save to database if authenticated
      if (session && status !== 'loading') {
        try {
          const collection = await createCollection(trimmedName);
          dbCollectionId = collection.id;
          
          // Add videos to collection one by one
          const addResult = await addVideosToCollection(collection.id, selectedVideos);
          
          if (addResult.failed > 0) {
            toast.warning(
              `Collection created, but ${addResult.failed} video(s) failed to add. ${addResult.success} video(s) added successfully.`
            );
          } else {
            dbSuccess = true;
          }
        } catch (dbError) {
          console.error('Database save failed:', dbError);
          // Continue to localStorage fallback
          if (dbError.message.includes('Unauthorized') || dbError.message.includes('sign in')) {
            // User session expired, but continue with localStorage
            toast.info('Session expired. Saving locally. Sign in to sync to cloud.');
          }
        }
      }

      // 2. Always save to localStorage during dual-write period
      try {
        const localStorageId = saveCollection(trimmedName, videoIdsArray, selectedVideos);
        localStorageSuccess = true;
        
        // If database save failed, use localStorage ID
        if (!dbCollectionId) {
          dbCollectionId = localStorageId;
        }
      } catch (localStorageError) {
        console.error('localStorage save failed:', localStorageError);
        // If both fail, show error
        if (!dbSuccess) {
          throw new Error('Failed to save collection. Please try again.');
        }
      }

      // 3. Show appropriate success message
      if (dbSuccess && localStorageSuccess) {
        toast.success(`Collection "${trimmedName}" saved successfully!`);
      } else if (dbSuccess && !localStorageSuccess) {
        toast.success(`Collection "${trimmedName}" saved to cloud!`, {
          description: 'Local save failed, but your collection is safely stored.',
        });
      } else if (!dbSuccess && localStorageSuccess) {
        if (session) {
          toast.warning(`Collection "${trimmedName}" saved locally.`, {
            description: 'Cloud save failed, but your collection is saved locally. Please try again later.',
          });
        } else {
          toast.success(`Collection "${trimmedName}" saved locally!`, {
            description: 'Sign in to sync your collections across devices.',
          });
        }
      }

      setCollectionName('');
      onClose();
    } catch (error) {
      console.error('Failed to save collection:', error);
      toast.error(error.message || 'Failed to save collection. Please try again.');
    } finally {
      setIsSaving(false);
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
          
          {!session && status !== 'loading' && (
            <div className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-lg p-3 mb-4">
              <p className="font-medium mb-1">💡 Sign in to sync</p>
              <p className="text-blue-300/80">Your collection will be saved locally. Sign in to sync across devices and access your collections from anywhere.</p>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!collectionName.trim() || isSaving || status === 'loading'}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-zinc-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
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

