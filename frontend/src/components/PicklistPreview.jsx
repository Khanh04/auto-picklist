import React, { useState, useEffect } from 'react'
import { Select, MenuItem, FormControl, TextField, Autocomplete, Chip } from '@mui/material'
import Fuse from 'fuse.js'
import { devLog } from '../utils/logger'
import { usePicklistSync } from '../hooks/usePicklistSync'

function PicklistPreview({ results, onBack, onNavigate }) {
  const [editingCell, setEditingCell] = useState(null)
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [availableItems, setAvailableItems] = useState([])
  const [selectOptions, setSelectOptions] = useState([]) // Options for react-select
  const [productSuppliers, setProductSuppliers] = useState({}) // Cache of supplier options per product
  const [exportResult, setExportResult] = useState(null) // Store export results
  const [isExporting, setIsExporting] = useState(false) // Track export status
  const [initialDataFetched, setInitialDataFetched] = useState(false) // Track if initial data fetch is done
  const [lastProcessedPicklistHash, setLastProcessedPicklistHash] = useState('') // Track the last processed picklist
  const [fuseInstance, setFuseInstance] = useState(null) // Fuzzy search instance
  const [selectedRows, setSelectedRows] = useState(new Set()) // Track selected rows for bulk edit
  const [showBulkEdit, setShowBulkEdit] = useState(false) // Show bulk edit controls
  const [bulkMatchItem, setBulkMatchItem] = useState(null) // Item to bulk match to

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

  // Handle side effects separately - only run once when picklist is first available
  React.useEffect(() => {
    if (currentPicklist.length > 0 && !initialDataFetched) {
      // Extract unique suppliers for dropdown
      const suppliers = [...new Set(currentPicklist
        .filter(item => item.selectedSupplier !== 'back order')
        .map(item => item.selectedSupplier)
      )].sort()
      setAvailableSuppliers([...suppliers, 'back order'])
      
      // Fetch database data
      fetchDatabaseData()
      
      // Fetch supplier data for matched items (only unique IDs)
      const uniqueMatchedIds = [...new Set(currentPicklist
        .filter(item => item.matchedItemId)
        .map(item => item.matchedItemId)
      )]
      
      uniqueMatchedIds.forEach(matchedItemId => {
        fetchProductSuppliers(matchedItemId)
      })
      
      setInitialDataFetched(true)
    }
  }, [currentPicklist.length, initialDataFetched])

  // Preferences are now applied in the backend during initial picklist creation

  const fetchDatabaseData = async () => {
    try {
      // Fetch suppliers
      const suppliersResponse = await fetch('/api/suppliers')
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json()
        const supplierNames = suppliersData.suppliers.map(s => s.name)
        const allSuppliers = [...new Set([...availableSuppliers.filter(s => s !== 'back order'), ...supplierNames])].sort()
        setAvailableSuppliers([...allSuppliers, 'back order'])
      }

      // Fetch available items for matching
      const itemsResponse = await fetch('/api/items')
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json()
        const items = itemsData.items || []
        devLog('PicklistPreview: Fetched items', items.length)
        setAvailableItems(items)
        
        // Prepare options for matched item selection (only product descriptions)
        const options = items.map(item => ({
          value: item.id,
          label: item.description, // Only show description, no supplier/price
          item: item // Store full item data for easy access
        }))
        devLog('PicklistPreview: Select options prepared', options.length)
        setSelectOptions(options)
        
        // Create Fuse instance for fuzzy matching (only product descriptions)
        const fuseOptions = {
          keys: [
            { name: 'item.description', weight: 1.0 } // Only search descriptions
          ],
          threshold: 0.6, // 0.0 = perfect match, 1.0 = match anything
          includeScore: true,
          minMatchCharLength: 2
        }
        const fuse = new Fuse(options, fuseOptions)
        setFuseInstance(fuse)
      }
    } catch (error) {
      console.error('Error fetching database data:', error)
    }
  }

  const fetchProductSuppliers = async (productId) => {
    if (productSuppliers[productId]) {
      return productSuppliers[productId]
    }
    
    try {
      const response = await fetch(`/api/items/${productId}/suppliers`)
      if (response.ok) {
        const data = await response.json()
        const suppliers = data.suppliers || []
        setProductSuppliers(prev => ({ ...prev, [productId]: suppliers }))
        return suppliers
      }
    } catch (error) {
      console.error('Error fetching product suppliers:', error)
    }
    return []
  }

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

  const calculateSummary = () => {
    const itemsWithSuppliers = currentPicklist.filter(item => 
      item.selectedSupplier !== 'back order'
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

  // Bulk edit functions
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

  const handleSelectAll = () => {
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
  }

  const handleBulkMatch = async (selectedOption) => {
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

  const handleShoppingList = async () => {
    // Store preferences before navigating to shopping list
    await storePreferences()
    
    // Navigate to shopping list
    if (onNavigate) {
      onNavigate('shopping')
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

  const handleCellClick = (rowIndex, field) => {
    setEditingCell({ row: rowIndex, field })
  }

  const handleCellBlur = () => {
    setEditingCell(null)
  }

  const renderEditableCell = (item, index, field, value) => {
    const isEditing = editingCell?.row === index && editingCell?.field === field
    
    if (field === 'selectedSupplier') {
      // If there's a matched item, show suppliers for that specific product
      const matchedItemId = item.matchedItemId
      const productSpecificSuppliers = matchedItemId ? productSuppliers[matchedItemId] : null
      const hasMultipleSuppliers = productSpecificSuppliers && productSpecificSuppliers.length > 1
      
      return (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => handleCellEdit(index, field, e.target.value)}
            className={`w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasMultipleSuppliers ? 'pr-8' : ''
            }`}
          >
            {productSpecificSuppliers ? (
              // Show suppliers for the specific matched product with prices
              <>
                <option value="back order">back order</option>
                {productSpecificSuppliers.map(supplier => (
                  <option key={supplier.supplier_price_id} value={supplier.supplier_name}>
                    {supplier.supplier_name} — ${parseFloat(supplier.price).toFixed(2)}
                  </option>
                ))}
              </>
            ) : (
              // Fallback to general supplier list
              availableSuppliers.map(supplier => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))
            )}
          </select>
          {hasMultipleSuppliers && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {productSpecificSuppliers.length}
              </span>
            </div>
          )}
        </div>
      )
    }

    if (field === 'matchedItem') {
      const selectedOption = selectOptions.find(option => option.value === item.matchedItemId)
      // Determine if this row is in the bottom 3 rows
      const isBottomRows = index >= (currentPicklist.length - 3)
      
      return (
        <div className="space-y-1">
          {/* Show learned match indicator */}
          {item.learnedMatch && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <span>AI</span>
              <span>Learned preference applied</span>
            </div>
          )}
          
          <Autocomplete
            value={selectedOption || null}
            onChange={(_, newValue) => handleSelectChange(newValue, index)}
            options={selectOptions}
            getOptionLabel={(option) => option ? option.item.description : ''}
            filterOptions={(options, { inputValue }) => {
              // If no input, show all options
              if (!inputValue || !fuseInstance) {
                return options
              }
              
              // Use fuzzy search
              const results = fuseInstance.search(inputValue)
              return results.map(result => result.item)
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.value}>
                <div className="font-medium text-gray-900">{option.item.description}</div>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="No match / Select item..."
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    minHeight: '40px',
                    fontSize: '14px',
                    '& fieldset': {
                      borderColor: item.learnedMatch ? '#3b82f6' : '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: item.learnedMatch ? '#2563eb' : '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                      borderWidth: '2px',
                    },
                  },
                }}
              />
            )}
            clearOnEscape
            disablePortal={!isBottomRows}
            slotProps={{
              popper: {
                placement: isBottomRows ? 'top' : 'bottom-start',
                modifiers: [
                  {
                    name: 'flip',
                    enabled: false,
                  },
                ],
              },
            }}
            sx={{
              width: '100%',
              '& .MuiAutocomplete-listbox': {
                maxHeight: '240px',
                fontSize: '14px',
              },
            }}
          />
        </div>
      )
    }
    
    if (field === 'originalItem') {
      return (
        <div className="p-2 min-h-[2.5rem] flex items-center">
          {value}
        </div>
      )
    }
    
    if (field === 'quantity' || field === 'unitPrice') {
      if (isEditing) {
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleCellEdit(index, field, e.target.value)}
            onBlur={handleCellBlur}
            autoFocus
            step={field === 'unitPrice' ? '0.01' : '1'}
            min="0"
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )
      }
      return (
        <div
          onClick={() => handleCellClick(index, field)}
          className="p-2 cursor-pointer hover:bg-gray-50 rounded-md text-center"
        >
          {field === 'unitPrice' && typeof value === 'number' ? `$${value.toFixed(2)}` : value}
        </div>
      )
    }
    
    return (
      <div className="p-2">
        {field === 'totalPrice' && value !== 'N/A' ? `$${value}` : value}
      </div>
    )
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
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              {results?.multiCsvData ? 'Combined Picklist Preview' : 'Picklist Preview'}
            </h2>
            <p className="text-gray-600 text-lg">Review and edit your picklist before exporting</p>
            
            {/* Multi-CSV Analytics */}
            {results?.multiCsvData && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mt-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-lg font-semibold text-purple-800">Multi-CSV Analysis</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">
                      {results.multiCsvData.metadata.filesProcessed}
                    </div>
                    <div className="text-purple-700">Files Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">
                      {results.multiCsvData.metadata.totalOriginalItems}
                    </div>
                    <div className="text-blue-700">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">
                      {results.multiCsvData.metadata.totalUniqueItems}
                    </div>
                    <div className="text-green-700">Unique Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">
                      {results.multiCsvData.analytics?.supplierAnalysis?.totalSuppliers || 0}
                    </div>
                    <div className="text-orange-700">Suppliers</div>
                  </div>
                </div>
                
                {results.multiCsvData.files.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-xs text-purple-600 text-center">
                      Files: {results.multiCsvData.files.map(f => f.filename).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.totalItems}</div>
                <div className="text-sm text-blue-700">Total Items</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.itemsWithSuppliers}</div>
                <div className="text-sm text-green-700">Items with Suppliers</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 flex items-center gap-1">
                  ⭐ {summary.preferenceMatches}
                </div>
                <div className="text-sm text-yellow-700">Preference Matches</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">${summary.totalCost.toFixed(2)}</div>
                <div className="text-sm text-purple-700">Estimated Total</div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="text-blue-400 mr-3">INFO</div>
              <div>
                <p className="text-blue-700 font-medium">Editing Instructions:</p>
                <ul className="text-blue-600 text-sm mt-1 space-y-1">
                  <li>• Select matched items from the database to get automatic supplier and pricing</li>
                  <li>• Type in the matched item field to instantly search and filter 500+ items</li>
                  <li>• Use checkboxes to select multiple rows and bulk match them to the same item</li>
                  <li>• Click the header checkbox to select/deselect all rows at once</li>
                  <li>• Use arrow keys, Enter, and Escape for keyboard navigation</li>
                  <li>• Items marked with ⭐ <span className="font-semibold text-purple-700">Preference</span> are automatically matched based on your past manual selections</li>
                  <li>• Supplier dropdown shows all available suppliers with their prices</li>
                  <li>• Numbers in blue badges indicate how many suppliers are available for that item</li>
                  <li>• When you export, the system remembers your manual matches for future uploads</li>
                  <li>• Click on quantities and prices to edit values</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bulk Edit Controls */}
          {showBulkEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-blue-800 font-semibold">
                    {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={handleClearSelection}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Clear selection
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-blue-700 font-medium">Bulk match selected rows to:</span>
                <div className="flex-1 max-w-md">
                  <Autocomplete
                    value={bulkMatchItem}
                    onChange={(_, newValue) => {
                      setBulkMatchItem(newValue)
                      if (newValue) {
                        handleBulkMatch(newValue)
                      }
                    }}
                    options={selectOptions}
                    getOptionLabel={(option) => option ? option.item.description : ''}
                    filterOptions={(options, { inputValue }) => {
                      if (!inputValue || !fuseInstance) {
                        return options
                      }
                      const results = fuseInstance.search(inputValue)
                      return results.map(result => result.item)
                    }}
                    renderOption={(props, option) => (
                      <li {...props} key={option.value}>
                        <div className="font-medium text-gray-900">{option.item.description}</div>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search and select an item to match all selected rows..."
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            minHeight: '40px',
                            fontSize: '14px',
                          },
                        }}
                      />
                    )}
                    sx={{
                      width: '100%',
                      '& .MuiAutocomplete-listbox': {
                        maxHeight: '240px',
                        fontSize: '14px',
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Picklist Table */}
          <div className="overflow-x-auto overflow-y-visible mb-8">
            <table className="w-full border-collapse bg-white table-fixed min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-2 text-center font-semibold text-gray-700 w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === currentPicklist.length && currentPicklist.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="border border-gray-200 p-2 text-center font-semibold text-gray-700 w-12">#</th>
                  <th className="border border-gray-200 p-2 text-center font-semibold text-gray-700 w-16">Qty</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700 w-60">Original Item</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700 w-80">Matched Item</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700 w-32">Supplier</th>
                  <th className="border border-gray-200 p-3 text-center font-semibold text-gray-700 w-20">Unit Price</th>
                  <th className="border border-gray-200 p-3 text-center font-semibold text-gray-700 w-20">Total</th>
                </tr>
              </thead>
              <tbody>
                {currentPicklist.map((item, index) => (
                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${
                    selectedRows.has(index) ? 'bg-blue-50 border-blue-200' : ''
                  }`}>
                    <td className="border border-gray-200 p-2 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={(e) => handleRowSelection(index, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-200 p-2 text-center text-gray-600 w-12">
                      {index + 1}
                    </td>
                    <td className="border border-gray-200 w-16">
                      {renderEditableCell(item, index, 'quantity', item.quantity)}
                    </td>
                    <td className="border border-gray-200 w-60">
                      {renderEditableCell(item, index, 'originalItem', item.originalItem)}
                    </td>
                    <td className="border border-gray-200">
                      <div className="space-y-1">
                        <div className="min-w-0">
                          {renderEditableCell(item, index, 'matchedItem', item.matchedDescription)}
                        </div>
                        {item.isPreference && (
                          <div className="flex justify-start">
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap"
                              title={`Matched by preference (used ${item.frequency || 1} time${(item.frequency || 1) === 1 ? '' : 's'} before)`}
                            >
                              ⭐ Preference
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-200 w-32">
                      {renderEditableCell(item, index, 'selectedSupplier', item.selectedSupplier)}
                    </td>
                    <td className="border border-gray-200 w-20 text-center">
                      {renderEditableCell(item, index, 'unitPrice', item.unitPrice)}
                    </td>
                    <td className="border border-gray-200 w-20 text-center">
                      {renderEditableCell(item, index, 'totalPrice', item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export Results Section */}
          {exportResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl">[SUCCESS]</div>
                <h3 className="text-xl font-bold text-green-800">Export Successful!</h3>
              </div>
              <p className="text-green-700 mb-4">Your picklist has been generated and is ready for download.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportResult.csvUrl && (
                  <a
                    href={exportResult.csvUrl}
                    className="flex items-center justify-center gap-3 bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    download
                  >
                    Download CSV
                  </a>
                )}
                {exportResult.pdfUrl && (
                  <a
                    href={exportResult.pdfUrl}
                    className="flex items-center justify-center gap-3 bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors font-semibold"
                    download
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-8 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              Back to Upload
            </button>
            <button
              onClick={handleShoppingList}
              className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              🛒 Shopping List
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`w-full sm:w-auto px-8 py-3 rounded-lg font-semibold transition-all ${
                isExporting 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'gradient-bg text-white hover:opacity-90'
              }`}
            >
              {isExporting ? (
                <span className="flex items-center gap-2">
                  <span className="spinner"></span>
                  Exporting...
                </span>
              ) : (
                'Export Picklist'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PicklistPreview