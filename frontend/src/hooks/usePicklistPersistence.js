import { useCallback, useEffect, useRef, useState } from 'react';
import { devLog } from '../utils/logger';
import apiClient from '../utils/apiClient';

// Hook for handling picklist persistence to different backends
export const usePicklistPersistence = (shareId = null, draftKey = null) => {
  const saveInProgress = useRef(false);
  const [currentDraftKey, setCurrentDraftKey] = useState(draftKey);

  // Enhanced persistence now supports both shared lists and drafts

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

  // Save to drafts (for non-shared lists)
  const saveToDraft = useCallback(async (picklist, metadata = {}) => {
    if (!picklist?.length) return { success: false, error: 'No picklist data' };

    try {
      const draftData = {
        picklist,
        title: metadata.title || 'Draft Picklist',
        sourceFileName: metadata.sourceFileName,
        draftKey: currentDraftKey // Include existing draft key for updates
      };

      const result = await apiClient.saveDraftPicklist(draftData);

      // Update our current draft key if this was a new draft
      if (result.draftKey && !currentDraftKey) {
        setCurrentDraftKey(result.draftKey);
      }

      devLog('✅ Saved picklist draft:', result.draftKey);
      return { success: true, draftKey: result.draftKey, lastSavedAt: result.lastSavedAt };
    } catch (error) {
      console.error('❌ Draft save error:', error);
      return { success: false, error: error.message };
    }
  }, [currentDraftKey]);

  // Enhanced main persistence function - supports both shared lists and drafts
  const persistPicklist = useCallback(async (picklist, options = {}) => {
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
        // Non-shared list - save as draft
        result = await saveToDraft(picklist, options);
      }

      return result;
    } finally {
      saveInProgress.current = false;
    }
  }, [shareId, saveToDatabase, saveToDraft]);

  // Load from database (shared lists)
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

  // Load from drafts
  const loadFromDraft = useCallback(async () => {
    if (!currentDraftKey) return { success: false, error: 'No draft key provided' };

    try {
      const data = await apiClient.getDraft(currentDraftKey);
      if (data && data.draft && data.draft.picklist) {
        devLog('✅ Loaded draft picklist:', data.draft.picklist.length, 'items');
        return {
          success: true,
          picklist: data.draft.picklist,
          metadata: {
            title: data.draft.title,
            sourceFileName: data.draft.sourceFileName,
            lastSavedAt: data.draft.lastSavedAt
          }
        };
      }
      return { success: false, error: 'No draft data found' };
    } catch (error) {
      console.error('❌ Draft load error:', error);
      return { success: false, error: error.message };
    }
  }, [currentDraftKey]);

  // Enhanced main load function - supports both shared lists and drafts
  const loadPicklist = useCallback(async () => {
    if (shareId) {
      // Shared list - load from database
      return await loadFromDatabase();
    } else if (currentDraftKey) {
      // Draft list - load from drafts
      return await loadFromDraft();
    } else {
      // No share ID or draft key - nothing to load
      return { success: false, error: 'No share ID or draft key provided' };
    }
  }, [shareId, currentDraftKey, loadFromDatabase, loadFromDraft]);

  // Delete current draft
  const deleteDraft = useCallback(async () => {
    if (!currentDraftKey) return { success: false, error: 'No draft to delete' };

    try {
      await apiClient.deleteDraft(currentDraftKey);
      setCurrentDraftKey(null);
      devLog('✅ Deleted draft:', currentDraftKey);
      return { success: true };
    } catch (error) {
      console.error('❌ Draft delete error:', error);
      return { success: false, error: error.message };
    }
  }, [currentDraftKey]);

  // Promote draft to shared list
  const promoteDraft = useCallback(async (title) => {
    if (!currentDraftKey) return { success: false, error: 'No draft to promote' };

    try {
      const result = await apiClient.promoteDraftToSharedList(currentDraftKey, title);
      setCurrentDraftKey(null); // Clear draft key since it's now a shared list
      devLog('✅ Promoted draft to shared list:', result.shareId);
      return { success: true, shareId: result.shareId, shareUrl: result.shareUrl };
    } catch (error) {
      console.error('❌ Draft promotion error:', error);
      return { success: false, error: error.message };
    }
  }, [currentDraftKey]);

  return {
    persistPicklist,
    loadPicklist,
    deleteDraft,
    promoteDraft,
    currentDraftKey,
    setCurrentDraftKey,
    saveInProgress: saveInProgress.current,
    isDraft: !shareId && !!currentDraftKey,
    isShared: !!shareId
  };
};

export default usePicklistPersistence;