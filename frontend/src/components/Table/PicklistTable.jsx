import PicklistTableRow from './PicklistTableRow'

function PicklistTable({
  currentPicklist,
  selectedRows,
  editingCell,
  selectOptions,
  fuseInstance,
  availableSuppliers,
  productSuppliers,
  onSelectAll,
  onRowSelection,
  onCellEdit,
  onSelectChange,
  onCellClick,
  onCellBlur
}) {
  return (
    <div className="overflow-x-auto overflow-y-visible mb-8">
      <table className="w-full border-collapse bg-white table-fixed min-w-[1200px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 p-2 text-center font-semibold text-gray-700 w-10 relative group">
              <input
                type="checkbox"
                checked={selectedRows.size === currentPicklist.length && currentPicklist.length > 0}
                onChange={onSelectAll}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                aria-label="Select all rows for bulk editing"
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 z-20 pointer-events-none w-64">
                <div>
                  <div className="font-semibold mb-2 text-center">Bulk Selection Options ✨</div>
                  <div className="space-y-1.5 text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span><strong>Click</strong> row to toggle</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span><kbd className="px-1 py-0.5 bg-gray-700 rounded text-white">Shift</kbd> + click for range</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span><kbd className="px-1 py-0.5 bg-gray-700 rounded text-white">Ctrl</kbd> + click to add</span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
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

        {/* Selection Summary Bar */}
        {selectedRows.size > 0 && (
          <thead className="sticky top-0 z-10">
            <tr>
              <td colSpan="8" className="bg-blue-600 text-white px-4 py-2 border-b-2 border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">
                      {selectedRows.size} of {currentPicklist.length} rows selected
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onSelectAll}
                      className="text-sm font-medium hover:underline focus:outline-none focus:underline transition-all"
                    >
                      {selectedRows.size === currentPicklist.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-blue-200">|</span>
                    <button
                      onClick={onSelectAll}
                      className="text-sm font-medium hover:underline focus:outline-none focus:underline transition-all"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
        )}

        <tbody>
          {currentPicklist.map((item, index) => (
            <PicklistTableRow
              key={index}
              item={item}
              index={index}
              selectedRows={selectedRows}
              editingCell={editingCell}
              selectOptions={selectOptions}
              fuseInstance={fuseInstance}
              availableSuppliers={availableSuppliers}
              productSuppliers={productSuppliers}
              onRowSelection={onRowSelection}
              onCellEdit={onCellEdit}
              onSelectChange={onSelectChange}
              onCellClick={onCellClick}
              onCellBlur={onCellBlur}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PicklistTable