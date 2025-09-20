import React from 'react'
import { Autocomplete, TextField } from '@mui/material'

function BulkItemSelector({
  bulkMatchItem,
  setBulkMatchItem,
  selectOptions,
  fuseInstance,
  onBulkMatch
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-blue-700 font-medium">Bulk match selected rows to:</span>
      <div className="flex-1 max-w-md">
        <Autocomplete
          value={bulkMatchItem}
          onChange={(_, newValue) => {
            setBulkMatchItem(newValue)
            if (newValue) {
              onBulkMatch(newValue)
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
  )
}

export default BulkItemSelector