import { renderHook, act, waitFor } from '@testing-library/react'
import { usePicklistOperations } from '../usePicklistOperations'
import { mockPicklist, mockItems } from '../../test-utils/mockData'

// Mock fetch for export tests
global.fetch = jest.fn()

// Mock the logger
jest.mock('../../utils/logger', () => ({
  devLog: jest.fn()
}))

describe('usePicklistOperations', () => {
  const mockUpdateItem = jest.fn()
  const mockUpdateMultipleItems = jest.fn()
  const mockFetchProductSuppliers = jest.fn()
  const mockProductSuppliers = {
    1: [
      { supplier_price_id: 1, supplier_name: 'Supplier A', price: 10.99 },
      { supplier_price_id: 2, supplier_name: 'Supplier B', price: 12.50 }
    ]
  }

  const defaultProps = {
    currentPicklist: mockPicklist,
    availableItems: mockItems,
    updateItem: mockUpdateItem,
    updateMultipleItems: mockUpdateMultipleItems,
    fetchProductSuppliers: mockFetchProductSuppliers,
    productSuppliers: mockProductSuppliers
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchProductSuppliers.mockResolvedValue([
      { supplier_price_id: 1, supplier_name: 'Supplier A', price: 10.99 }
    ])
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, csvUrl: '/test.csv' })
    })
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    expect(result.current.editingCell).toBeNull()
    expect(result.current.exportResult).toBeNull()
    expect(result.current.isExporting).toBe(false)
  })

  it('should calculate summary correctly', () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    const summary = result.current.calculateSummary()

    expect(summary.totalItems).toBe(3)
    expect(summary.itemsWithSuppliers).toBe(2) // Items not marked as "back order"
    expect(summary.preferenceMatches).toBe(1) // Items with isPreference: true
    expect(summary.totalCost).toBe(57.49) // 10.99 + 46.50
  })

  it('should handle cell editing for quantity', () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    act(() => {
      result.current.handleCellEdit(0, 'quantity', '5')
    })

    expect(mockUpdateItem).toHaveBeenCalledWith(0, {
      quantity: 5,
      totalPrice: '54.95' // 10.99 * 5
    })
  })

  it('should handle cell editing for unit price', () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    act(() => {
      result.current.handleCellEdit(0, 'unitPrice', '15.00')
    })

    expect(mockUpdateItem).toHaveBeenCalledWith(0, {
      unitPrice: 15.00,
      totalPrice: '15.00' // 15.00 * 1 (quantity from mockPicklist[0])
    })
  })

  it('should handle cell editing for supplier selection', () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    act(() => {
      result.current.handleCellEdit(0, 'selectedSupplier', 'Supplier B')
    })

    expect(mockUpdateItem).toHaveBeenCalledWith(0, {
      selectedSupplier: 'Supplier B',
      unitPrice: 12.50,
      totalPrice: '12.50'
    })
  })

  it('should handle back order selection', () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    act(() => {
      result.current.handleCellEdit(0, 'selectedSupplier', 'back order')
    })

    expect(mockUpdateItem).toHaveBeenCalledWith(0, {
      selectedSupplier: 'back order',
      unitPrice: '',
      totalPrice: 'N/A'
    })
  })

  it('should handle select change with new item', async () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    const selectedOption = {
      item: mockItems[0]
    }

    await act(async () => {
      await result.current.handleSelectChange(selectedOption, 0)
    })

    expect(mockFetchProductSuppliers).toHaveBeenCalledWith(1)
    expect(mockUpdateItem).toHaveBeenCalledWith(0, expect.objectContaining({
      matchedItemId: 1,
      item: 'Test Item 1',
      manualOverride: true
    }))
  })

  it('should handle select change with cleared selection', async () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    await act(async () => {
      await result.current.handleSelectChange(null, 0)
    })

    expect(mockUpdateItem).toHaveBeenCalledWith(0, {
      matchedItemId: null,
      item: mockPicklist[0].originalItem,
      manualOverride: false,
      selectedSupplier: 'back order',
      unitPrice: '',
      totalPrice: 'N/A'
    })
  })

  it('should handle bulk match operations', async () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    const selectedRows = new Set([0, 1])
    const handleClearSelection = jest.fn()
    const selectedOption = { item: mockItems[0] }

    await act(async () => {
      await result.current.handleBulkMatch(selectedOption, selectedRows, handleClearSelection)
    })

    expect(mockFetchProductSuppliers).toHaveBeenCalledWith(1)
    expect(mockUpdateMultipleItems).toHaveBeenCalledWith([
      {
        index: 0,
        changes: expect.objectContaining({
          matchedItemId: 1,
          item: 'Test Item 1',
          manualOverride: true
        })
      },
      {
        index: 1,
        changes: expect.objectContaining({
          matchedItemId: 1,
          item: 'Test Item 1',
          manualOverride: true
        })
      }
    ])
    expect(handleClearSelection).toHaveBeenCalled()
  })

  it('should handle bulk supplier change operations', async () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    const selectedRows = new Set([0, 1])
    const handleClearSelection = jest.fn()
    const selectedSupplier = { supplier_name: 'Supplier A', price: 10.99 }

    await act(async () => {
      await result.current.handleBulkSupplierChange(selectedSupplier, selectedRows, handleClearSelection)
    })

    expect(mockUpdateMultipleItems).toHaveBeenCalledWith([
      {
        index: 0,
        changes: {
          selectedSupplier: 'Supplier A',
          unitPrice: 10.99,
          totalPrice: '10.99', // 10.99 * 1 (quantity from mockPicklist[0])
          manualOverride: true
        }
      },
      {
        index: 1,
        changes: {
          selectedSupplier: 'Supplier A',
          unitPrice: 10.99,
          totalPrice: '32.97', // 10.99 * 3 (quantity from mockPicklist[1])
          manualOverride: true
        }
      }
    ])
    expect(handleClearSelection).toHaveBeenCalled()
  })

  it('should handle cell click and blur', () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    act(() => {
      result.current.handleCellClick(0, 'unitPrice')
    })

    expect(result.current.editingCell).toEqual({ row: 0, field: 'unitPrice' })

    act(() => {
      result.current.handleCellBlur()
    })

    expect(result.current.editingCell).toBeNull()
  })

  it('should handle export successfully', async () => {
    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    await act(async () => {
      await result.current.handleExport()
    })

    expect(global.fetch).toHaveBeenCalledWith('/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: expect.stringContaining('picklist')
    })

    expect(result.current.exportResult).toEqual({
      success: true,
      csvUrl: '/test.csv'
    })
    expect(result.current.isExporting).toBe(false)
  })

  it('should handle export failure', async () => {
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Export failed' })
    })

    // Mock alert
    const mockAlert = jest.fn()
    global.alert = mockAlert

    const { result } = renderHook(() => usePicklistOperations(...Object.values(defaultProps)))

    await act(async () => {
      await result.current.handleExport()
    })

    expect(mockAlert).toHaveBeenCalledWith('Export failed: Export failed')
    expect(result.current.isExporting).toBe(false)
  })

  it('should store unified preferences correctly', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })

    // Mock productSuppliers for the unified preference system
    const mockProductSuppliers = {
      1: [{ id: 1, name: 'Supplier A', price: 10.00 }],
      2: [{ id: 2, name: 'Supplier B', price: 15.00 }]
    }

    const picklistWithUnifiedPreferences = [
      {
        ...mockPicklist[0],
        manualOverride: true,
        matchedItemId: 1,
        selectedSupplier: 'Supplier A'
      },
      {
        ...mockPicklist[1],
        manualOverride: true,
        matchedItemId: 2,
        selectedSupplier: 'Supplier B'
      }
    ]

    const propsWithPreferences = {
      ...defaultProps,
      currentPicklist: picklistWithUnifiedPreferences,
      productSuppliers: mockProductSuppliers
    }

    const { result } = renderHook(() => usePicklistOperations(...Object.values(propsWithPreferences)))

    await act(async () => {
      await result.current.storePreferences()
    })

    // Should call unified preferences endpoint
    expect(global.fetch).toHaveBeenCalledWith('/api/preferences/unified', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        preferences: [
          {
            originalItem: picklistWithUnifiedPreferences[0].originalItem,
            productId: 1,
            supplierId: 1
          },
          {
            originalItem: picklistWithUnifiedPreferences[1].originalItem,
            productId: 2,
            supplierId: 2
          }
        ]
      })
    })
  })
})