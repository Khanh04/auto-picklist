import React from 'react'
import { Autocomplete, TextField } from '@mui/material'

// Reusable styling constants
const STYLES = {
  autocomplete: {
    base: {
      width: '100%',
      '& .MuiAutocomplete-listbox': {
        maxHeight: '200px',
        fontSize: '14px',
      },
    },
    product: {
      width: '100%',
      '& .MuiAutocomplete-listbox': {
        maxHeight: '240px',
        fontSize: '14px',
      },
    }
  },
  textField: {
    base: {
      '& .MuiOutlinedInput-root': {
        minHeight: '40px',
        fontSize: '14px',
        '& fieldset': {
          borderColor: '#d1d5db',
        },
        '&:hover fieldset': {
          borderColor: '#9ca3af',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#3b82f6',
          borderWidth: '2px',
        },
      },
    },
    highlighted: (isHighlighted) => ({
      '& .MuiOutlinedInput-root': {
        minHeight: '40px',
        fontSize: '14px',
        '& fieldset': {
          borderColor: isHighlighted ? '#3b82f6' : '#d1d5db',
        },
        '&:hover fieldset': {
          borderColor: isHighlighted ? '#2563eb' : '#9ca3af',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#3b82f6',
          borderWidth: '2px',
        },
      },
    })
  }
}

// Helper functions for creating supplier options
const createSupplierOptions = (productSpecificSuppliers, availableSuppliers, currentValue) => {
  const supplierOptions = []

  if (productSpecificSuppliers && productSpecificSuppliers.length > 0) {
    // Add "back order" option first
    supplierOptions.push({
      value: "back order",
      label: "back order",
      price: null,
      isBackOrder: true
    })

    // Add product-specific suppliers with prices
    const mappedSuppliers = productSpecificSuppliers.map((supplier) => ({
      value: supplier.name,
      label: supplier.name,
      price: supplier.price,
      supplierName: supplier.name,
      supplierId: supplier.id,
      isBackOrder: false
    }))
    supplierOptions.push(...mappedSuppliers)
  } else {
    // Fallback to general supplier list
    if (!availableSuppliers.includes(currentValue) && currentValue !== 'back order') {
      supplierOptions.push({
        value: currentValue,
        label: currentValue,
        price: null,
        isBackOrder: false
      })
    }

    supplierOptions.push(...availableSuppliers.map(supplier => ({
      value: supplier,
      label: supplier,
      price: null,
      isBackOrder: supplier === 'back order'
    })))
  }

  return supplierOptions
}

// Supplier selection component
const SupplierSelection = ({
  item,
  index,
  value,
  productSuppliers,
  availableSuppliers,
  onCellEdit
}) => {
  const matchedItemId = item.matchedItemId
  const productSpecificSuppliers = matchedItemId ? productSuppliers[matchedItemId] : null
  const hasMultipleSuppliers = productSpecificSuppliers && productSpecificSuppliers.length > 1

  const supplierOptions = createSupplierOptions(
    productSpecificSuppliers,
    availableSuppliers,
    value
  )

  const selectedOption = supplierOptions.find(option => option.value === value) || null

  return (
    <div className="relative">
      <Autocomplete
        value={selectedOption}
        onChange={(_, newValue) => {
          const newSupplierValue = newValue ? newValue.value : 'back order'
          const newPrice = newValue && newValue.price ? newValue.price : null

          // Update both supplier and unit price
          onCellEdit(index, 'selectedSupplier', newSupplierValue)
          if (newPrice !== null) {
            onCellEdit(index, 'unitPrice', newPrice)
          }
        }}
        options={supplierOptions}
        getOptionLabel={(option) => option ? option.label : ''}
        renderOption={(props, option) => (
          <li {...props} key={option.value}>
            <div className="flex justify-between items-center w-full">
              <span className={`font-medium ${option.isBackOrder ? 'text-gray-500' : 'text-gray-900'}`}>
                {option.supplierName || option.value}
              </span>
              {option.price && !option.isBackOrder && (
                <span className="text-sm text-gray-600 ml-2 font-mono">
                  ${parseFloat(option.price).toFixed(2)}
                </span>
              )}
            </div>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Select supplier..."
            size="small"
            sx={STYLES.textField.highlighted(hasMultipleSuppliers)}
          />
        )}
        disableClearable
        disablePortal={false}
        sx={STYLES.autocomplete.base}
      />
      {hasMultipleSuppliers && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {productSpecificSuppliers.length}
          </span>
        </div>
      )}
    </div>
  )
}

// Product matching component
const ProductMatchingSelection = ({
  item,
  index,
  selectOptions,
  fuseInstance,
  onSelectChange
}) => {
  const selectedOption = selectOptions.find(option => option.value === item.matchedItemId)
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
            sx={STYLES.textField.highlighted(item.learnedMatch)}
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
        sx={STYLES.autocomplete.product}
      />
    </div>
  )
}

// Number input component
const NumberInput = ({
  field,
  value,
  index,
  isEditing,
  onCellEdit,
  onCellClick,
  onCellBlur
}) => {
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

// Simple display components
const ReadOnlyDisplay = ({ value }) => (
  <div className="p-2 min-h-[2.5rem] flex items-center">
    {value}
  </div>
)

const PriceDisplay = ({ field, value }) => (
  <div className="p-2">
    {field === 'totalPrice' && value !== 'N/A' ? `$${value}` : value}
  </div>
)

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
    return (
      <SupplierSelection
        item={item}
        index={index}
        value={value}
        productSuppliers={productSuppliers}
        availableSuppliers={availableSuppliers}
        onCellEdit={onCellEdit}
      />
    )
  }

  if (field === 'matchedItem') {
    return (
      <ProductMatchingSelection
        item={item}
        index={index}
        selectOptions={selectOptions}
        fuseInstance={fuseInstance}
        onSelectChange={onSelectChange}
      />
    )
  }

  if (field === 'originalItem') {
    return <ReadOnlyDisplay value={value} />
  }

  if (field === 'quantity' || field === 'unitPrice') {
    return (
      <NumberInput
        field={field}
        value={value}
        index={index}
        isEditing={isEditing}
        onCellEdit={onCellEdit}
        onCellClick={onCellClick}
        onCellBlur={onCellBlur}
      />
    )
  }

  return <PriceDisplay field={field} value={value} />
}

export default EditableCell