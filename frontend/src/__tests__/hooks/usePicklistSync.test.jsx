import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { usePicklistSync } from '../../hooks/usePicklistSync';
import { PicklistProvider } from '../../contexts/PicklistContext';

// Mock the persistence hook
jest.mock('../../hooks/usePicklistPersistence', () => ({
  usePicklistPersistence: jest.fn(() => ({
    persistPicklist: jest.fn(),
    loadPicklist: jest.fn(),
    clearStorage: jest.fn(),
    saveInProgress: false
  }))
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  devLog: jest.fn()
}));

const { usePicklistPersistence } = require('../../hooks/usePicklistPersistence');
const { devLog } = require('../../utils/logger');

describe('usePicklistSync', () => {
  let mockPersistPicklist, mockLoadPicklist, mockBroadcastUpdate, mockOnPicklistUpdate;

  beforeEach(() => {
    mockPersistPicklist = jest.fn();
    mockLoadPicklist = jest.fn();
    mockBroadcastUpdate = jest.fn();
    mockOnPicklistUpdate = jest.fn();
    
    usePicklistPersistence.mockReturnValue({
      persistPicklist: mockPersistPicklist,
      loadPicklist: mockLoadPicklist,
      clearStorage: jest.fn(),
      saveInProgress: false
    });

    jest.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <PicklistProvider>{children}</PicklistProvider>
  );

  describe('initialization', () => {
    test('should initialize with empty picklist', () => {
      const { result } = renderHook(() => usePicklistSync(), { wrapper });
      
      expect(result.current.picklist).toEqual([]);
      expect(result.current.lastUpdated).toBeNull();
    });

    test('should initialize with options', () => {
      const options = {
        broadcastUpdate: mockBroadcastUpdate,
        onPicklistUpdate: mockOnPicklistUpdate,
        suppressWebSocket: true
      };

      const { result } = renderHook(() => usePicklistSync('share-123', options), { wrapper });
      
      expect(result.current.picklist).toEqual([]);
    });
  });

  describe('auto-persistence', () => {
    test('should auto-persist changes with debounce', async () => {
      jest.useFakeTimers();
      mockPersistPicklist.mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePicklistSync(), { wrapper });
      
      // Set initial picklist
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple' }]);
      });

      // Update an item
      act(() => {
        result.current.updateItem(0, { quantity: 5 });
      });

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        await Promise.resolve(); // Allow promises to resolve
      });

      expect(mockPersistPicklist).toHaveBeenCalledWith([
        { id: 1, item: 'Apple', quantity: 5 }
      ]);

      jest.useRealTimers();
    });

    test('should handle persistence failure', async () => {
      jest.useFakeTimers();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPersistPicklist.mockResolvedValue({ success: false, error: 'Save failed' });

      const { result } = renderHook(() => usePicklistSync(), { wrapper });
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple' }]);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockPersistPicklist).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      jest.useRealTimers();
    });

    test('should not persist if no changes', async () => {
      jest.useFakeTimers();
      mockPersistPicklist.mockResolvedValue({ success: true });

      const { result } = renderHook(() => usePicklistSync(), { wrapper });
      
      // Fast-forward without making changes
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockPersistPicklist).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('loadInitialData', () => {
    test('should load initial data successfully', async () => {
      const testPicklist = [{ id: 1, item: 'Apple' }];
      mockLoadPicklist.mockResolvedValue({ success: true, picklist: testPicklist });

      const { result } = renderHook(() => usePicklistSync(), { wrapper });

      await act(async () => {
        await result.current.loadInitialData();
      });

      expect(mockLoadPicklist).toHaveBeenCalled();
      expect(result.current.picklist).toEqual(testPicklist);
      expect(devLog).toHaveBeenCalledWith('✅ Loaded initial picklist data');
    });

    test('should handle load failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockLoadPicklist.mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => usePicklistSync(), { wrapper });

      await act(async () => {
        await result.current.loadInitialData();
      });

      expect(mockLoadPicklist).toHaveBeenCalled();
      expect(result.current.picklist).toEqual([]);
      
      consoleSpy.mockRestore();
    });
  });

  describe('updateItemSync', () => {
    test('should update item locally', () => {
      const { result } = renderHook(() => usePicklistSync(), { wrapper });
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple', quantity: 1 }]);
      });

      act(() => {
        result.current.updateItem(0, { quantity: 5 });
      });

      expect(result.current.picklist[0]).toEqual({ id: 1, item: 'Apple', quantity: 5 });
    });

    test('should broadcast update for shared lists', () => {
      const shareId = 'share-123';
      const { result } = renderHook(() => 
        usePicklistSync(shareId, { broadcastUpdate: mockBroadcastUpdate }), 
        { wrapper }
      );
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple', quantity: 1 }]);
      });

      act(() => {
        result.current.updateItem(0, { quantity: 5 }, { broadcast: true });
      });

      expect(mockBroadcastUpdate).toHaveBeenCalledWith({
        itemIndex: 0,
        changes: { quantity: 5 },
        timestamp: expect.any(Number),
        updateType: 'item_update'
      });
      expect(devLog).toHaveBeenCalledWith('📡 Broadcasted update for item 0');
    });

    test('should not broadcast when suppressWebSocket is true', () => {
      const shareId = 'share-123';
      const { result } = renderHook(() => 
        usePicklistSync(shareId, { 
          broadcastUpdate: mockBroadcastUpdate,
          suppressWebSocket: true
        }), 
        { wrapper }
      );
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple', quantity: 1 }]);
      });

      act(() => {
        result.current.updateItem(0, { quantity: 5 }, { broadcast: true });
      });

      expect(mockBroadcastUpdate).not.toHaveBeenCalled();
    });

    test('should handle broadcast failure gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockBroadcastUpdate.mockImplementation(() => {
        throw new Error('Broadcast failed');
      });

      const shareId = 'share-123';
      const { result } = renderHook(() => 
        usePicklistSync(shareId, { broadcastUpdate: mockBroadcastUpdate }), 
        { wrapper }
      );
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple', quantity: 1 }]);
      });

      act(() => {
        result.current.updateItem(0, { quantity: 5 }, { broadcast: true });
      });

      expect(result.current.picklist[0].quantity).toBe(5); // Local update should still work
      expect(consoleSpy).toHaveBeenCalledWith('❌ Broadcast failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('updateMultipleItemsSync', () => {
    test('should update multiple items locally', () => {
      const { result } = renderHook(() => usePicklistSync(), { wrapper });
      
      act(() => {
        result.current.setPicklist([
          { id: 1, item: 'Apple', quantity: 1 },
          { id: 2, item: 'Orange', quantity: 2 }
        ]);
      });

      act(() => {
        result.current.updateMultipleItems([
          { index: 0, changes: { quantity: 5 } },
          { index: 1, changes: { quantity: 10 } }
        ]);
      });

      expect(result.current.picklist[0].quantity).toBe(5);
      expect(result.current.picklist[1].quantity).toBe(10);
    });

    test('should broadcast bulk update for shared lists', () => {
      const shareId = 'share-123';
      const { result } = renderHook(() => 
        usePicklistSync(shareId, { broadcastUpdate: mockBroadcastUpdate }), 
        { wrapper }
      );
      
      act(() => {
        result.current.setPicklist([
          { id: 1, item: 'Apple', quantity: 1 },
          { id: 2, item: 'Orange', quantity: 2 }
        ]);
      });

      const updates = [
        { index: 0, changes: { quantity: 5 } },
        { index: 1, changes: { quantity: 10 } }
      ];

      act(() => {
        result.current.updateMultipleItems(updates, { broadcast: true });
      });

      expect(mockBroadcastUpdate).toHaveBeenCalledWith({
        updates,
        timestamp: expect.any(Number),
        updateType: 'bulk_update'
      });
      expect(devLog).toHaveBeenCalledWith('📡 Broadcasted bulk update for 2 items');
    });
  });

  describe('forcePersist', () => {
    test('should force persist immediately', async () => {
      mockPersistPicklist.mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePicklistSync(), { wrapper });
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple' }]);
      });

      let persistResult;
      await act(async () => {
        persistResult = await result.current.forcePersist();
      });

      expect(mockPersistPicklist).toHaveBeenCalledWith([{ id: 1, item: 'Apple' }]);
      expect(persistResult).toEqual({ success: true });
      expect(devLog).toHaveBeenCalledWith('✅ Force persisted picklist');
    });

    test('should handle force persist failure', async () => {
      mockPersistPicklist.mockResolvedValue({ success: false, error: 'Persist failed' });
      const { result } = renderHook(() => usePicklistSync(), { wrapper });
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple' }]);
      });

      let persistResult;
      await act(async () => {
        persistResult = await result.current.forcePersist();
      });

      expect(persistResult).toEqual({ success: false, error: 'Persist failed' });
    });
  });

  describe('integration with onPicklistUpdate callback', () => {
    test('should call onPicklistUpdate for non-shared lists', async () => {
      jest.useFakeTimers();
      mockPersistPicklist.mockResolvedValue({ success: true });

      const { result } = renderHook(() => 
        usePicklistSync(null, { onPicklistUpdate: mockOnPicklistUpdate }), 
        { wrapper }
      );
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple' }]);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnPicklistUpdate).toHaveBeenCalledWith([{ id: 1, item: 'Apple' }]);

      jest.useRealTimers();
    });

    test('should not call onPicklistUpdate for shared lists', async () => {
      jest.useFakeTimers();
      mockPersistPicklist.mockResolvedValue({ success: true });

      const { result } = renderHook(() => 
        usePicklistSync('share-123', { onPicklistUpdate: mockOnPicklistUpdate }), 
        { wrapper }
      );
      
      act(() => {
        result.current.setPicklist([{ id: 1, item: 'Apple' }]);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnPicklistUpdate).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});