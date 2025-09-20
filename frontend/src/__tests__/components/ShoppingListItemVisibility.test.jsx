import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShoppingList from '../../components/ShoppingList';

// Mock hooks
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

// Mock fetch
global.fetch = jest.fn();

describe('ShoppingList Item Visibility After Completion', () => {
  const mockPicklist = [
    {
      id: 1,
      item: 'Apple',
      quantity: 3,
      selectedSupplier: 'Fresh Foods',
      unitPrice: 2.50,
      totalPrice: '7.50',
      requestedQuantity: 3,
      purchasedQuantity: 2 // Partially purchased - 1 remaining
    },
    {
      id: 2,
      item: 'Orange',
      quantity: 1,
      selectedSupplier: 'Citrus Co',
      unitPrice: 1.75,
      totalPrice: '1.75',
      requestedQuantity: 1,
      purchasedQuantity: 0 // Not purchased yet
    }
  ];

  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  test('should hide completed items immediately without page refresh', async () => {
    // Mock successful API response for item update
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const TestComponent = () => {
      const [picklist, setPicklist] = React.useState(mockPicklist);
      
      // Simulate completing the remaining portion
      const completeRemainingApple = () => {
        setPicklist(prevList => 
          prevList.map(item => 
            item.id === 1 
              ? { ...item, purchasedQuantity: 3 } // Complete the purchase
              : item
          )
        );
      };

      return (
        <div>
          <ShoppingList
            picklist={picklist}
            onBack={() => {}}
            shareId="test-share"
            showCompleted={false} // Completed items should be hidden
          />
          <button onClick={completeRemainingApple} data-testid="complete-apple">
            Complete Apple
          </button>
        </div>
      );
    };

    const user = userEvent.setup();
    render(<TestComponent />);

    // Initially should show remaining portion
    await waitFor(() => {
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
    });

    // Should show purchased portion
    expect(screen.getByText('2 purchased')).toBeInTheDocument();

    // Complete the remaining portion
    const completeButton = screen.getByTestId('complete-apple');
    await user.click(completeButton);

    // After completion, remaining portion should be hidden immediately
    await waitFor(() => {
      expect(screen.queryByText('1 remaining')).not.toBeInTheDocument();
    });

    // Should still show the purchased portion (now showing full quantity)
    expect(screen.getByText('3 purchased')).toBeInTheDocument();
  });

  test('should update item visibility when partial quantities change', async () => {
    const TestComponent = () => {
      const [picklist, setPicklist] = React.useState([
        {
          id: 1,
          item: 'Multi Apple',
          quantity: 5,
          selectedSupplier: 'Fresh Foods',
          unitPrice: 2.50,
          totalPrice: '12.50',
          requestedQuantity: 5,
          purchasedQuantity: 3 // 2 remaining
        }
      ]);
      
      const updateQuantity = (newPurchased) => {
        setPicklist([{
          ...picklist[0],
          purchasedQuantity: newPurchased
        }]);
      };

      return (
        <div>
          <ShoppingList
            picklist={picklist}
            onBack={() => {}}
            shareId="test-share"
            showCompleted={false}
          />
          <button onClick={() => updateQuantity(4)} data-testid="buy-one-more">
            Buy One More (4 total)
          </button>
          <button onClick={() => updateQuantity(5)} data-testid="complete-all">
            Complete All (5 total)
          </button>
        </div>
      );
    };

    const user = userEvent.setup();
    render(<TestComponent />);

    // Initially should show 2 remaining
    await waitFor(() => {
      expect(screen.getByText('2 remaining')).toBeInTheDocument();
    });

    // Buy one more - should show 1 remaining
    const buyOneMoreButton = screen.getByTestId('buy-one-more');
    await user.click(buyOneMoreButton);

    await waitFor(() => {
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
      expect(screen.queryByText('2 remaining')).not.toBeInTheDocument();
    });

    // Complete all - remaining portion should disappear
    const completeAllButton = screen.getByTestId('complete-all');
    await user.click(completeAllButton);

    await waitFor(() => {
      expect(screen.queryByText('1 remaining')).not.toBeInTheDocument();
      expect(screen.queryByText('2 remaining')).not.toBeInTheDocument();
    });

    // Should show fully purchased
    expect(screen.getByText('5 purchased')).toBeInTheDocument();
  });

  test('should maintain correct supplier grouping after completion', async () => {
    const multiSupplierPicklist = [
      {
        id: 1,
        item: 'Apple',
        quantity: 2,
        selectedSupplier: 'Fresh Foods',
        unitPrice: 2.50,
        totalPrice: '5.00',
        requestedQuantity: 2,
        purchasedQuantity: 1 // 1 remaining
      },
      {
        id: 2,
        item: 'Banana',
        quantity: 1,
        selectedSupplier: 'Fresh Foods',
        unitPrice: 1.00,
        totalPrice: '1.00',
        requestedQuantity: 1,
        purchasedQuantity: 0 // Not purchased
      }
    ];

    const TestComponent = () => {
      const [picklist, setPicklist] = React.useState(multiSupplierPicklist);
      
      const completeApple = () => {
        setPicklist(prevList => 
          prevList.map(item => 
            item.id === 1 
              ? { ...item, purchasedQuantity: 2 }
              : item
          )
        );
      };

      return (
        <div>
          <ShoppingList
            picklist={picklist}
            onBack={() => {}}
            shareId="test-share"
            showCompleted={false}
          />
          <button onClick={completeApple} data-testid="complete-apple">
            Complete Apple
          </button>
        </div>
      );
    };

    const user = userEvent.setup();
    render(<TestComponent />);

    // Initially should show both items under Fresh Foods
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.getByText('Fresh Foods')).toBeInTheDocument();
    });

    // Should show Apple as partial and Banana as unchecked
    expect(screen.getByText('1 remaining')).toBeInTheDocument();

    // Complete Apple
    const completeButton = screen.getByTestId('complete-apple');
    await user.click(completeButton);

    // After completion, Apple remaining should be gone, Banana should still be there
    await waitFor(() => {
      expect(screen.queryByText('1 remaining')).not.toBeInTheDocument();
    });

    // Banana should still be visible
    expect(screen.getByText('Banana')).toBeInTheDocument();
    
    // Fresh Foods supplier should still be there (because of Banana)
    expect(screen.getByText('Fresh Foods')).toBeInTheDocument();
  });

  test('should handle rapid quantity changes correctly', async () => {
    const TestComponent = () => {
      const [purchasedQty, setPurchasedQty] = React.useState(0);
      
      const picklist = [
        {
          id: 1,
          item: 'Rapid Change Item',
          quantity: 3,
          selectedSupplier: 'Test Supplier',
          unitPrice: 1.00,
          totalPrice: '3.00',
          requestedQuantity: 3,
          purchasedQuantity: purchasedQty
        }
      ];

      return (
        <div>
          <ShoppingList
            picklist={picklist}
            onBack={() => {}}
            shareId="test-share"
            showCompleted={false}
          />
          <button onClick={() => setPurchasedQty(1)} data-testid="buy-1">Buy 1</button>
          <button onClick={() => setPurchasedQty(2)} data-testid="buy-2">Buy 2</button>
          <button onClick={() => setPurchasedQty(3)} data-testid="buy-3">Buy All</button>
          <button onClick={() => setPurchasedQty(0)} data-testid="reset">Reset</button>
        </div>
      );
    };

    const user = userEvent.setup();
    render(<TestComponent />);

    // Initially should show full quantity as remaining
    await waitFor(() => {
      expect(screen.getByText('Rapid Change Item')).toBeInTheDocument();
    });

    // Buy 1 - should show partial
    await user.click(screen.getByTestId('buy-1'));
    await waitFor(() => {
      expect(screen.getByText('2 remaining')).toBeInTheDocument();
    });

    // Buy 2 - should show 1 remaining
    await user.click(screen.getByTestId('buy-2'));
    await waitFor(() => {
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
      expect(screen.queryByText('2 remaining')).not.toBeInTheDocument();
    });

    // Buy all - remaining should disappear
    await user.click(screen.getByTestId('buy-3'));
    await waitFor(() => {
      expect(screen.queryByText('1 remaining')).not.toBeInTheDocument();
      expect(screen.getByText('3 purchased')).toBeInTheDocument();
    });

    // Reset - should show original item again
    await user.click(screen.getByTestId('reset'));
    await waitFor(() => {
      expect(screen.queryByText('3 purchased')).not.toBeInTheDocument();
      expect(screen.getByText('Rapid Change Item')).toBeInTheDocument();
    });
  });

  test('should hide strikethrough completed items when showCompleted is false', async () => {
    // This test specifically covers the scenario shown in the user's screenshots
    const TestComponent = () => {
      const [picklist, setPicklist] = React.useState([
        {
          id: 1,
          item: 'GND Scentsation Hand & Body Lotion 8.3 oz *Pick Your Scent*[Lavender & Jojoba]',
          quantity: 1,
          selectedSupplier: 'KASHI',
          unitPrice: 1.00,
          totalPrice: '1.00',
          requestedQuantity: 1,
          purchasedQuantity: 0 // Not yet completed
        }
      ]);
      
      const completeItem = () => {
        setPicklist([{
          ...picklist[0],
          purchasedQuantity: 1 // Complete the item
        }]);
      };

      return (
        <div>
          <ShoppingList
            picklist={picklist}
            onBack={() => {}}
            shareId="test-share"
            showCompleted={false} // Key: completed items should be hidden
          />
          <button onClick={completeItem} data-testid="complete-item">
            Complete Item
          </button>
        </div>
      );
    };

    const user = userEvent.setup();
    render(<TestComponent />);

    // Initially should show the item
    await waitFor(() => {
      expect(screen.getByText('GND Scentsation Hand & Body Lotion 8.3 oz *Pick Your Scent*[Lavender & Jojoba]')).toBeInTheDocument();
    });

    // Should show supplier header with correct count
    expect(screen.getByText('KASHI')).toBeInTheDocument();

    // Complete the item
    const completeButton = screen.getByTestId('complete-item');
    await user.click(completeButton);

    // After completion, the item should disappear immediately (no refresh needed)
    await waitFor(() => {
      expect(screen.queryByText('GND Scentsation Hand & Body Lotion 8.3 oz *Pick Your Scent*[Lavender & Jojoba]')).not.toBeInTheDocument();
    });

    // The supplier section should still be there but show 0 items or be empty
    // This matches the behavior shown in the user's screenshots
  });
});