import React from 'react'
import { Autocomplete, TextField } from '@mui/material'

function EditableCell({
  item,
  index,
  field,
  value,
  editingCell,
  selectOptions,
  fuseInstance,
  availableSuppliers,
  productSuppliers,
  onCellEdit,
  onSelectChange,
  onCellClick,
  onCellBlur
}) {
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
          onChange={(e) => onCellEdit(index, field, e.target.value)}
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
    const isBottomRows = index >= (selectOptions.length - 3)

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
          onChange={(_, newValue) => onSelectChange(newValue, index)}
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
          onChange={(e) => onCellEdit(index, field, e.target.value)}
          onBlur={onCellBlur}
          autoFocus
          step={field === 'unitPrice' ? '0.01' : '1'}
          min="0"
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )
    }
    return (
      <div
        onClick={() => onCellClick(index, field)}
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

export default EditableCell