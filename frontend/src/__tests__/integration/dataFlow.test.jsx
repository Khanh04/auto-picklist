import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils/render';
import userEvent from '@testing-library/user-event';
import { PicklistProvider } from '../../contexts/PicklistContext';
import PicklistPreview from '../../components/PicklistPreview';
import ShoppingList from '../../components/ShoppingList';

// Mock hooks and utilities
jest.mock('../../hooks/useWebSocket', () => ({
  __esModule: true,
  default: () => ({
    isConnected: false,
    connectionError: null,
    subscribe: jest.fn(() => jest.fn()), // returns an unsubscribe function
    broadcastUpdate: jest.fn(),
    updateItem: jest.fn(),
    toggleCompleted: jest.fn(),
    switchSupplier: jest.fn(),
    disconnect: jest.fn()
  })
}));

jest.mock('../../utils/logger', () => ({
  devLog: jest.fn()
}));

jest.mock('fuse.js', () => {
  return jest.fn().mockImplementation(() => ({
    search: jest.fn(() => [])
  }));
});

// Mock fetch
global.fetch = jest.fn();

describe('Data Flow Integration Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
    
    // Mock common API responses
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, suppliers: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, items: [] })
      });
  });

  const mockResults = {
    success: true,
    picklist: [
      {
        id: 1,
        originalItem: 'Fresh Apples',
        item: 'Fresh Apples',
        quantity: 3,
        selectedSupplier: 'Fresh Foods',
        unitPrice: 2.50,
        totalPrice: '7.50',
        matchedItemId: null,
        manualOverride: false
      },
      {
        id: 2,
        originalItem: 'Organic Oranges',
        item: 'Organic Oranges',
        quantity: 2,
        selectedSupplier: 'Citrus Co',
        unitPrice: 1.75,
        totalPrice: '3.50',
        matchedItemId: null,
        manualOverride: false
      }
    ]
  };

  describe('PicklistPreview to ShoppingList data flow', () => {
    test('should pass updated picklist from preview to shopping list', async () => {
      const TestIntegration = () => {
        const [results, setResults] = React.useState(mockResults);
        const [currentView, setCurrentView] = React.useState('preview');

        return (
          <PicklistProvider>
            <div>
              {currentView === 'preview' ? (
                <div>
                  <PicklistPreview
                    results={results}
                    onBack={() => {}}
                    onNavigate={(view) => setCurrentView(view)}
                  />
                  <button onClick={() => setCurrentView('shopping')}>
                    Go to Shopping
                  </button>
                </div>
              ) : (
                <ShoppingList
                  picklist={results.picklist}
                  onBack={() => setCurrentView('preview')}
                />
              )}
            </div>
          </PicklistProvider>
        );
      };

      const user = userEvent.setup();
      render(<TestIntegration />);

      // Verify initial data in preview
      await waitFor(() => {
        expect(screen.getByText('Fresh Apples')).toBeInTheDocument();
        expect(screen.getByText('Organic Oranges')).toBeInTheDocument();
      });

      // Navigate to shopping list
      const goToShoppingButton = screen.getByText('Go to Shopping');
      await user.click(goToShoppingButton);

      // Verify data is available in shopping list
      await waitFor(() => {
        expect(screen.getByText('Fresh Apples')).toBeInTheDocument();
        expect(screen.getByText('Organic Oranges')).toBeInTheDocument();
        expect(screen.getByText('Fresh Foods')).toBeInTheDocument();
        expect(screen.getByText('Citrus Co')).toBeInTheDocument();
      });
    });

    test('should maintain item modifications across components', async () => {
      const TestIntegration = () => {
        return (
          <PicklistProvider>
            <PicklistPreview
              results={mockResults}
              onBack={() => {}}
              onNavigate={() => {}}
            />
          </PicklistProvider>
        );
      };

      const user = userEvent.setup();
      render(<TestIntegration />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Fresh Apples')).toBeInTheDocument();
      });

      // Find and modify quantity in preview
      const quantityInput = screen.getAllByDisplayValue('3')[0];
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');

      // Verify the change is reflected
      await waitFor(() => {
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      });
    });
  });

  describe('Context state management', () => {
    test('should update context when picklist changes', async () => {
      const TestContextConsumer = () => {
        const { picklist, setPicklist } = require('../../contexts/PicklistContext').usePicklist();
        
        return (
          <div>
            <div data-testid="picklist-length">{picklist.length}</div>
            <button onClick={() => setPicklist(mockResults.picklist)}>
              Set Picklist
            </button>
            <div data-testid="first-item">
              {picklist[0] ? picklist[0].item : 'No items'}
            </div>
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <PicklistProvider>
          <TestContextConsumer />
        </PicklistProvider>
      );

      // Initial state
      expect(screen.getByTestId('picklist-length')).toHaveTextContent('0');
      expect(screen.getByTestId('first-item')).toHaveTextContent('No items');

      // Update context
      const setButton = screen.getByText('Set Picklist');
      await user.click(setButton);

      // Verify context update
      await waitFor(() => {
        expect(screen.getByTestId('picklist-length')).toHaveTextContent('2');
        expect(screen.getByTestId('first-item')).toHaveTextContent('Fresh Apples');
      });
    });

    test('should handle concurrent updates correctly', async () => {
      const TestConcurrentUpdates = () => {
        const { picklist, setPicklist, updateItem } = require('../../contexts/PicklistContext').usePicklist();
        
        return (
          <div>
            <div data-testid="picklist-data">{JSON.stringify(picklist)}</div>
            <button onClick={() => {
              setPicklist(mockResults.picklist);
              // Immediately update an item
              setTimeout(() => updateItem(0, { quantity: 10 }), 0);
            }}>
              Concurrent Update
            </button>
          </div>
        );
      };

      const user = userEvent.setup();
      render(
        <PicklistProvider>
          <TestConcurrentUpdates />
        </PicklistProvider>
      );

      const updateButton = screen.getByText('Concurrent Update');
      await user.click(updateButton);

      await waitFor(() => {
        const picklistData = JSON.parse(screen.getByTestId('picklist-data').textContent);
        expect(picklistData[0].quantity).toBe(10);
      });
    });
  });

  describe('Persistence integration', () => {
    test('should auto-save changes after debounce period', async () => {
      jest.useFakeTimers();
      
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const TestPersistence = () => {
        return (
          <PicklistProvider>
            <PicklistPreview
              results={mockResults}
              onBack={() => {}}
              onNavigate={() => {}}
            />
          </PicklistProvider>
        );
      };

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TestPersistence />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Fresh Apples')).toBeInTheDocument();
      });

      // Make a change
      const quantityInput = screen.getAllByDisplayValue('3')[0];
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');

      // Fast-forward past debounce period
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // Since session storage is removed, persistence should not make API calls without shareId
      await waitFor(() => {
        // Should not call session API since shareId is not provided
        expect(fetch).not.toHaveBeenCalledWith('/api/session/picklist', expect.any(Object));
      });

      jest.useRealTimers();
    });

    test('should handle save failures gracefully', async () => {
      jest.useFakeTimers();
      
      fetch.mockRejectedValue(new Error('Save failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const TestFailure = () => {
        return (
          <PicklistProvider>
            <PicklistPreview
              results={mockResults}
              onBack={() => {}}
              onNavigate={() => {}}
            />
          </PicklistProvider>
        );
      };

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<TestFailure />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Fresh Apples')).toBeInTheDocument();
      });

      // Make a change
      const quantityInput = screen.getAllByDisplayValue('3')[0];
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');

      // Fast-forward past debounce period
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // Should continue to work despite save failure
      await waitFor(() => {
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('Shopping list quantity calculations', () => {
    test('should correctly calculate remaining quantities after partial purchases', () => {
      const picklistWithPartial = [
        {
          id: 1,
          item: 'Apple',
          quantity: 5,
          selectedSupplier: 'Fresh Foods',
          unitPrice: 2.50,
          totalPrice: '12.50',
          requestedQuantity: 5,
          purchasedQuantity: 2 // Partially purchased
        }
      ];

      render(
        <PicklistProvider>
          <ShoppingList
            picklist={picklistWithPartial}
            onBack={() => {}}
          />
        </PicklistProvider>
      );

      // Should show remaining quantity
      expect(screen.getByText('3 remaining')).toBeInTheDocument();
      
      // Should show purchased portion
      expect(screen.getByText('2 purchased')).toBeInTheDocument();
    });

    test('should update checkbox state when remaining quantity reaches zero', async () => {
      const picklistAlmostDone = [
        {
          id: 1,
          item: 'Apple',
          quantity: 2,
          selectedSupplier: 'Fresh Foods',
          unitPrice: 2.50,
          totalPrice: '5.00',
          requestedQuantity: 2,
          purchasedQuantity: 1 // 1 remaining
        }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const user = userEvent.setup();
      const TestCheckboxUpdate = () => {
        const [picklist, setPicklist] = React.useState(picklistAlmostDone);
        
        return (
          <PicklistProvider>
            <ShoppingList
              picklist={picklist}
              onBack={() => {}}
              shareId="test-share"
            />
            <button onClick={() => {
              // Simulate completing the purchase
              setPicklist([{
                ...picklistAlmostDone[0],
                purchasedQuantity: 2 // Now fully purchased
              }]);
            }}>
              Complete Purchase
            </button>
          </PicklistProvider>
        );
      };

      render(<TestCheckboxUpdate />);

      // Initially should show remaining
      expect(screen.getByText('1 remaining')).toBeInTheDocument();

      // Complete the purchase
      const completeButton = screen.getByText('Complete Purchase');
      await user.click(completeButton);

      // Should now show as completed
      await waitFor(() => {
        expect(screen.queryByText('1 remaining')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error boundaries and edge cases', () => {
    test('should handle malformed data gracefully', () => {
      const malformedResults = {
        success: true,
        picklist: [
          {
            // Missing required fields
            item: 'Incomplete Item'
          },
          null, // Null item
          undefined, // Undefined item
          {
            id: 2,
            item: 'Valid Item',
            quantity: 1,
            selectedSupplier: 'Test Supplier',
            unitPrice: 1.00,
            totalPrice: '1.00'
          }
        ]
      };

      expect(() => {
        render(
          <PicklistProvider>
            <PicklistPreview
              results={malformedResults}
              onBack={() => {}}
              onNavigate={() => {}}
            />
          </PicklistProvider>
        );
      }).not.toThrow();

      // Should render valid items
      expect(screen.getByText('Valid Item')).toBeInTheDocument();
    });
  });
});