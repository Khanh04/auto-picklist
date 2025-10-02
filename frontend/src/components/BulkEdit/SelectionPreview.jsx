function SelectionPreview({ selectedRows, currentPicklist, onRemoveItem }) {
  if (selectedRows.size === 0) return null

  const selectedItems = Array.from(selectedRows)
    .map(index => ({
      index,
      item: currentPicklist[index]
    }))
    .sort((a, b) => a.index - b.index)

  return (
    <div className="bg-white border-2 border-blue-300 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-900">
          Selected Items ({selectedRows.size})
        </span>
        {selectedRows.size > 8 && (
          <span className="text-xs text-gray-500">
            Scroll to see all
          </span>
        )}
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
        {selectedItems.map(({ index, item }) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm py-1 px-2 hover:bg-blue-50 rounded group transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-blue-600 font-medium flex-shrink-0">
                #{index + 1}
              </span>
              <span className="text-gray-700 truncate" title={item.originalItem}>
                {item.originalItem}
              </span>
            </div>
            <button
              onClick={() => onRemoveItem(index)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-2 flex-shrink-0 p-1 rounded hover:bg-red-50 transition-all"
              aria-label={`Remove item ${index + 1} from selection`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-2 pt-2 border-t border-blue-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Total items: {selectedRows.size}</span>
          <span>
            Total value: ${selectedItems.reduce((sum, { item }) => {
              const price = parseFloat(item.totalPrice) || 0
              return sum + price
            }, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default SelectionPreview
