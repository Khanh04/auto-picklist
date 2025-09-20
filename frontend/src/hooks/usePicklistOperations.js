import { useState } from 'react'
import { devLog } from '../utils/logger'

export function usePicklistOperations(
  currentPicklist,
  availableItems,
  updateItem,
  updateMultipleItems,
  fetchProductSuppliers,
  productSuppliers
) {
  const [editingCell, setEditingCell] = useState(null)
  const [exportResult, setExportResult] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleSelectChange = async (selectedOption, index) => {
    let changes = {}

    if (!selectedOption) {
      // Cleared selection - restore original item description
      const currentItem = currentPicklist[index]
      changes = {
        matchedItemId: null,
        item: currentItem.originalItem, // Restore original description
        manualOverride: false,
        selectedSupplier: 'back order',
        unitPrice: '',
        totalPrice: 'N/A'
      }
    } else {
      // Selected a product - fetch all suppliers and default to lowest price
      const selectedItem = selectedOption.item
      const currentItem = currentPicklist[index]

      changes = {
        matchedItemId: selectedItem.id,
        item: selectedItem.description, // Update displayed item description
        manualOverride: true
      }

      // Fetch suppliers for this product
      const suppliers = await fetchProductSuppliers(selectedItem.id)

      if (suppliers && suppliers.length > 0) {
        // Default to lowest price supplier (suppliers are already sorted by price)
        const defaultSupplier = suppliers[0]
        changes.selectedSupplier = defaultSupplier.supplier_name
        changes.unitPrice = defaultSupplier.price
        changes.totalPrice = (defaultSupplier.price * currentItem.quantity).toFixed(2)
      } else {
        // Fallback to original data if no specific suppliers found
        changes.selectedSupplier = selectedItem.bestSupplier
        changes.unitPrice = selectedItem.bestPrice
        changes.totalPrice = (selectedItem.bestPrice * currentItem.quantity).toFixed(2)
      }
    }

    // Update using centralized state management
    updateItem(index, changes)
  }

  const handleCellEdit = (index, field, value) => {
    let changes = {}

    if (field === 'matchedItem') {
      // Handle matched item selection
      if (!value) {
        // Cleared selection - restore original item description
        const currentItem = currentPicklist[index]
        changes = {
          matchedItemId: null,
          item: currentItem.originalItem, // Restore original description
          manualOverride: false,
          selectedSupplier: 'back order',
          unitPrice: '',
          totalPrice: 'N/A'
        }
      } else {
        // Selected an item
        const selectedItem = availableItems.find(item => item.id == value)
        if (selectedItem) {
          const currentItem = currentPicklist[index]
          changes = {
            matchedItemId: selectedItem.id,
            item: selectedItem.description, // Update the displayed item description
            manualOverride: true,
            selectedSupplier: selectedItem.bestSupplier,
            unitPrice: selectedItem.bestPrice,
            totalPrice: (selectedItem.bestPrice * currentItem.quantity).toFixed(2)
          }
        }
      }
    } else if (field === 'selectedSupplier') {
      const currentItem = currentPicklist[index]
      changes.selectedSupplier = value

      // Handle "back order" case
      if (value === 'back order') {
        changes.unitPrice = ''
        changes.totalPrice = 'N/A'
      } else if (currentItem.matchedItemId && productSuppliers[currentItem.matchedItemId]) {
        // If there's a matched item, update price based on selected supplier
        const suppliers = productSuppliers[currentItem.matchedItemId]
        const selectedSupplier = suppliers.find(s => s.supplier_name === value)

        if (selectedSupplier) {
          changes.unitPrice = selectedSupplier.price
          changes.totalPrice = (selectedSupplier.price * currentItem.quantity).toFixed(2)
        }
      } else if (!currentItem.manualOverride) {
        // Reset price if no specific supplier data available and not manually overridden
        changes.unitPrice = ''
        changes.totalPrice = 'N/A'
      }
    } else if (field === 'unitPrice') {
      const currentItem = currentPicklist[index]
      const price = parseFloat(value)
      changes.unitPrice = isNaN(price) ? value : price
      if (!isNaN(price)) {
        changes.totalPrice = (price * currentItem.quantity).toFixed(2)
      } else {
        changes.totalPrice = 'N/A'
      }
    } else if (field === 'quantity') {
      const currentItem = currentPicklist[index]
      const qty = parseInt(value)
      changes.quantity = isNaN(qty) ? value : qty
      if (!isNaN(qty) && typeof currentItem.unitPrice === 'number') {
        changes.totalPrice = (currentItem.unitPrice * qty).toFixed(2)
      }
    }

    // Update using centralized state management
    updateItem(index, changes)
  }

  const handleBulkMatch = async (selectedOption, selectedRows, handleClearSelection) => {
    if (!selectedOption || selectedRows.size === 0) return

    const selectedItem = selectedOption.item

    // Fetch suppliers for this product
    const suppliers = await fetchProductSuppliers(selectedItem.id)

    // Prepare bulk updates
    const updates = []

    // Apply the bulk match to all selected rows
    for (const index of selectedRows) {
      const currentItem = currentPicklist[index]
      let changes = {
        matchedItemId: selectedItem.id,
        item: selectedItem.description, // Update displayed item description
        manualOverride: true
      }

      if (suppliers && suppliers.length > 0) {
        // Default to lowest price supplier (suppliers are already sorted by price)
        const defaultSupplier = suppliers[0]
        changes.selectedSupplier = defaultSupplier.supplier_name
        changes.unitPrice = defaultSupplier.price
        changes.totalPrice = (defaultSupplier.price * currentItem.quantity).toFixed(2)
      } else {
        // Fallback to original data if no specific suppliers found
        changes.selectedSupplier = selectedItem.bestSupplier
        changes.unitPrice = selectedItem.bestPrice
        changes.totalPrice = (selectedItem.bestPrice * currentItem.quantity).toFixed(2)
      }

      updates.push({ index, changes })
    }

    // Use bulk update from centralized state management
    updateMultipleItems(updates)

    // Clear selection after bulk operation
    handleClearSelection()
  }

  const handleBulkSupplierChange = async (selectedSupplier, selectedRows, handleClearSelection) => {
    if (!selectedSupplier || selectedRows.size === 0) return

    // Prepare bulk updates for supplier changes
    const updates = []

    // Apply the supplier change to all selected rows
    for (const index of selectedRows) {
      const currentItem = currentPicklist[index]
      const changes = {
        selectedSupplier: selectedSupplier.supplier_name,
        unitPrice: selectedSupplier.price,
        totalPrice: (selectedSupplier.price * currentItem.quantity).toFixed(2),
        manualOverride: true // Mark as manually overridden
      }

      updates.push({ index, changes })
    }

    // Use bulk update from centralized state management
    updateMultipleItems(updates)

    // Clear selection after bulk operation
    handleClearSelection()
  }

  const handleCellClick = (rowIndex, field) => {
    setEditingCell({ row: rowIndex, field })
  }

  const handleCellBlur = () => {
    setEditingCell(null)
  }

  const calculateSummary = () => {
    const itemsWithSuppliers = currentPicklist.filter(item =>
      item && item.selectedSupplier !== 'back order'
    ).length

    const preferenceMatches = currentPicklist.filter(item =>
      item.isPreference === true
    ).length

    const totalCost = currentPicklist.reduce((sum, item) => {
      const price = parseFloat(item.totalPrice)
      return isNaN(price) ? sum : sum + price
    }, 0)

    return {
      totalItems: currentPicklist.length,
      itemsWithSuppliers,
      preferenceMatches,
      totalCost
    }
  }

  // Helper function to store preferences (manual overrides)
  const storePreferences = async () => {
    // Capture manual overrides for machine learning (product matching only)
    const preferences = currentPicklist
      .filter(item => item.manualOverride && item.matchedItemId)
      .map(item => ({
        originalItem: item.originalItem,
        matchedProductId: item.matchedItemId
      }))

    // Store preferences if any manual overrides were made
    if (preferences.length > 0) {
      try {
        const response = await fetch('/api/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ preferences })
        })

        if (!response.ok) {
          console.error('Failed to store preferences - server error:', response.status)
        }
      } catch (prefError) {
        console.warn('Failed to store preferences - network error:', prefError)
        // Don't block operation if preference storage fails
      }
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportResult(null)

    try {
      const summary = calculateSummary()

      // Store preferences before export
      await storePreferences()

      // Prepare export data with final item name (use matched item description if available, otherwise original)
      const exportPicklist = currentPicklist.map(item => {
        const matchedItem = availableItems.find(dbItem => dbItem.id === item.matchedItemId)
        return {
          ...item,
          item: matchedItem ? matchedItem.description : item.originalItem
        }
      })

      // Send export request directly
      const response = await fetch('/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ picklist: exportPicklist, summary })
      })

      const result = await response.json()
      devLog('Export response:', result)

      if (result.success) {
        setExportResult(result)
        devLog('Export result set:', result)

        // Learning preferences stored for future use
      } else {
        alert('Export failed: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Network error during export. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return {
    editingCell,
    exportResult,
    isExporting,
    handleSelectChange,
    handleCellEdit,
    handleBulkMatch,
    handleBulkSupplierChange,
    handleCellClick,
    handleCellBlur,
    calculateSummary,
    handleExport,
    storePreferences
  }
}