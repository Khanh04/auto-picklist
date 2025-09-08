import React from 'react';
import { render, act } from '@testing-library/react';
import { PicklistProvider, usePicklist } from '../../contexts/PicklistContext';

// Test component that uses the context
const TestComponent = () => {
  const {
    picklist,
    loading,
    error,
    lastUpdated,
    setPicklist,
    updateItem,
    updateMultipleItems,
    resetPicklist,
    setLoading,
    setError,
    getItem,
    getItemById,
    getTotalItems,
    getTotalCost
  } = usePicklist();

  return (
    <div>
      <div data-testid="picklist-length">{picklist.length}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'null'}</div>
      <div data-testid="last-updated">{lastUpdated || 'null'}</div>
      <div data-testid="total-items">{getTotalItems()}</div>
      <div data-testid="total-cost">{getTotalCost().toFixed(2)}</div>
      
      <button 
        data-testid="set-picklist" 
        onClick={() => setPicklist([
          { id: 1, item: 'Apple', quantity: 2, totalPrice: '5.00' },
          { id: 2, item: 'Orange', quantity: 1, totalPrice: '3.00' }
        ])}
      >
        Set Picklist
      </button>
      
      <button 
        data-testid="update-item" 
        onClick={() => updateItem(0, { quantity: 5, totalPrice: '10.00' })}
      >
        Update Item
      </button>
      
      <button 
        data-testid="update-multiple" 
        onClick={() => updateMultipleItems([
          { index: 0, changes: { quantity: 3 } },
          { index: 1, changes: { quantity: 2 } }
        ])}
      >
        Update Multiple
      </button>
      
      <button 
        data-testid="reset-picklist" 
        onClick={() => resetPicklist()}
      >
        Reset Picklist
      </button>
      
      <button 
        data-testid="set-loading" 
        onClick={() => setLoading(true)}
      >
        Set Loading
      </button>
      
      <button 
        data-testid="set-error" 
        onClick={() => setError('Test error')}
      >
        Set Error
      </button>
      
      <div data-testid="get-item-0">{JSON.stringify(getItem(0))}</div>
      <div data-testid="get-item-by-id-1">{JSON.stringify(getItemById(1))}</div>
    </div>
  );
};

describe('PicklistContext', () => {
  let getByTestId;

  beforeEach(() => {
    const { getByTestId: getByTestIdFn } = render(
      <PicklistProvider>
        <TestComponent />
      </PicklistProvider>
    );
    getByTestId = getByTestIdFn;
  });

  test('should provide initial state', () => {
    expect(getByTestId('picklist-length')).toHaveTextContent('0');
    expect(getByTestId('loading')).toHaveTextContent('false');
    expect(getByTestId('error')).toHaveTextContent('null');
    expect(getByTestId('last-updated')).toHaveTextContent('null');
    expect(getByTestId('total-items')).toHaveTextContent('0');
    expect(getByTestId('total-cost')).toHaveTextContent('0.00');
  });

  test('should set picklist and update derived values', () => {
    act(() => {
      getByTestId('set-picklist').click();
    });

    expect(getByTestId('picklist-length')).toHaveTextContent('2');
    expect(getByTestId('total-items')).toHaveTextContent('2');
    expect(getByTestId('total-cost')).toHaveTextContent('8.00');
    expect(getByTestId('last-updated')).not.toHaveTextContent('null');
  });

  test('should update single item', () => {
    // First set the picklist
    act(() => {
      getByTestId('set-picklist').click();
    });

    // Then update an item
    act(() => {
      getByTestId('update-item').click();
    });

    expect(getByTestId('total-cost')).toHaveTextContent('13.00'); // 10.00 + 3.00
  });

  test('should update multiple items', () => {
    // First set the picklist
    act(() => {
      getByTestId('set-picklist').click();
    });

    // Then update multiple items
    act(() => {
      getByTestId('update-multiple').click();
    });

    const item0 = JSON.parse(getByTestId('get-item-0').textContent);
    const item1 = JSON.parse(getByTestId('get-item-by-id-1').textContent);
    
    expect(item0.quantity).toBe(3);
    expect(item1.quantity).toBe(2);
  });

  test('should reset picklist', () => {
    // First set the picklist
    act(() => {
      getByTestId('set-picklist').click();
    });

    expect(getByTestId('picklist-length')).toHaveTextContent('2');

    // Then reset
    act(() => {
      getByTestId('reset-picklist').click();
    });

    expect(getByTestId('picklist-length')).toHaveTextContent('0');
    expect(getByTestId('total-items')).toHaveTextContent('0');
    expect(getByTestId('total-cost')).toHaveTextContent('0.00');
  });

  test('should set loading state', () => {
    act(() => {
      getByTestId('set-loading').click();
    });

    expect(getByTestId('loading')).toHaveTextContent('true');
  });

  test('should set error state', () => {
    act(() => {
      getByTestId('set-error').click();
    });

    expect(getByTestId('error')).toHaveTextContent('Test error');
  });

  test('should handle getItem with invalid index', () => {
    const item = JSON.parse(getByTestId('get-item-0').textContent);
    expect(item).toBeNull();
  });

  test('should handle getItemById with non-existent id', () => {
    const item = JSON.parse(getByTestId('get-item-by-id-1').textContent);
    expect(item).toBeNull();
  });

  test('should calculate total cost correctly with invalid prices', () => {
    act(() => {
      getByTestId('set-picklist').click();
    });

    // Update an item with invalid price
    act(() => {
      getByTestId('update-item').click();
    });

    act(() => {
      updateItem(1, { totalPrice: 'invalid' });
    });

    // Should still calculate correctly, ignoring invalid prices
    expect(getByTestId('total-cost')).toHaveTextContent('10.00');
  });
});

describe('PicklistContext error handling', () => {
  test('should throw error when used outside provider', () => {
    // Mock console.error to avoid cluttering test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('usePicklist must be used within a PicklistProvider');
    
    consoleSpy.mockRestore();
  });
});