import { useState, useEffect } from 'react'

function BulkSupplierSelector({ selectedRows, currentPicklist, onSupplierChange, getCommonSuppliers }) {
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [pendingSupplier, setPendingSupplier] = useState(null)

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
    setPendingSupplier(supplier)
  }

  const handleApply = () => {
    if (pendingSupplier) {
      onSupplierChange(pendingSupplier)
      setPendingSupplier(null)
      setSelectedSupplier(null)
    }
  }

  const handleCancel = () => {
    setPendingSupplier(null)
    setSelectedSupplier(null)
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
            className={`text-left p-3 border-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              selectedSupplier?.name === supplier.name
                ? 'bg-blue-50 border-blue-500'
                : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            }`}
          >
            <div className="font-medium text-gray-900">{supplier.name}</div>
            <div className="text-sm text-green-600 font-semibold">${supplier.price}</div>
            {selectedSupplier?.name === supplier.name && (
              <div className="mt-1 flex items-center text-xs text-blue-600">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Selected
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        {availableSuppliers.length} supplier{availableSuppliers.length !== 1 ? 's' : ''} available for all selected items
      </div>

      {/* Confirmation Preview */}
      {pendingSupplier && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">
                Confirm Bulk Supplier Change
              </h4>
              <p className="text-sm text-amber-800 mb-3">
                This will change the supplier for <strong>{selectedRows.size} selected rows</strong> to:
              </p>
              <div className="bg-white border border-amber-200 rounded-md p-3 mb-3">
                <div className="font-medium text-gray-900">{pendingSupplier.name}</div>
                <div className="text-sm text-green-600 font-semibold mt-1">${pendingSupplier.price}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApply}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Apply Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkSupplierSelector