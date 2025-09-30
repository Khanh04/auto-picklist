import { useState, useEffect, useCallback } from 'react';
import { devLog } from '../utils/logger';
import apiClient from '../utils/apiClient';

// Hook for managing draft picklist recovery and management
export const useDraftRecovery = () => {
  const [availableDrafts, setAvailableDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if a draft is expired
  const isExpired = useCallback((draft) => {
    return new Date(draft.expiresAt) < new Date();
  }, []);

  // Format relative time for display
  const formatRelativeTime = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }, []);

  // Load user's draft picklists
  const loadUserDrafts = useCallback(async (limit = 10, offset = 0) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.getUserDrafts(limit, offset);

      if (result.drafts) {
        // Filter out expired drafts and enhance with helper methods
        const validDrafts = result.drafts
          .filter(draft => !isExpired(draft))
          .map(draft => ({
            ...draft,
            formattedLastSaved: formatRelativeTime(draft.lastSavedAt),
            isExpiringSoon: (new Date(draft.expiresAt) - new Date()) < 86400000 // Less than 24 hours
          }));

        setAvailableDrafts(validDrafts);
        devLog('✅ Loaded drafts:', validDrafts.length);

        return { success: true, drafts: validDrafts, total: result.total };
      } else {
        setAvailableDrafts([]);
        return { success: true, drafts: [], total: 0 };
      }
    } catch (error) {
      console.error('❌ Failed to load drafts:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [isExpired, formatRelativeTime]);

  // Restore a specific draft
  const restoreDraft = useCallback(async (draftKey) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.getDraft(draftKey);

      if (result.draft) {
        devLog('✅ Restored draft:', draftKey);
        return {
          success: true,
          picklist: result.draft.picklist,
          metadata: {
            draftKey: result.draft.draftKey,
            title: result.draft.title,
            sourceFileName: result.draft.sourceFileName,
            lastSavedAt: result.draft.lastSavedAt
          }
        };
      } else {
        throw new Error('Draft not found');
      }
    } catch (error) {
      console.error('❌ Failed to restore draft:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete a draft
  const deleteDraft = useCallback(async (draftKey) => {
    try {
      setIsLoading(true);
      setError(null);

      await apiClient.deleteDraft(draftKey);

      // Remove from local state
      setAvailableDrafts(prev => prev.filter(d => d.draftKey !== draftKey));

      devLog('✅ Deleted draft:', draftKey);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete draft:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Promote draft to shared list
  const promoteDraft = useCallback(async (draftKey, title) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.promoteDraftToSharedList(draftKey, title);

      if (result.shareId) {
        // Remove from local drafts list
        setAvailableDrafts(prev => prev.filter(d => d.draftKey !== draftKey));

        devLog('✅ Promoted draft to shared list:', result.shareId);
        return {
          success: true,
          shareId: result.shareId,
          shareUrl: result.shareUrl,
          title: result.title
        };
      } else {
        throw new Error('Failed to promote draft');
      }
    } catch (error) {
      console.error('❌ Failed to promote draft:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get draft statistics
  const getDraftStats = useCallback(() => {
    const stats = {
      total: availableDrafts.length,
      expiringSoon: availableDrafts.filter(d => d.isExpiringSoon).length,
      recentlyModified: availableDrafts.filter(d => {
        const hoursSinceModified = (new Date() - new Date(d.lastSavedAt)) / 3600000;
        return hoursSinceModified < 24;
      }).length
    };

    return stats;
  }, [availableDrafts]);

  // Auto-load drafts on component mount
  useEffect(() => {
    loadUserDrafts();
  }, [loadUserDrafts]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  return {
    // State
    availableDrafts,
    isLoading,
    error,

    // Actions
    loadUserDrafts,
    restoreDraft,
    deleteDraft,
    promoteDraft,

    // Utilities
    getDraftStats,
    formatRelativeTime,
    isExpired,

    // Computed values
    hasDrafts: availableDrafts.length > 0,
    stats: getDraftStats()
  };
};

export default useDraftRecovery;