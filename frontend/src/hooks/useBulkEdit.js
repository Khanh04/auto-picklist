import { useState } from 'react'

export function useBulkEdit() {
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkMatchItem, setBulkMatchItem] = useState(null)
  const [bulkSupplier, setBulkSupplier] = useState(null)
  const [bulkEditMode, setBulkEditMode] = useState('item')

  const handleRowSelection = (index, isSelected) => {
    const newSelectedRows = new Set(selectedRows)
    if (isSelected) {
      newSelectedRows.add(index)
    } else {
      newSelectedRows.delete(index)
    }
    setSelectedRows(newSelectedRows)
    setShowBulkEdit(newSelectedRows.size > 0)
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