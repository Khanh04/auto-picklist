import React, { useState, useEffect } from 'react'
import { usePicklistSync } from '../hooks/usePicklistSync'
import { usePicklistData } from '../hooks/usePicklistData'
import { useBulkEdit } from '../hooks/useBulkEdit'
import { usePicklistOperations } from '../hooks/usePicklistOperations'
import { devLog } from '../utils/logger'

// Component imports
import PicklistHeader from './Header/PicklistHeader'
import InstructionsPanel from './Header/InstructionsPanel'
import BulkEditPanel from './BulkEdit/BulkEditPanel'
import PicklistTable from './Table/PicklistTable'
import ExportResultsPanel from './Export/ExportResultsPanel'
import ActionButtons from './Export/ActionButtons'

function PicklistPreview({ results, onBack, onNavigate }) {
  const [initialDataFetched, setInitialDataFetched] = useState(false)
  const [lastProcessedPicklistHash, setLastProcessedPicklistHash] = useState('')

  // Initialize picklist sync with centralized state management
  const {
    picklist: currentPicklist,
    updateItem,
    updateMultipleItems,
    setPicklist,
    loadInitialData
  } = usePicklistSync(null, {
    onPicklistUpdate: null // We'll handle updates through context now
  })

  // Load initial picklist from results when component mounts or results change
  useEffect(() => {
    if (results && results.picklist && results.picklist.length > 0) {
      devLog('Setting picklist from results:', results.picklist.length, 'items')
      setPicklist(results.picklist)
    }
  }, [results, setPicklist])

  // Reset state when props change to a truly different picklist
  React.useEffect(() => {
    const currentHash = JSON.stringify({
      hasResults: !!results,
      picklistLength: currentPicklist.length,
      firstItemOriginal: currentPicklist[0]?.originalItem || '',
      firstItemId: currentPicklist[0]?.matchedItemId || null
    })

    if (currentHash !== lastProcessedPicklistHash) {
      setInitialDataFetched(false)
      setLastProcessedPicklistHash(currentHash)
    }
  }, [results, currentPicklist, lastProcessedPicklistHash])

  // Custom hooks for data and operations
  const {
    availableSuppliers,
    availableItems,
    selectOptions,
    productSuppliers,
    fuseInstance,
    fetchProductSuppliers
  } = usePicklistData(currentPicklist, initialDataFetched, setInitialDataFetched)

  const {
    selectedRows,
    showBulkEdit,
    bulkMatchItem,
    bulkEditMode,
    setBulkEditMode,
    setBulkMatchItem,
    handleRowSelection,
    handleSelectAll,
    handleClearSelection
  } = useBulkEdit()

  const {
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
  } = usePicklistOperations(
    currentPicklist,
    availableItems,
    updateItem,
    updateMultipleItems,
    fetchProductSuppliers,
    productSuppliers
  )

  // Get common suppliers for bulk supplier selection
  const getCommonSuppliersForSelection = async () => {
    if (selectedRows.size === 0) return []

    try {
      // Get all unique product IDs from selected rows
      const selectedProductIds = new Set()
      for (const index of selectedRows) {
        const item = currentPicklist[index]
        if (item.matchedItemId) {
          selectedProductIds.add(item.matchedItemId)
        }
      }

      if (selectedProductIds.size === 0) return []

      // If only one product type selected, get its suppliers
      if (selectedProductIds.size === 1) {
        const productId = Array.from(selectedProductIds)[0]
        return await fetchProductSuppliers(productId)
      }

      // For multiple products, get suppliers that are available for ALL selected products
      const supplierSets = []
      for (const productId of selectedProductIds) {
        const suppliers = await fetchProductSuppliers(productId)
        supplierSets.push(new Set(suppliers.map(s => s.name)))
      }

      // Find intersection of all supplier sets
      const commonSuppliers = supplierSets.reduce((intersection, currentSet) => {
        return new Set([...intersection].filter(x => currentSet.has(x)))
      })

      // Get full supplier info for common suppliers
      if (commonSuppliers.size > 0) {
        const firstProductId = Array.from(selectedProductIds)[0]
        const allSuppliers = await fetchProductSuppliers(firstProductId)
        return allSuppliers.filter(s => commonSuppliers.has(s.name))
      }

      return []
    } catch (error) {
      console.error('Error getting common suppliers:', error)
      return []
    }
  }

  const handleShoppingList = async () => {
    // Store preferences before navigating to shopping list
    await storePreferences()

    // Navigate to shopping list
    if (onNavigate) {
      onNavigate('shopping')
    }
  }

  // Only show "no data" if we have no source data at all
  if (!currentPicklist.length && !results?.picklist) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">[!]</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Picklist Data</h2>
          <p className="text-gray-600 mb-6">Unable to load picklist for preview.</p>
          <button
            onClick={onBack}
            className="gradient-bg text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Back to Upload
          </button>
        </div>
      </div>
    )
  }

  const summary = calculateSummary()

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Header */}
          <PicklistHeader results={results} summary={summary} />

          {/* Instructions */}
          <InstructionsPanel />

          {/* Bulk Edit Controls */}
          {showBulkEdit && (
            <BulkEditPanel
              selectedRows={selectedRows}
              bulkEditMode={bulkEditMode}
              setBulkEditMode={setBulkEditMode}
              bulkMatchItem={bulkMatchItem}
              setBulkMatchItem={setBulkMatchItem}
              selectOptions={selectOptions}
              fuseInstance={fuseInstance}
              currentPicklist={currentPicklist}
              onClearSelection={handleClearSelection}
              onBulkMatch={(selectedOption) => handleBulkMatch(selectedOption, selectedRows, handleClearSelection)}
              onBulkSupplierChange={(selectedSupplier) => handleBulkSupplierChange(selectedSupplier, selectedRows, handleClearSelection)}
              getCommonSuppliersForSelection={getCommonSuppliersForSelection}
            />
          )}

          {/* Picklist Table */}
          <PicklistTable
            currentPicklist={currentPicklist}
            selectedRows={selectedRows}
            editingCell={editingCell}
            selectOptions={selectOptions}
            fuseInstance={fuseInstance}
            availableSuppliers={availableSuppliers}
            productSuppliers={productSuppliers}
            onSelectAll={() => handleSelectAll(currentPicklist)}
            onRowSelection={handleRowSelection}
            onCellEdit={handleCellEdit}
            onSelectChange={handleSelectChange}
            onCellClick={handleCellClick}
            onCellBlur={handleCellBlur}
          />

          {/* Export Results Section */}
          <ExportResultsPanel exportResult={exportResult} />

          {/* Action Buttons */}
          <ActionButtons
            onBack={onBack}
            onShoppingList={handleShoppingList}
            onExport={handleExport}
            isExporting={isExporting}
          />
        </div>
      </div>
    </div>
  )
}

export default PicklistPreview