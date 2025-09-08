import { useCallback, useEffect, useRef } from 'react';
import { usePicklist } from '../contexts/PicklistContext';
import { usePicklistPersistence } from './usePicklistPersistence';
import { devLog } from '../utils/logger';

// Hook that combines context state management with persistence
export const usePicklistSync = (shareId = null, options = {}) => {
  const {
    broadcastUpdate = null,
    onPicklistUpdate = null,
    suppressWebSocket = false
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

  const { persistPicklist, loadPicklist } = usePicklistPersistence(shareId);
  const lastPersistedTime = useRef(0);

  // Auto-persist when picklist changes (debounced)
  useEffect(() => {
    if (!lastUpdated || lastUpdated <= lastPersistedTime.current) {
      return; // No changes to persist
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const result = await persistPicklist(picklist);
        
        if (result.success) {
          lastPersistedTime.current = Date.now();
          devLog('✅ Auto-persisted picklist changes');
          
          // Notify parent component of changes (for non-shared lists)
          if (onPicklistUpdate && !shareId) {
            onPicklistUpdate(picklist);
          }
        } else {
          setError(result.error);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [lastUpdated, picklist, persistPicklist, setLoading, setError, onPicklistUpdate, shareId]);

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
      const result = await persistPicklist(picklist);
      if (result.success) {
        lastPersistedTime.current = Date.now();
        devLog('✅ Force persisted picklist');
        return { success: true };
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
  }, [persistPicklist, picklist, setLoading, setError]);

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
    
    // State flags
    lastUpdated
  };
};

export default usePicklistSync;