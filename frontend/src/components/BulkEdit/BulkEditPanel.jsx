import BulkItemSelector from './BulkItemSelector'
import BulkSupplierSelector from './BulkSupplierSelector'
import SelectionPreview from './SelectionPreview'

function BulkEditPanel({
  selectedRows,
  bulkEditMode,
  setBulkEditMode,
  bulkMatchItem,
  setBulkMatchItem,
  selectOptions,
  fuseInstance,
  currentPicklist,
  onClearSelection,
  onRemoveFromSelection,
  onBulkMatch,
  onBulkSupplierChange,
  getCommonSuppliersForSelection
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-blue-800 font-semibold">
            {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            Clear selection
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            <kbd className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-xs font-mono">Shift</kbd> for range •
            <kbd className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-xs font-mono ml-1">Ctrl</kbd> to add
          </span>
        </div>
      </div>

      {/* Selection Preview */}
      <SelectionPreview
        selectedRows={selectedRows}
        currentPicklist={currentPicklist}
        onRemoveItem={(index) => onRemoveFromSelection && onRemoveFromSelection(index, false)}
      />

      {/* Mode Selection Tabs */}
      <div className="flex mb-4 border-b border-blue-200">
        <button
          onClick={() => setBulkEditMode('item')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            bulkEditMode === 'item'
              ? 'border-blue-600 text-blue-700 bg-blue-100'
              : 'border-transparent text-blue-600 hover:text-blue-800 hover:bg-blue-50'
          }`}
        >
          Change Items
        </button>
        <button
          onClick={() => setBulkEditMode('supplier')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            bulkEditMode === 'supplier'
              ? 'border-blue-600 text-blue-700 bg-blue-100'
              : 'border-transparent text-blue-600 hover:text-blue-800 hover:bg-blue-50'
          }`}
        >
          Change Suppliers
        </button>
      </div>

      {/* Item Selection Mode */}
      {bulkEditMode === 'item' && (
        <BulkItemSelector
          bulkMatchItem={bulkMatchItem}
          setBulkMatchItem={setBulkMatchItem}
          selectOptions={selectOptions}
          fuseInstance={fuseInstance}
          onBulkMatch={onBulkMatch}
          selectedRows={selectedRows}
        />
      )}

      {/* Supplier Selection Mode */}
      {bulkEditMode === 'supplier' && (
        <BulkSupplierSelector
          selectedRows={selectedRows}
          currentPicklist={currentPicklist}
          onSupplierChange={onBulkSupplierChange}
          getCommonSuppliers={getCommonSuppliersForSelection}
        />
      )}
    </div>
  )
}

export default BulkEditPanel