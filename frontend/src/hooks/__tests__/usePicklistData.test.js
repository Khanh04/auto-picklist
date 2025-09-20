import { renderHook, waitFor, act } from '@testing-library/react'
import { usePicklistData } from '../usePicklistData'
import { mockPicklist, mockItems, mockSuppliers } from '../../test-utils/mockData'

// Mock the logger to avoid console logs during tests
jest.mock('../../utils/logger', () => ({
  devLog: jest.fn()
}))

// Mock apiClient
jest.mock('../../utils/apiClient', () => ({
  getSuppliers: jest.fn(),
  getItems: jest.fn(),
  get: jest.fn()
}))

import apiClient from '../../utils/apiClient'

describe('usePicklistData', () => {
  const mockSetInitialDataFetched = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default API responses
    apiClient.getSuppliers.mockResolvedValue({
      suppliers: mockSuppliers
    })

    apiClient.getItems.mockResolvedValue({
      items: mockItems
    })

    apiClient.get.mockResolvedValue({
      suppliers: [
        { supplier_price_id: 1, supplier_name: 'Supplier A', price: 10.99 },
        { supplier_price_id: 2, supplier_name: 'Supplier B', price: 12.50 }
      ]
    })
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() =>
      usePicklistData([], false, mockSetInitialDataFetched)
    )

    expect(result.current.availableSuppliers).toEqual([])
    expect(result.current.availableItems).toEqual([])
    expect(result.current.selectOptions).toEqual([])
    expect(result.current.productSuppliers).toEqual({})
    expect(result.current.fuseInstance).toBeNull()
  })

  it('should fetch data when picklist is available and not fetched', async () => {
    const { result } = renderHook(() =>
      usePicklistData(mockPicklist, false, mockSetInitialDataFetched)
    )

    await waitFor(() => {
      expect(apiClient.getSuppliers).toHaveBeenCalled()
      expect(apiClient.getItems).toHaveBeenCalled()
      expect(mockSetInitialDataFetched).toHaveBeenCalledWith(true)
    })

    await waitFor(() => {
      expect(result.current.availableItems).toEqual(mockItems)
      expect(result.current.selectOptions).toHaveLength(mockItems.length)
      expect(result.current.fuseInstance).not.toBeNull()
    })
  })

  it('should extract suppliers from picklist', async () => {
    const { result } = renderHook(() =>
      usePicklistData(mockPicklist, false, mockSetInitialDataFetched)
    )

    await waitFor(() => {
      expect(result.current.availableSuppliers).toContain('Supplier A')
      expect(result.current.availableSuppliers).toContain('Supplier B')
      expect(result.current.availableSuppliers).toContain('back order')
    })
  })

  it('should fetch product suppliers for matched items', async () => {
    const { result } = renderHook(() =>
      usePicklistData(mockPicklist, false, mockSetInitialDataFetched)
    )

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/items/1/suppliers')
      expect(apiClient.get).toHaveBeenCalledWith('/api/items/2/suppliers')
    })
  })

  it('should not fetch data if already fetched', () => {
    renderHook(() =>
      usePicklistData(mockPicklist, true, mockSetInitialDataFetched)
    )

    expect(apiClient.getSuppliers).not.toHaveBeenCalled()
    expect(apiClient.getItems).not.toHaveBeenCalled()
    expect(mockSetInitialDataFetched).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    apiClient.getSuppliers.mockRejectedValue(new Error('API Error'))
    apiClient.getItems.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() =>
      usePicklistData(mockPicklist, false, mockSetInitialDataFetched)
    )

    await waitFor(() => {
      expect(mockSetInitialDataFetched).toHaveBeenCalledWith(true)
    })

    // Should still set data fetched flag even on error
    expect(result.current.availableItems).toEqual([])
    expect(result.current.selectOptions).toEqual([])
  })

  it('should create correct select options from items', async () => {
    const { result } = renderHook(() =>
      usePicklistData(mockPicklist, false, mockSetInitialDataFetched)
    )

    await waitFor(() => {
      expect(result.current.selectOptions).toEqual([
        {
          value: 1,
          label: 'Test Item 1',
          item: mockItems[0]
        },
        {
          value: 2,
          label: 'Test Item 2',
          item: mockItems[1]
        },
        {
          value: 3,
          label: 'Test Item 3',
          item: mockItems[2]
        }
      ])
    })
  })

  it('should cache product suppliers', async () => {
    // Clear previous mock calls
    apiClient.get.mockClear()

    const { result } = renderHook(() =>
      usePicklistData([], true, mockSetInitialDataFetched)
    )

    // Call fetchProductSuppliers first time
    await act(async () => {
      await result.current.fetchProductSuppliers(1)
    })

    // Call fetchProductSuppliers second time - should use cache
    await act(async () => {
      await result.current.fetchProductSuppliers(1)
    })

    // Should only call API once due to caching
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get).toHaveBeenCalledWith('/api/items/1/suppliers')
  })
})