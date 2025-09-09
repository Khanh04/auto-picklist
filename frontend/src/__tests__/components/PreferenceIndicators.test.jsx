import React from 'react';
import { render, screen } from '@testing-library/react';
import PicklistPreview from '../../components/PicklistPreview';
import { PicklistProvider } from '../../contexts/PicklistContext';

// Mock hooks and utilities
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

jest.mock('fuse.js', () => {
  return jest.fn().mockImplementation(() => ({
    search: jest.fn(() => [])
  }));
});

// Mock fetch
global.fetch = jest.fn();

describe('Preference Indicators in PicklistPreview', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
    
    // Mock API responses
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

  const mockResultsWithPreferences = {
    success: true,
    picklist: [
      {
        id: 1,
        originalItem: 'OPI Gel Color - Red Hot',
        item: 'OPI Gel Color - Red Hot',
        matchedDescription: 'OPI GelColor - Big Apple Red 0.5 oz',
        quantity: 2,
        selectedSupplier: 'Beauty Supply Co',
        unitPrice: 12.99,
        totalPrice: '25.98',
        matchedItemId: 123,
        manualOverride: false,
        isPreference: true,  // This item was matched by preference
        frequency: 3         // User has selected this match 3 times before
      },
      {
        id: 2,
        originalItem: 'CND Shellac - Base Coat',
        item: 'CND Shellac - Base Coat',
        matchedDescription: 'CND Shellac Base Coat 0.25 oz',
        quantity: 1,
        selectedSupplier: 'Nail Supply Plus',
        unitPrice: 9.50,
        totalPrice: '9.50',
        matchedItemId: 456,
        manualOverride: false,
        isPreference: false  // This item was matched automatically
      },
      {
        id: 3,
        originalItem: 'Gelish Polish - Purple',
        item: 'Gelish Polish - Purple', 
        matchedDescription: 'Gelish Soak-Off Gel - Royal Purple 0.5 oz',
        quantity: 1,
        selectedSupplier: 'Pro Nails Direct',
        unitPrice: 11.75,
        totalPrice: '11.75',
        matchedItemId: 789,
        manualOverride: false,
        isPreference: true,  // This item was matched by preference
        frequency: 1         // User has selected this match 1 time before
      }
    ]
  };

  test('should display preference indicators for items matched by preferences with proper layout', () => {
    render(
      <PicklistProvider>
        <PicklistPreview
          results={mockResultsWithPreferences}
          onBack={() => {}}
          onNavigate={() => {}}
        />
      </PicklistProvider>
    );

    // Should show preference indicators for items with isPreference: true
    const preferenceIndicators = screen.getAllByText('⭐ Preference');
    expect(preferenceIndicators).toHaveLength(2); // Items 1 and 3 have preferences

    // Should not show preference indicator for automatically matched items
    // We can verify this by checking that there are only 2 preference indicators, not 3
    expect(preferenceIndicators).toHaveLength(2);
  });

  test('should display correct tooltip information for preference indicators', () => {
    render(
      <PicklistProvider>
        <PicklistPreview
          results={mockResultsWithPreferences}
          onBack={() => {}}
          onNavigate={() => {}}
        />
      </PicklistProvider>
    );

    // Check tooltip for item with frequency 3
    const preferenceWithMultipleUses = screen.getByTitle('Matched by preference (used 3 times before)');
    expect(preferenceWithMultipleUses).toBeInTheDocument();

    // Check tooltip for item with frequency 1
    const preferenceWithSingleUse = screen.getByTitle('Matched by preference (used 1 time before)');
    expect(preferenceWithSingleUse).toBeInTheDocument();
  });

  test('should show correct preference matches count in summary', () => {
    render(
      <PicklistProvider>
        <PicklistPreview
          results={mockResultsWithPreferences}
          onBack={() => {}}
          onNavigate={() => {}}
        />
      </PicklistProvider>
    );

    // Should show 2 preference matches in the summary card
    expect(screen.getByText('⭐ 2')).toBeInTheDocument();
    expect(screen.getByText('Preference Matches')).toBeInTheDocument();
  });

  test('should display zero preference matches when no preferences exist', () => {
    const resultsWithoutPreferences = {
      success: true,
      picklist: [
        {
          id: 1,
          originalItem: 'Test Item',
          item: 'Test Item',
          matchedDescription: 'Test Product',
          quantity: 1,
          selectedSupplier: 'Test Supplier',
          unitPrice: 10.00,
          totalPrice: '10.00',
          matchedItemId: 999,
          manualOverride: false,
          isPreference: false
        }
      ]
    };

    render(
      <PicklistProvider>
        <PicklistPreview
          results={resultsWithoutPreferences}
          onBack={() => {}}
          onNavigate={() => {}}
        />
      </PicklistProvider>
    );

    // Should show 0 preference matches
    expect(screen.getByText('⭐ 0')).toBeInTheDocument();
    expect(screen.getByText('Preference Matches')).toBeInTheDocument();

    // Should not show any preference indicators in the table
    expect(screen.queryByText('⭐ Preference')).not.toBeInTheDocument();
  });

  test('should handle items with undefined frequency correctly', () => {
    const resultsWithUndefinedFrequency = {
      success: true,
      picklist: [
        {
          id: 1,
          originalItem: 'Test Preference Item',
          item: 'Test Preference Item',
          matchedDescription: 'Test Matched Product',
          quantity: 1,
          selectedSupplier: 'Test Supplier',
          unitPrice: 5.00,
          totalPrice: '5.00',
          matchedItemId: 111,
          manualOverride: false,
          isPreference: true
          // frequency is undefined
        }
      ]
    };

    render(
      <PicklistProvider>
        <PicklistPreview
          results={resultsWithUndefinedFrequency}
          onBack={() => {}}
          onNavigate={() => {}}
        />
      </PicklistProvider>
    );

    // Should show preference indicator
    expect(screen.getByText('⭐ Preference')).toBeInTheDocument();

    // Should handle undefined frequency gracefully (default to 1)
    expect(screen.getByTitle('Matched by preference (used 1 time before)')).toBeInTheDocument();
  });

  test('should maintain preference indicators after item edits', async () => {
    const { rerender } = render(
      <PicklistProvider>
        <PicklistPreview
          results={mockResultsWithPreferences}
          onBack={() => {}}
          onNavigate={() => {}}
        />
      </PicklistProvider>
    );

    // Initially should show 2 preference indicators
    expect(screen.getAllByText('⭐ Preference')).toHaveLength(2);

    // Simulate an item edit (preference status should be maintained)
    const updatedResults = {
      ...mockResultsWithPreferences,
      picklist: mockResultsWithPreferences.picklist.map(item => 
        item.id === 1 
          ? { ...item, quantity: 5 } // Edit quantity
          : item
      )
    };

    rerender(
      <PicklistProvider>
        <PicklistPreview
          results={updatedResults}
          onBack={() => {}}
          onNavigate={() => {}}
        />
      </PicklistProvider>
    );

    // Should still show 2 preference indicators after edit
    expect(screen.getAllByText('⭐ Preference')).toHaveLength(2);
  });

  test('should show preference explanation in instructions', () => {
    render(
      <PicklistProvider>
        <PicklistPreview
          results={mockResultsWithPreferences}
          onBack={() => {}}
          onNavigate={() => {}}
        />
      </PicklistProvider>
    );

    // Should show explanation about preference indicators
    expect(screen.getByText(/Items marked with ⭐/)).toBeInTheDocument();
    expect(screen.getByText(/automatically matched based on your past manual selections/)).toBeInTheDocument();
  });
});