import { useState } from 'react'

export function useBulkEdit() {
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkMatchItem, setBulkMatchItem] = useState(null)
  const [bulkSupplier, setBulkSupplier] = useState(null)
  const [bulkEditMode, setBulkEditMode] = useState('item')
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)

  const handleRowSelection = (index, isSelected, isShiftKey = false, isCtrlKey = false) => {
    const newSelectedRows = new Set(selectedRows)

    if (isShiftKey && lastSelectedIndex !== null) {
      // Shift-click: Range selection from last selected to current
      const start = Math.min(index, lastSelectedIndex)
      const end = Math.max(index, lastSelectedIndex)

      // Add all rows in range to selection
      for (let i = start; i <= end; i++) {
        newSelectedRows.add(i)
      }
    } else if (isCtrlKey) {
      // Ctrl/Cmd-click: Add individual row to selection (don't toggle off)
      newSelectedRows.add(index)
    } else {
      // Normal click: Toggle single row
      if (isSelected) {
        newSelectedRows.add(index)
      } else {
        newSelectedRows.delete(index)
      }
    }

    setSelectedRows(newSelectedRows)
    setShowBulkEdit(newSelectedRows.size > 0)
    setLastSelectedIndex(index)
  }

  const handleSelectAll = (currentPicklist) => {
    if (selectedRows.size === currentPicklist.length) {
      // Deselect all
      setSelectedRows(new Set())
      setShowBulkEdit(false)
    } else {
      // Select all
      const allRows = new Set(currentPicklist.map((_, index) => index))
      setSelectedRows(allRows)
      setShowBulkEdit(true)
    }
  }

  const handleClearSelection = () => {
    setSelectedRows(new Set())
    setShowBulkEdit(false)
    setBulkMatchItem(null)
    setBulkSupplier(null)
    setBulkEditMode('item')
  }

  return {
    selectedRows,
    showBulkEdit,
    bulkMatchItem,
    bulkSupplier,
    bulkEditMode,
    setBulkEditMode,
    setBulkMatchItem,
    handleRowSelection,
    handleSelectAll,
    handleClearSelection
  }
}