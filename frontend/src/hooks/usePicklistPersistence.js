import { useCallback, useEffect, useRef } from 'react';
import { devLog } from '../utils/logger';
import apiClient from '../utils/apiClient';

// Hook for handling picklist persistence to different backends
export const usePicklistPersistence = (shareId = null) => {
  const saveInProgress = useRef(false);

  // Session storage removed - all lists are now shared

  // Save to database (for shared lists)
  const saveToDatabase = useCallback(async (picklist) => {
    if (!shareId) return { success: false, error: 'No share ID provided' };

    try {
      await apiClient.updateSharedListPicklist(shareId, picklist);
      devLog('✅ Saved picklist to database');
      return { success: true };
    } catch (error) {
      console.error('❌ Database save error:', error);
      return { success: false, error: error.message };
    }
  }, [shareId]);

  // Main persistence function - only saves to database
  const persistPicklist = useCallback(async (picklist) => {
    if (saveInProgress.current) {
      devLog('⏳ Save already in progress, skipping...');
      return { success: false, error: 'Save in progress' };
    }

    saveInProgress.current = true;

    try {
      let result;
      if (shareId) {
        // Shared list - save to database
        result = await saveToDatabase(picklist);
      } else {
        // No session storage - return error for local lists
        return { success: false, error: 'No share ID provided - session storage removed' };
      }

      return result;
    } finally {
      saveInProgress.current = false;
    }
  }, [shareId, saveToDatabase]);

  // Session loading removed - all lists are now shared

  // Load from database
  const loadFromDatabase = useCallback(async () => {
    if (!shareId) return { success: false, error: 'No share ID provided' };

    try {
      const data = await apiClient.getSharedList(shareId);
      if (data && data.picklist) {
        devLog('✅ Loaded picklist from database:', data.picklist.length, 'items');
        return { success: true, picklist: data.picklist };
      }
      return { success: false, error: 'No database data found' };
    } catch (error) {
      console.error('❌ Database load error:', error);
      return { success: false, error: error.message };
    }
  }, [shareId]);

  // Main load function - only loads from database
  const loadPicklist = useCallback(async () => {
    if (shareId) {
      // Shared list - load from database
      return await loadFromDatabase();
    } else {
      // No session storage - return error for local lists
      return { success: false, error: 'No share ID provided - session storage removed' };
    }
  }, [shareId, loadFromDatabase]);

  // Clear storage removed - all lists are now shared

  return {
    persistPicklist,
    loadPicklist,
    saveInProgress: saveInProgress.current
  };
};

export default usePicklistPersistence;