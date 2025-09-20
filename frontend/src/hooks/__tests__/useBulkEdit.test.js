import { renderHook, act } from '@testing-library/react'
import { useBulkEdit } from '../useBulkEdit'
import { mockPicklist } from '../../test-utils/mockData'

describe('useBulkEdit', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useBulkEdit())

    expect(result.current.selectedRows).toEqual(new Set())
    expect(result.current.showBulkEdit).toBe(false)
    expect(result.current.bulkMatchItem).toBeNull()
    expect(result.current.bulkSupplier).toBeNull()
    expect(result.current.bulkEditMode).toBe('item')
  })

  it('should handle row selection', () => {
    const { result } = renderHook(() => useBulkEdit())

    act(() => {
      result.current.handleRowSelection(0, true)
    })

    expect(result.current.selectedRows.has(0)).toBe(true)
    expect(result.current.showBulkEdit).toBe(true)
  })

  it('should handle row deselection', () => {
    const { result } = renderHook(() => useBulkEdit())

    // First select a row
    act(() => {
      result.current.handleRowSelection(0, true)
    })

    // Then deselect it
    act(() => {
      result.current.handleRowSelection(0, false)
    })

    expect(result.current.selectedRows.has(0)).toBe(false)
    expect(result.current.showBulkEdit).toBe(false)
  })

  it('should handle multiple row selections', () => {
    const { result } = renderHook(() => useBulkEdit())

    act(() => {
      result.current.handleRowSelection(0, true)
    })

    act(() => {
      result.current.handleRowSelection(1, true)
    })

    act(() => {
      result.current.handleRowSelection(2, true)
    })

    expect(result.current.selectedRows.size).toBe(3)
    expect(result.current.selectedRows.has(0)).toBe(true)
    expect(result.current.selectedRows.has(1)).toBe(true)
    expect(result.current.selectedRows.has(2)).toBe(true)
    expect(result.current.showBulkEdit).toBe(true)
  })

  it('should handle select all when no rows are selected', () => {
    const { result } = renderHook(() => useBulkEdit())

    act(() => {
      result.current.handleSelectAll(mockPicklist)
    })

    expect(result.current.selectedRows.size).toBe(mockPicklist.length)
    expect(result.current.showBulkEdit).toBe(true)

    // Check that all indices are selected
    for (let i = 0; i < mockPicklist.length; i++) {
      expect(result.current.selectedRows.has(i)).toBe(true)
    }
  })

  it('should handle select all when all rows are selected (deselect all)', () => {
    const { result } = renderHook(() => useBulkEdit())

    // First select all rows
    act(() => {
      result.current.handleSelectAll(mockPicklist)
    })

    // Then call select all again (should deselect all)
    act(() => {
      result.current.handleSelectAll(mockPicklist)
    })

    expect(result.current.selectedRows.size).toBe(0)
    expect(result.current.showBulkEdit).toBe(false)
  })

  it('should handle clear selection', () => {
    const { result } = renderHook(() => useBulkEdit())

    // First select some rows and set some state
    act(() => {
      result.current.handleRowSelection(0, true)
      result.current.handleRowSelection(1, true)
      result.current.setBulkEditMode('supplier')
      result.current.setBulkMatchItem({ id: 1, item: { description: 'Test' } })
    })

    // Then clear selection
    act(() => {
      result.current.handleClearSelection()
    })

    expect(result.current.selectedRows.size).toBe(0)
    expect(result.current.showBulkEdit).toBe(false)
    expect(result.current.bulkMatchItem).toBeNull()
    expect(result.current.bulkSupplier).toBeNull()
    expect(result.current.bulkEditMode).toBe('item')
  })

  it('should handle bulk edit mode changes', () => {
    const { result } = renderHook(() => useBulkEdit())

    act(() => {
      result.current.setBulkEditMode('supplier')
    })

    expect(result.current.bulkEditMode).toBe('supplier')

    act(() => {
      result.current.setBulkEditMode('item')
    })

    expect(result.current.bulkEditMode).toBe('item')
  })

  it('should handle bulk match item changes', () => {
    const { result } = renderHook(() => useBulkEdit())

    const testItem = { id: 1, item: { description: 'Test Item' } }

    act(() => {
      result.current.setBulkMatchItem(testItem)
    })

    expect(result.current.bulkMatchItem).toBe(testItem)
  })

  it('should maintain selection state correctly', () => {
    const { result } = renderHook(() => useBulkEdit())

    // Select row 0
    act(() => {
      result.current.handleRowSelection(0, true)
    })

    expect(result.current.selectedRows.has(0)).toBe(true)
    expect(result.current.selectedRows.size).toBe(1)

    // Select row 2 (skip row 1)
    act(() => {
      result.current.handleRowSelection(2, true)
    })

    expect(result.current.selectedRows.has(0)).toBe(true)
    expect(result.current.selectedRows.has(1)).toBe(false)
    expect(result.current.selectedRows.has(2)).toBe(true)
    expect(result.current.selectedRows.size).toBe(2)

    // Deselect row 0
    act(() => {
      result.current.handleRowSelection(0, false)
    })

    expect(result.current.selectedRows.has(0)).toBe(false)
    expect(result.current.selectedRows.has(2)).toBe(true)
    expect(result.current.selectedRows.size).toBe(1)
    expect(result.current.showBulkEdit).toBe(true)
  })
})