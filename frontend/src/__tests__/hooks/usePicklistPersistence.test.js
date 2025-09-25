import { renderHook, act } from '@testing-library/react';
import { usePicklistPersistence } from '../../hooks/usePicklistPersistence';

// Mock fetch
global.fetch = jest.fn();

describe('usePicklistPersistence', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('when shareId is null (no session storage)', () => {
    test('should return error for persistence without shareId', async () => {
      const { result } = renderHook(() => usePicklistPersistence());
      const testPicklist = [{ id: 1, item: 'Apple', quantity: 2 }];

      let persistResult;
      await act(async () => {
        persistResult = await result.current.persistPicklist(testPicklist);
      });

      expect(persistResult).toEqual({ success: false, error: 'No share ID provided - session storage removed' });
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should return error for loading without shareId', async () => {
      const { result } = renderHook(() => usePicklistPersistence());

      let loadResult;
      await act(async () => {
        loadResult = await result.current.loadPicklist();
      });

      expect(loadResult).toEqual({ success: false, error: 'No share ID provided - session storage removed' });
      expect(fetch).not.toHaveBeenCalled();
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

      let persistResult;
      await act(async () => {
        persistResult = await result.current.persistPicklist(testPicklist);
      });

      expect(persistResult).toEqual({ success: false, error: 'No share ID provided - session storage removed' });
      expect(fetch).not.toHaveBeenCalled();
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