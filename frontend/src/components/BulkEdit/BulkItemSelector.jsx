import { useState } from 'react'
import { Autocomplete, TextField } from '@mui/material'

function BulkItemSelector({
  bulkMatchItem,
  setBulkMatchItem,
  selectOptions,
  fuseInstance,
  onBulkMatch,
  selectedRows
}) {
  const [pendingItem, setPendingItem] = useState(null)

  const handleApply = () => {
    if (pendingItem) {
      onBulkMatch(pendingItem)
      setPendingItem(null)
      setBulkMatchItem(null)
    }
  }

  const handleCancel = () => {
    setPendingItem(null)
    setBulkMatchItem(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="text-blue-700 font-medium">Bulk match selected rows to:</span>
        <div className="flex-1 max-w-md">
          <Autocomplete
            value={bulkMatchItem}
            onChange={(_, newValue) => {
              setBulkMatchItem(newValue)
              setPendingItem(newValue)
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

      {/* Confirmation Preview */}
      {pendingItem && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">
                Confirm Bulk Item Change
              </h4>
              <p className="text-sm text-amber-800 mb-3">
                This will change <strong>{selectedRows?.size || 0} selected rows</strong> to:
              </p>
              <div className="bg-white border border-amber-200 rounded-md p-2 mb-3">
                <div className="font-medium text-gray-900">{pendingItem.item.description}</div>
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

export default BulkItemSelector