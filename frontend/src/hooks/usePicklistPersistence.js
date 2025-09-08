import { useCallback, useEffect, useRef } from 'react';
import { devLog } from '../utils/logger';

// Hook for handling picklist persistence to different backends
export const usePicklistPersistence = (shareId = null) => {
  const saveInProgress = useRef(false);

  // Save to session storage (for non-shared lists)
  const saveToSession = useCallback(async (picklist) => {
    try {
      const response = await fetch('/api/session/picklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picklist })
      });

      if (response.ok) {
        devLog('✅ Saved picklist to session storage');
        return { success: true };
      } else {
        console.error('❌ Failed to save picklist to session storage');
        return { success: false, error: 'Session save failed' };
      }
    } catch (error) {
      console.error('❌ Session storage error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Save to database (for shared lists)
  const saveToDatabase = useCallback(async (picklist) => {
    if (!shareId) return { success: false, error: 'No share ID provided' };

    try {
      const response = await fetch(`/api/shopping-list/share/${shareId}/picklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picklist })
      });

      if (response.ok) {
        devLog('✅ Saved picklist to database');
        return { success: true };
      } else {
        console.error('❌ Failed to save picklist to database');
        return { success: false, error: 'Database save failed' };
      }
    } catch (error) {
      console.error('❌ Database save error:', error);
      return { success: false, error: error.message };
    }
  }, [shareId]);

  // Main persistence function - chooses appropriate backend
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
        // Local list - save to session
        result = await saveToSession(picklist);
      }
      
      return result;
    } finally {
      saveInProgress.current = false;
    }
  }, [shareId, saveToDatabase, saveToSession]);

  // Load from session storage
  const loadFromSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session/picklist');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.picklist) {
          devLog('✅ Loaded picklist from session storage:', data.picklist.length, 'items');
          return { success: true, picklist: data.picklist };
        }
      }
      return { success: false, error: 'No session data found' };
    } catch (error) {
      console.error('❌ Session load error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Load from database
  const loadFromDatabase = useCallback(async () => {
    if (!shareId) return { success: false, error: 'No share ID provided' };

    try {
      const response = await fetch(`/api/shopping-list/share/${shareId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.picklist) {
          devLog('✅ Loaded picklist from database:', data.data.picklist.length, 'items');
          return { success: true, picklist: data.data.picklist };
        }
      }
      return { success: false, error: 'No database data found' };
    } catch (error) {
      console.error('❌ Database load error:', error);
      return { success: false, error: error.message };
    }
  }, [shareId]);

  // Main load function - chooses appropriate backend
  const loadPicklist = useCallback(async () => {
    if (shareId) {
      // Shared list - load from database
      return await loadFromDatabase();
    } else {
      // Local list - load from session
      return await loadFromSession();
    }
  }, [shareId, loadFromDatabase, loadFromSession]);

  // Clear storage
  const clearStorage = useCallback(async () => {
    try {
      await fetch('/api/session/picklist', { method: 'DELETE' });
      devLog('✅ Cleared session storage');
      return { success: true };
    } catch (error) {
      console.error('❌ Clear storage error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    persistPicklist,
    loadPicklist,
    clearStorage,
    saveInProgress: saveInProgress.current
  };
};

export default usePicklistPersistence;