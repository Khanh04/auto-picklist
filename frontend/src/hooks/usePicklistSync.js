import { useCallback, useEffect, useRef } from 'react';
import { usePicklist } from '../contexts/PicklistContext';
import { usePicklistPersistence } from './usePicklistPersistence';
import { devLog } from '../utils/logger';

// Hook that combines context state management with persistence
export const usePicklistSync = (shareId = null, options = {}) => {
  const {
    broadcastUpdate = null,
    onPicklistUpdate = null,
    suppressWebSocket = false,
    draftKey: currentDraftKey = null,
    title = null,
    sourceFileName = null
  } = options;

  const { 
    picklist, 
    updateItem, 
    updateMultipleItems,
    setPicklist, 
    setLoading, 
    setError,
    lastUpdated
  } = usePicklist();

  const {
    persistPicklist,
    loadPicklist,
    currentDraftKey: draftKeyFromHook,
    setCurrentDraftKey,
    isDraft,
    isShared
  } = usePicklistPersistence(shareId, currentDraftKey);
  const lastPersistedTime = useRef(0);

  // Auto-persist when picklist changes (debounced)
  useEffect(() => {
    if (!lastUpdated || lastUpdated <= lastPersistedTime.current) {
      return; // No changes to persist
    }

    const saveStrategy = shareId ? 'immediate' : 'draft';
    const debounceTime = shareId ? 300 : 2000; // 2s for drafts, 300ms for shared

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const result = await persistPicklist(picklist, {
          title: title || 'Draft Picklist',
          sourceFileName: sourceFileName || null
        });

        if (result.success) {
          lastPersistedTime.current = Date.now();

          // Update draft key if this is a new draft
          if (result.draftKey && !draftKeyFromHook) {
            setCurrentDraftKey(result.draftKey);
          }

          devLog(`✅ Auto-persisted picklist (${saveStrategy}):`, result.draftKey || shareId);

          // Notify parent component of changes
          if (onPicklistUpdate) {
            onPicklistUpdate(picklist, {
              draftKey: result.draftKey,
              lastSavedAt: result.lastSavedAt,
              saveStrategy
            });
          }
        } else {
          setError(result.error);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }, debounceTime);

    return () => clearTimeout(timeoutId);
  }, [lastUpdated, picklist, persistPicklist, setLoading, setError, onPicklistUpdate,
      shareId, title, sourceFileName, draftKeyFromHook, setCurrentDraftKey]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await loadPicklist();
      
      if (result.success && result.picklist) {
        setPicklist(result.picklist);
        lastPersistedTime.current = Date.now();
        devLog('✅ Loaded initial picklist data');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [loadPicklist, setPicklist, setLoading, setError]);

  // Add periodic force-save for drafts (every 30 seconds)
  useEffect(() => {
    if (shareId) return; // Only for drafts (non-shared lists)

    const interval = setInterval(async () => {
      if (picklist?.length > 0) {
        try {
          const result = await persistPicklist(picklist, {
            title: title || 'Draft Picklist',
            sourceFileName: sourceFileName || null
          });
          if (result.success) {
            devLog('🔄 Periodic draft save completed:', result.draftKey);
          }
        } catch (error) {
          console.error('❌ Periodic save failed:', error);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [shareId, picklist, persistPicklist, title, sourceFileName]);

  // Enhanced update functions with persistence and broadcasting
  const updateItemSync = useCallback(async (index, changes, broadcastOptions = {}) => {
    const {
      broadcast = false,
      suppressPersistence = false
    } = broadcastOptions;

    // Update local state immediately
    updateItem(index, changes);
    
    // Broadcast to other clients if needed
    if (broadcast && broadcastUpdate && !suppressWebSocket && shareId) {
      try {
        broadcastUpdate({
          itemIndex: index,
          changes,
          timestamp: Date.now(),
          updateType: 'item_update'
        });
        devLog(`📡 Broadcasted update for item ${index}`);
      } catch (error) {
        console.error('❌ Broadcast failed:', error);
      }
    }

    // If immediate persistence is needed (for shared lists)
    if (!suppressPersistence && shareId) {
      try {
        // For shared lists, we also need to update the database immediately
        // This will be handled by the auto-persist effect, but we can add
        // specific shared list API calls here if needed
      } catch (error) {
        console.error('❌ Immediate persistence failed:', error);
      }
    }
  }, [updateItem, broadcastUpdate, suppressWebSocket, shareId]);

  const updateMultipleItemsSync = useCallback(async (updates, broadcastOptions = {}) => {
    const { broadcast = false } = broadcastOptions;

    // Update local state immediately
    updateMultipleItems(updates);
    
    // Broadcast to other clients if needed
    if (broadcast && broadcastUpdate && !suppressWebSocket && shareId) {
      try {
        broadcastUpdate({
          updates,
          timestamp: Date.now(),
          updateType: 'bulk_update'
        });
        devLog(`📡 Broadcasted bulk update for ${updates.length} items`);
      } catch (error) {
        console.error('❌ Broadcast failed:', error);
      }
    }
  }, [updateMultipleItems, broadcastUpdate, suppressWebSocket, shareId]);

  // Force persist immediately (for critical operations)
  const forcePersist = useCallback(async () => {
    try {
      setLoading(true);
      const result = await persistPicklist(picklist, {
        title: title || 'Draft Picklist',
        sourceFileName: sourceFileName || null
      });
      if (result.success) {
        lastPersistedTime.current = Date.now();
        devLog('✅ Force persisted picklist');
        return { success: true, draftKey: result.draftKey };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [persistPicklist, picklist, setLoading, setError, title, sourceFileName]);

  return {
    // State
    picklist,

    // Actions
    updateItem: updateItemSync,
    updateMultipleItems: updateMultipleItemsSync,
    setPicklist,

    // Utilities
    loadInitialData,
    forcePersist,

    // Draft management
    currentDraftKey: draftKeyFromHook,
    setCurrentDraftKey,
    isDraft,
    isShared,

    // State flags
    lastUpdated
  };
};

export default usePicklistSync;