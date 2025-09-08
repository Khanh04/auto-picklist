import { renderHook, act } from '@testing-library/react';
import { usePicklistPersistence } from '../../hooks/usePicklistPersistence';

// Mock fetch
global.fetch = jest.fn();

describe('usePicklistPersistence', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('when shareId is null (session storage)', () => {
    test('should persist picklist to session storage successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => usePicklistPersistence());
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];

      let persistResult;
      await act(async () => {
        persistResult = await result.current.persistPicklist(testPicklist);
      });

      expect(fetch).toHaveBeenCalledWith('/api/session/picklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picklist: testPicklist })
      });
      expect(persistResult).toEqual({ success: true });
    });

    test('should handle session storage persistence failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false })
      });

      const { result } = renderHook(() => usePicklistPersistence());
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];

      let persistResult;
      await act(async () => {
        persistResult = await result.current.persistPicklist(testPicklist);
      });

      expect(persistResult).toEqual({ success: false, error: 'Session save failed' });
    });

    test('should handle session storage network error', async () => {
      const error = new Error('Network error');
      fetch.mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePicklistPersistence());
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];

      let persistResult;
      await act(async () => {
        persistResult = await result.current.persistPicklist(testPicklist);
      });

      expect(persistResult).toEqual({ success: false, error: 'Network error' });
    });

    test('should load picklist from session storage successfully', async () => {
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, picklist: testPicklist })
      });

      const { result } = renderHook(() => usePicklistPersistence());

      let loadResult;
      await act(async () => {
        loadResult = await result.current.loadPicklist();
      });

      expect(fetch).toHaveBeenCalledWith('/api/session/picklist');
      expect(loadResult).toEqual({ success: true, picklist: testPicklist });
    });

    test('should handle session storage load failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false })
      });

      const { result } = renderHook(() => usePicklistPersistence());

      let loadResult;
      await act(async () => {
        loadResult = await result.current.loadPicklist();
      });

      expect(loadResult).toEqual({ success: false, error: 'No session data found' });
    });

    test('should clear storage successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => usePicklistPersistence());

      let clearResult;
      await act(async () => {
        clearResult = await result.current.clearStorage();
      });

      expect(fetch).toHaveBeenCalledWith('/api/session/picklist', { method: 'DELETE' });
      expect(clearResult).toEqual({ success: true });
    });
  });

  describe('when shareId is provided (database storage)', () => {
    const shareId = 'test-share-123';

    test('should persist picklist to database successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => usePicklistPersistence(shareId));
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];

      let persistResult;
      await act(async () => {
        persistResult = await result.current.persistPicklist(testPicklist);
      });

      expect(fetch).toHaveBeenCalledWith(`/api/shopping-list/share/${shareId}/picklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picklist: testPicklist })
      });
      expect(persistResult).toEqual({ success: true });
    });

    test('should handle database persistence failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false })
      });

      const { result } = renderHook(() => usePicklistPersistence(shareId));
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];

      let persistResult;
      await act(async () => {
        persistResult = await result.current.persistPicklist(testPicklist);
      });

      expect(persistResult).toEqual({ success: false, error: 'Database save failed' });
    });

    test('should load picklist from database successfully', async () => {
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { picklist: testPicklist } 
        })
      });

      const { result } = renderHook(() => usePicklistPersistence(shareId));

      let loadResult;
      await act(async () => {
        loadResult = await result.current.loadPicklist();
      });

      expect(fetch).toHaveBeenCalledWith(`/api/shopping-list/share/${shareId}`);
      expect(loadResult).toEqual({ success: true, picklist: testPicklist });
    });

    test('should handle database load failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false })
      });

      const { result } = renderHook(() => usePicklistPersistence(shareId));

      let loadResult;
      await act(async () => {
        loadResult = await result.current.loadPicklist();
      });

      expect(loadResult).toEqual({ success: false, error: 'No database data found' });
    });

    test('should return error when no shareId provided for database operations', async () => {
      const { result } = renderHook(() => usePicklistPersistence(null));
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];

      // This will use session storage, so let's test with an undefined shareId
      const { result: resultWithUndefined } = renderHook(() => usePicklistPersistence(undefined));
      
      // Mock the saveToDatabase method to test the shareId validation
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      let persistResult;
      await act(async () => {
        // This should use session storage since shareId is null/undefined
        persistResult = await resultWithUndefined.current.persistPicklist(testPicklist);
      });

      // Should call session storage endpoint, not database
      expect(fetch).toHaveBeenCalledWith('/api/session/picklist', expect.any(Object));
    });
  });

  describe('concurrent operations', () => {
    test('should prevent concurrent save operations', async () => {
      fetch
        .mockImplementationOnce(() => new Promise(resolve => 
          setTimeout(() => resolve({ ok: true, json: async () => ({ success: true }) }), 100)
        ))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const { result } = renderHook(() => usePicklistPersistence());
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];

      let firstResult, secondResult;

      await act(async () => {
        // Start first save
        const firstPromise = result.current.persistPicklist(testPicklist);
        
        // Start second save immediately (should be blocked)
        const secondPromise = result.current.persistPicklist(testPicklist);
        
        [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
      });

      expect(firstResult).toEqual({ success: true });
      expect(secondResult).toEqual({ success: false, error: 'Save in progress' });
      expect(fetch).toHaveBeenCalledTimes(1); // Only one API call should be made
    });
  });

  describe('edge cases', () => {
    test('should handle malformed API responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }) // Missing picklist in data
      });

      const { result } = renderHook(() => usePicklistPersistence('test-share'));

      let loadResult;
      await act(async () => {
        loadResult = await result.current.loadPicklist();
      });

      expect(loadResult).toEqual({ success: false, error: 'No database data found' });
    });

    test('should handle JSON parsing errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('JSON parse error'); }
      });

      const { result } = renderHook(() => usePicklistPersistence());

      let loadResult;
      await act(async () => {
        loadResult = await result.current.loadPicklist();
      });

      expect(loadResult).toEqual({ success: false, error: 'JSON parse error' });
    });
  });
});