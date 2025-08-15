import React, { useState, useEffect } from 'react'
import Select from 'react-select'

function PicklistPreview({ results, onExport, onBack }) {
  const [picklist, setPicklist] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [availableItems, setAvailableItems] = useState([])
  const [selectOptions, setSelectOptions] = useState([]) // Options for react-select
  const [exportResult, setExportResult] = useState(null) // Store export results
  const [isExporting, setIsExporting] = useState(false) // Track export status
  const [preferencesApplied, setPreferencesApplied] = useState(false) // Track if preferences have been applied

  useEffect(() => {
    // Reset preferences applied flag for new results
    setPreferencesApplied(false)
    
    // Convert results to editable picklist format
    if (results && results.picklist) {
      // Add matchedItem field to track database item selection
      const enrichedPicklist = results.picklist.map(item => ({
        ...item,
        originalItem: item.item, // Keep original item name
        matchedItemId: null, // Will be set when we find the matching database item
        manualOverride: false // Track if user manually selected an item
      }))
      setPicklist(enrichedPicklist)
      
      // Extract unique suppliers for dropdown
      const suppliers = [...new Set(results.picklist
        .filter(item => item.selectedSupplier !== 'No supplier found')
        .map(item => item.selectedSupplier)
      )].sort()
      setAvailableSuppliers(['No supplier found', ...suppliers])
    }
    
    // Fetch available suppliers and items from database
    fetchDatabaseData()
  }, [results])

  // Apply preferences when both picklist and available items are ready
  useEffect(() => {
    if (picklist.length > 0 && availableItems.length > 0 && !preferencesApplied) {
      // Apply preferences to picklist
      applyPreferencesToPicklist(availableItems)
      setPreferencesApplied(true)
    }
  }, [picklist.length, availableItems.length, preferencesApplied]) // Only run when both are populated and not yet applied

  const applyPreferencesToPicklist = async (availableItemsData) => {
    try {
      const picklistWithMatches = await Promise.all(picklist.map(async item => {
        // Skip items that have already been manually overridden
        if (item.manualOverride) {
          return item
        }
        
        try {
          // Check for user preference first
          const prefResponse = await fetch(`/api/get-preference/${encodeURIComponent(item.originalItem)}`)
          if (prefResponse.ok) {
            const prefResult = await prefResponse.json()
            if (prefResult.success && prefResult.preference) {
              console.log(`Applied learned preference for "${item.originalItem}" -> "${prefResult.preference.description}"`)
              return {
                ...item,
                matchedItemId: prefResult.preference.productId,
                selectedSupplier: prefResult.preference.supplier,
                unitPrice: prefResult.preference.price,
                totalPrice: (prefResult.preference.price * item.quantity).toFixed(2),
                manualOverride: false, // This is from learned preference, not manual
                learnedMatch: true // Flag to indicate this came from learning
              }
            }
          }
        } catch (error) {
          console.warn('Failed to get preference for', item.originalItem, error)
        }
        
        // Fall back to automatic matching based on supplier/price
        const matchedDbItem = availableItemsData.find(dbItem => 
          dbItem.bestSupplier === item.selectedSupplier &&
          Math.abs(parseFloat(dbItem.bestPrice) - parseFloat(item.unitPrice)) < 0.01
        )
        
        return {
          ...item,
          matchedItemId: matchedDbItem ? matchedDbItem.id : null,
          learnedMatch: false
        }
      }))
      
      setPicklist(picklistWithMatches)
    } catch (error) {
      console.error('Error applying preferences:', error)
    }
  }

  const fetchDatabaseData = async () => {
    try {
      // Fetch suppliers
      const suppliersResponse = await fetch('/api/suppliers')
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json()
        const supplierNames = suppliersData.suppliers.map(s => s.name)
        setAvailableSuppliers(prev => [...new Set([...prev, ...supplierNames])].sort())
      }

      // Fetch available items for matching
      const itemsResponse = await fetch('/api/items')
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json()
        setAvailableItems(itemsData.items || [])
        
        // Prepare options for react-select
        const options = itemsData.items.map(item => ({
          value: item.id,
          label: `${item.description} (${item.bestSupplier} - $${item.bestPrice})`,
          item: item // Store full item data for easy access
        }))
        setSelectOptions(options)
        
        // Store items for later preference application
        // Preferences will be applied in a separate useEffect when picklist is ready
      }
    } catch (error) {
      console.error('Error fetching database data:', error)
    }
  }

  const handleSelectChange = (selectedOption, index) => {
    const newPicklist = [...picklist]
    newPicklist[index] = { ...newPicklist[index] }
    
    if (!selectedOption) {
      // Cleared selection
      newPicklist[index].matchedItemId = null
      newPicklist[index].manualOverride = false
      newPicklist[index].selectedSupplier = 'No supplier found'
      newPicklist[index].unitPrice = ''
      newPicklist[index].totalPrice = 'N/A'
    } else {
      // Selected an item
      const selectedItem = selectedOption.item
      newPicklist[index].matchedItemId = selectedItem.id
      newPicklist[index].manualOverride = true
      newPicklist[index].selectedSupplier = selectedItem.bestSupplier
      newPicklist[index].unitPrice = selectedItem.bestPrice
      newPicklist[index].totalPrice = (selectedItem.bestPrice * newPicklist[index].quantity).toFixed(2)
    }
    
    setPicklist(newPicklist)
  }

  const handleCellEdit = (index, field, value) => {
    const newPicklist = [...picklist]
    newPicklist[index] = { ...newPicklist[index] }
    
    if (field === 'selectedSupplier') {
      newPicklist[index].selectedSupplier = value
      // If user changes supplier manually, don't reset price if it's from matched item
      if (!newPicklist[index].manualOverride) {
        newPicklist[index].unitPrice = ''
        newPicklist[index].totalPrice = 'N/A'
      }
    } else if (field === 'unitPrice') {
      const price = parseFloat(value)
      newPicklist[index].unitPrice = isNaN(price) ? value : price
      if (!isNaN(price)) {
        newPicklist[index].totalPrice = (price * newPicklist[index].quantity).toFixed(2)
      } else {
        newPicklist[index].totalPrice = 'N/A'
      }
    } else if (field === 'quantity') {
      const qty = parseInt(value)
      newPicklist[index].quantity = isNaN(qty) ? value : qty
      if (!isNaN(qty) && typeof newPicklist[index].unitPrice === 'number') {
        newPicklist[index].totalPrice = (newPicklist[index].unitPrice * qty).toFixed(2)
      }
    }
    
    setPicklist(newPicklist)
  }

  const calculateSummary = () => {
    const itemsWithSuppliers = picklist.filter(item => 
      item.selectedSupplier !== 'No supplier found'
    ).length
    
    const totalCost = picklist.reduce((sum, item) => {
      const price = parseFloat(item.totalPrice)
      return isNaN(price) ? sum : sum + price
    }, 0)
    
    return {
      totalItems: picklist.length,
      itemsWithSuppliers,
      totalCost
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportResult(null)
    
    try {
      const summary = calculateSummary()
      
      // Capture manual overrides for machine learning
      const preferences = picklist
        .filter(item => item.manualOverride && item.matchedItemId)
        .map(item => ({
          originalItem: item.originalItem,
          matchedProductId: item.matchedItemId
        }))
      
      // Store preferences if any manual overrides were made
      if (preferences.length > 0) {
        try {
          const response = await fetch('/api/store-preferences', {
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
          // Don't block export if preference storage fails
        }
      } else {
        // No manual overrides to store
      }
      
      // Prepare export data with final item name (use matched item description if available, otherwise original)
      const exportPicklist = picklist.map(item => {
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

      if (result.success) {
        setExportResult(result)
        
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
      return (
        <select
          value={value}
          onChange={(e) => handleCellEdit(index, field, e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {availableSuppliers.map(supplier => (
            <option key={supplier} value={supplier}>
              {supplier}
            </option>
          ))}
        </select>
      )
    }

    if (field === 'matchedItem') {
      const selectedOption = selectOptions.find(option => option.value === item.matchedItemId)
      
      return (
        <div className="space-y-1">
          {/* Show learned match indicator */}
          {item.learnedMatch && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <span>[AI]</span>
              <span>Learned preference applied</span>
            </div>
          )}
          
          <Select
            value={selectedOption || null}
            onChange={(selectedOption) => handleSelectChange(selectedOption, index)}
            options={selectOptions}
            isSearchable={true}
            isClearable={true}
            placeholder="Type to search items..."
            noOptionsMessage={({ inputValue }) => 
              inputValue ? `No items found matching "${inputValue}"` : 'Start typing to search...'
            }
            className="text-sm"
            classNamePrefix="react-select"
            styles={{
              control: (provided, state) => ({
                ...provided,
                minHeight: '40px',
                border: `1px solid ${item.learnedMatch ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '6px',
                '&:hover': {
                  borderColor: item.learnedMatch ? '#2563eb' : '#9ca3af'
                },
                boxShadow: state.isFocused ? `0 0 0 2px ${item.learnedMatch ? '#3b82f6' : '#3b82f6'}` : 'none',
                borderColor: state.isFocused ? '#3b82f6' : (item.learnedMatch ? '#3b82f6' : '#d1d5db')
              }),
              option: (provided, state) => ({
                ...provided,
                fontSize: '14px',
                backgroundColor: state.isSelected ? '#dbeafe' : state.isFocused ? '#f3f4f6' : 'white',
                color: state.isSelected ? '#1e40af' : '#374151',
                '&:hover': {
                  backgroundColor: '#f3f4f6'
                }
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 50,
                maxHeight: '300px'
              }),
              menuList: (provided) => ({
                ...provided,
                maxHeight: '240px'
              })
            }}
            formatOptionLabel={(option) => (
              <div>
                <div className="font-medium text-gray-900">{option.item.description}</div>
                <div className="text-xs text-gray-600">${option.item.bestPrice} - {option.item.bestSupplier}</div>
              </div>
            )}
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

  if (!picklist.length) {
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
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Picklist Preview</h2>
            <p className="text-gray-600 text-lg">Review and edit your picklist before exporting</p>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.totalItems}</div>
                <div className="text-sm text-blue-700">Total Items</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.itemsWithSuppliers}</div>
                <div className="text-sm text-green-700">Items with Suppliers</div>
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
                  <li>• Use arrow keys, Enter, and Escape for keyboard navigation</li>
                  <li>• Items with blue borders show learned preferences from your past selections</li>
                  <li>• When you export, the system remembers your manual matches for future uploads</li>
                  <li>• Manually select different suppliers if needed</li>
                  <li>• Click on quantities and prices to edit values</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Picklist Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">#</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Qty</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Original Item</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Matched Item</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Supplier</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Unit Price</th>
                  <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {picklist.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="border border-gray-200 p-2 text-center text-gray-600">
                      {index + 1}
                    </td>
                    <td className="border border-gray-200">
                      {renderEditableCell(item, index, 'quantity', item.quantity)}
                    </td>
                    <td className="border border-gray-200 max-w-md">
                      {renderEditableCell(item, index, 'originalItem', item.originalItem)}
                    </td>
                    <td className="border border-gray-200 max-w-md">
                      {renderEditableCell(item, index, 'matchedItem', item.matchedItem)}
                    </td>
                    <td className="border border-gray-200">
                      {renderEditableCell(item, index, 'selectedSupplier', item.selectedSupplier)}
                    </td>
                    <td className="border border-gray-200">
                      {renderEditableCell(item, index, 'unitPrice', item.unitPrice)}
                    </td>
                    <td className="border border-gray-200">
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
                {exportResult.csvPath && (
                  <a
                    href={`/download/csv/${exportResult.csvPath.split('/').pop()}`}
                    className="flex items-center justify-center gap-3 bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    download
                  >
                    Download CSV
                  </a>
                )}
                {exportResult.pdfPath && (
                  <a
                    href={`/download/pdf/${exportResult.pdfPath.split('/').pop()}`}
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