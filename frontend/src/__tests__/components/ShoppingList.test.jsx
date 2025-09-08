import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('ShoppingList Component', () => {
  const defaultProps = {
    picklist: [
      {
        id: 1,
        item: 'Apple',
        quantity: 3,
        selectedSupplier: 'Fresh Foods',
        unitPrice: 2.50,
        totalPrice: '7.50',
        requestedQuantity: 3,
        purchasedQuantity: 0
      },
      {
        id: 2,
        item: 'Orange',
        quantity: 2,
        selectedSupplier: 'Citrus Co',
        unitPrice: 1.75,
        totalPrice: '3.50',
        requestedQuantity: 2,
        purchasedQuantity: 1
      }
    ],
    onBack: jest.fn(),
    shareId: null,
    loading: false,
    onPicklistUpdate: jest.fn()
  };

  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    test('should render shopping list with items', () => {
      render(<ShoppingList {...defaultProps} />);
      
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Orange')).toBeInTheDocument();
      expect(screen.getByText('Fresh Foods')).toBeInTheDocument();
      expect(screen.getByText('Citrus Co')).toBeInTheDocument();
    });

    test('should display progress correctly', () => {
      render(<ShoppingList {...defaultProps} />);
      
      // Should show progress based on purchased quantities
      expect(screen.getByText(/1 of 2 items/)).toBeInTheDocument();
    });

    test('should group items by supplier', () => {
      render(<ShoppingList {...defaultProps} />);
      
      expect(screen.getByText('Fresh Foods')).toBeInTheDocument();
      expect(screen.getByText('Citrus Co')).toBeInTheDocument();
    });

    test('should render empty state when no items', () => {
      render(<ShoppingList {...defaultProps} picklist={[]} />);
      
      expect(screen.getByText(/no items in your shopping list/i)).toBeInTheDocument();
    });

    test('should show loading state', () => {
      render(<ShoppingList {...defaultProps} loading={true} />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('partial quantities', () => {
    test('should display remaining quantity correctly', () => {
      render(<ShoppingList {...defaultProps} />);
      
      // Orange has requestedQuantity: 2, purchasedQuantity: 1, so remaining should be 1
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
    });

    test('should calculate checkbox state correctly for remaining portions', () => {
      const { container } = render(<ShoppingList {...defaultProps} />);
      
      // Find remaining portion items (these should not be checked since remaining > 0)
      const remainingItems = container.querySelectorAll('[data-testid*="remaining"]');
      // This would need specific test IDs in the actual component to test properly
    });

    test('should handle clicking on partial item with remaining quantity 1', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} shareId="test-share" />);
      
      // Find the item with remaining quantity and click it
      const orangeItem = screen.getByText('Orange').closest('[data-testid]') || 
                        screen.getByText('Orange').closest('div');
      
      if (orangeItem) {
        await user.click(orangeItem);
        
        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/shopping-list/share/test-share/item/'),
            expect.objectContaining({
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: expect.stringContaining('purchasedQuantity')
            })
          );
        });
      }
    });
  });

  describe('quantity modal', () => {
    test('should show quantity modal for items with remaining quantity > 1', async () => {
      const picklistWithLargeQuantity = [
        {
          id: 1,
          item: 'Apple',
          quantity: 5,
          selectedSupplier: 'Fresh Foods',
          unitPrice: 2.50,
          totalPrice: '12.50',
          requestedQuantity: 5,
          purchasedQuantity: 0
        }
      ];

      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} picklist={picklistWithLargeQuantity} />);
      
      const appleItem = screen.getByText('Apple').closest('div');
      if (appleItem) {
        await user.click(appleItem);
        
        await waitFor(() => {
          expect(screen.getByText(/select quantity/i)).toBeInTheDocument();
        });
      }
    });

    test('should update quantity through modal', async () => {
      const picklistWithLargeQuantity = [
        {
          id: 1,
          item: 'Apple',
          quantity: 5,
          selectedSupplier: 'Fresh Foods',
          unitPrice: 2.50,
          totalPrice: '12.50',
          requestedQuantity: 5,
          purchasedQuantity: 0
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} picklist={picklistWithLargeQuantity} shareId="test-share" />);
      
      const appleItem = screen.getByText('Apple').closest('div');
      if (appleItem) {
        await user.click(appleItem);
        
        await waitFor(() => {
          expect(screen.getByText(/select quantity/i)).toBeInTheDocument();
        });

        // Find and update quantity input
        const quantityInput = screen.getByDisplayValue('5');
        await user.clear(quantityInput);
        await user.type(quantityInput, '3');

        // Click confirm button
        const confirmButton = screen.getByText(/confirm/i);
        await user.click(confirmButton);

        await waitFor(() => {
          expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/shopping-list/share/test-share/item/'),
            expect.objectContaining({
              method: 'PUT',
              body: expect.stringContaining('"purchasedQuantity":3')
            })
          );
        });
      }
    });
  });

  describe('supplier operations', () => {
    test('should handle supplier toggle', async () => {
      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} />);
      
      const supplierHeader = screen.getByText('Fresh Foods');
      await user.click(supplierHeader);
      
      // Should toggle supplier section (collapse/expand)
      // This would need specific test implementation based on actual component structure
    });

    test('should handle bulk supplier check/uncheck', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} shareId="test-share" />);
      
      // Find supplier checkbox and click it
      const supplierCheckbox = screen.getAllByRole('button')[0]; // This would need proper test ID
      if (supplierCheckbox) {
        await user.click(supplierCheckbox);
        
        await waitFor(() => {
          expect(fetch).toHaveBeenCalled();
        });
      }
    });
  });

  describe('sharing functionality', () => {
    test('should handle share button click', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, shareId: 'new-share-123' })
      });

      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} />);
      
      const shareButton = screen.getByText(/share/i);
      await user.click(shareButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/shopping-list/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Shopping List')
        });
      });
    });

    test('should display share URL when shared', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, shareId: 'new-share-123' })
      });

      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} />);
      
      const shareButton = screen.getByText(/share/i);
      await user.click(shareButton);

      await waitFor(() => {
        expect(screen.getByText(/share this link/i)).toBeInTheDocument();
      });
    });
  });

  describe('filtering and display options', () => {
    test('should toggle completed items visibility', async () => {
      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} />);
      
      const showCompletedCheckbox = screen.getByLabelText(/show completed/i);
      await user.click(showCompletedCheckbox);
      
      expect(showCompletedCheckbox).toBeChecked();
    });

    test('should handle clear all operation', async () => {
      // Mock window.confirm
      window.confirm = jest.fn(() => true);
      
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} shareId="test-share" />);
      
      const clearAllButton = screen.getByText(/clear all/i);
      await user.click(clearAllButton);

      expect(window.confirm).toHaveBeenCalledWith('Clear all checked items?');
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });
  });

  describe('WebSocket integration', () => {
    test('should handle WebSocket messages', () => {
      // This would test WebSocket message handling
      // Implementation depends on how WebSocket updates are processed
      render(<ShoppingList {...defaultProps} shareId="test-share" />);
      
      // Mock WebSocket message
      // This would need to trigger the WebSocket message handler
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      fetch.mockRejectedValueOnce(new Error('API Error'));

      const user = userEvent.setup();
      render(<ShoppingList {...defaultProps} shareId="test-share" />);
      
      const appleItem = screen.getByText('Apple').closest('div');
      if (appleItem) {
        await user.click(appleItem);
        
        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalled();
        });
      }
      
      consoleSpy.mockRestore();
    });

    test('should handle malformed picklist data', () => {
      const malformedPicklist = [
        {
          // Missing required fields
          item: 'Apple'
        }
      ];

      expect(() => {
        render(<ShoppingList {...defaultProps} picklist={malformedPicklist} />);
      }).not.toThrow();
      
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });
  });

  describe('helper functions', () => {
    test('isItemChecked should calculate correctly', () => {
      render(<ShoppingList {...defaultProps} />);
      
      // Test the isItemChecked logic
      // Item with purchasedQuantity >= requestedQuantity should be checked
      // This would need to be tested through the component behavior or by accessing the function
    });

    test('should calculate total cost correctly', () => {
      render(<ShoppingList {...defaultProps} />);
      
      // Should show correct total cost calculation
      expect(screen.getByText('$11.00')).toBeInTheDocument(); // 7.50 + 3.50
    });

    test('should calculate progress percentage correctly', () => {
      render(<ShoppingList {...defaultProps} />);
      
      // With 1 of 2 items completed, should show 50%
      expect(screen.getByText('50% complete')).toBeInTheDocument();
    });
  });
});