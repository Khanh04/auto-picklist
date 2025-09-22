import React, { useState, useEffect } from 'react'

function BulkSupplierSelector({ selectedRows, currentPicklist, onSupplierChange, getCommonSuppliers }) {
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)

  // Load available suppliers when component mounts or selection changes
  useEffect(() => {
    const loadSuppliers = async () => {
      if (selectedRows.size === 0) {
        setAvailableSuppliers([])
        return
      }

      setLoading(true)
      try {
        const suppliers = await getCommonSuppliers()
        setAvailableSuppliers(suppliers)
      } catch (error) {
        console.error('Error loading suppliers for bulk edit:', error)
        setAvailableSuppliers([])
      } finally {
        setLoading(false)
      }
    }

    loadSuppliers()
  }, [selectedRows, getCommonSuppliers])

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier)
    onSupplierChange(supplier)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-blue-700 font-medium">Loading suppliers...</span>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (availableSuppliers.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-600 mb-2">
          No common suppliers found for selected items
        </div>
        <div className="text-sm text-gray-500">
          Select items with matching suppliers to bulk change suppliers
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-blue-700 font-medium">Change supplier for selected rows:</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
        {availableSuppliers.map((supplier, index) => (
          <button
            key={index}
            onClick={() => handleSupplierSelect(supplier)}
            className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="font-medium text-gray-900">{supplier.name}</div>
            <div className="text-sm text-green-600 font-semibold">${supplier.price}</div>
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        {availableSuppliers.length} supplier{availableSuppliers.length !== 1 ? 's' : ''} available for all selected items
      </div>
    </div>
  )
}

export default BulkSupplierSelector