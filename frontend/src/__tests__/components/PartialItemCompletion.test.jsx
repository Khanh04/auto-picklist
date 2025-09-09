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
    broadcastUpdate: jest.fn()
  })
}));

jest.mock('../../utils/logger', () => ({
  devLog: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe('Partial Item Completion', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  test('should make remaining portion row disappear immediately when completing partial item with remaining quantity 1', async () => {
    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        data: { purchasedQuantity: 5, requestedQuantity: 5 } // Now fully purchased
      })
    });

    const partiallyPurchasedItem = [
      {
        id: 1,
        item: 'Apple Juice',
        quantity: 5,
        selectedSupplier: 'Fresh Market',
        unitPrice: 2.50,
        totalPrice: '12.50',
        requestedQuantity: 5,
        purchasedQuantity: 4 // 4 purchased, 1 remaining
      }
    ];

    const user = userEvent.setup();
    render(
      <ShoppingList
        picklist={partiallyPurchasedItem}
        onBack={() => {}}
        shareId="test-share"
        showCompleted={false}
      />
    );

    // Initially should show both purchased and remaining portions
    await waitFor(() => {
      expect(screen.getByText('4 purchased')).toBeInTheDocument();
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
    });

    // Find and click on the remaining portion (the unchecked one)
    const remainingPortionRow = screen.getByText('1 remaining').closest('div');
    await user.click(remainingPortionRow);

    // After clicking, the remaining portion should disappear immediately
    await waitFor(() => {
      expect(screen.queryByText('1 remaining')).not.toBeInTheDocument();
    });

    // Should now show fully purchased (or no items if showCompleted is false)
    // The key is that the "1 remaining" row is gone immediately
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/shopping-list/share/test-share/item/0'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"purchasedQuantity":5') // 4 + 1 = 5
      })
    );
  });

  test('should correctly calculate purchased quantity for items with different partial states', async () => {
    const scenarios = [
      { initial: 0, total: 3, expected: 3 }, // 0 -> 3 (complete)
      { initial: 1, total: 3, expected: 3 }, // 1 -> 3 (complete remaining 2)
      { initial: 2, total: 3, expected: 3 }, // 2 -> 3 (complete remaining 1)
    ];

    for (const { initial, total, expected } of scenarios) {
      fetch.mockClear();
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { purchasedQuantity: expected, requestedQuantity: total }
        })
      });

      const TestScenario = () => {
        const [picklist] = React.useState([
          {
            id: 1,
            item: `Test Item (${initial}/${total})`,
            quantity: total,
            selectedSupplier: 'Test Supplier',
            unitPrice: 1.00,
            totalPrice: total.toFixed(2),
            requestedQuantity: total,
            purchasedQuantity: initial
          }
        ]);

        return (
          <ShoppingList
            picklist={picklist}
            onBack={() => {}}
            shareId="test-share"
            showCompleted={false}
          />
        );
      };

      const user = userEvent.setup();
      const { unmount } = render(<TestScenario />);

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText(`Test Item (${initial}/${total})`)).toBeInTheDocument();
      });

      // Find the remaining portion if it exists, otherwise find the main item
      const remaining = total - initial;
      if (remaining > 0) {
        if (initial > 0) {
          // Should show both purchased and remaining portions
          expect(screen.getByText(`${initial} purchased`)).toBeInTheDocument();
          expect(screen.getByText(`${remaining} remaining`)).toBeInTheDocument();
          
          // Click on remaining portion
          const remainingRow = screen.getByText(`${remaining} remaining`).closest('div');
          await user.click(remainingRow);
        } else {
          // Should show only the main item (not split)
          const itemRow = screen.getByText(`Test Item (${initial}/${total})`).closest('div');
          await user.click(itemRow);
        }

        // Verify API call with correct purchased quantity
        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/shopping-list/share/test-share/item/0'),
            expect.objectContaining({
              method: 'PUT',
              body: expect.stringContaining(`"purchasedQuantity":${expected}`)
            })
          );
        });
      }

      unmount();
    }
  });

  test('should handle rapid clicks on remaining portion without duplicate API calls', async () => {
    // Mock API to respond after a delay to simulate network conditions
    fetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: { purchasedQuantity: 3, requestedQuantity: 3 }
          })
        }), 100)
      )
    );

    const partialItem = [
      {
        id: 1,
        item: 'Quick Click Test',
        quantity: 3,
        selectedSupplier: 'Test Supplier',
        unitPrice: 1.00,
        totalPrice: '3.00',
        requestedQuantity: 3,
        purchasedQuantity: 2 // 1 remaining
      }
    ];

    const user = userEvent.setup();
    render(
      <ShoppingList
        picklist={partialItem}
        onBack={() => {}}
        shareId="test-share"
        showCompleted={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
    });

    // Click rapidly multiple times
    const remainingRow = screen.getByText('1 remaining').closest('div');
    await user.click(remainingRow);
    await user.click(remainingRow);
    await user.click(remainingRow);

    // Should only make one API call despite multiple clicks
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // The remaining row should disappear
    await waitFor(() => {
      expect(screen.queryByText('1 remaining')).not.toBeInTheDocument();
    });
  });
});