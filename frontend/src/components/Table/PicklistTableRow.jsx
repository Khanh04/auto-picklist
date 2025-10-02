import EditableCell from './EditableCell'

function PicklistTableRow({
  item,
  index,
  selectedRows,
  editingCell,
  selectOptions,
  fuseInstance,
  availableSuppliers,
  productSuppliers,
  onRowSelection,
  onCellEdit,
  onSelectChange,
  onCellClick,
  onCellBlur
}) {
  const isSelected = selectedRows.has(index)

  const handleRowClick = (e) => {
    // Don't trigger selection if clicking on editable cells or interactive elements
    const isEditableElement = e.target.tagName === 'INPUT' ||
                              e.target.tagName === 'SELECT' ||
                              e.target.tagName === 'TEXTAREA' ||
                              e.target.tagName === 'BUTTON' ||
                              e.target.closest('[contenteditable]') ||
                              e.target.closest('.MuiAutocomplete-root')

    if (!isEditableElement) {
      // Toggle selection: if already selected, deselect; if not, select
      const shouldSelect = !isSelected
      const isCtrlOrCmd = e.ctrlKey || e.metaKey
      onRowSelection(index, shouldSelect, e.shiftKey, isCtrlOrCmd)
    }
  }

  return (
    <tr
      onClick={handleRowClick}
      className={`transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-blue-100 border-l-4 border-l-blue-600 border-blue-200'
          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
      }`}
    >
      <td className="border border-gray-200 p-2 text-center w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            const isCtrlOrCmd = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey
            onRowSelection(index, e.target.checked, e.nativeEvent.shiftKey, isCtrlOrCmd)
          }}
          className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
          aria-label={`Select row ${index + 1}. Shift for range, Ctrl/Cmd to add.`}
        />
      </td>
      <td className="border border-gray-200 p-2 text-center text-gray-600 w-12">
        <div className="flex items-center justify-center gap-1">
          {isSelected && (
            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {index + 1}
        </div>
      </td>
      <td className="border border-gray-200 w-16">
        <EditableCell
          item={item}
          index={index}
          field="quantity"
          value={item.quantity}
          editingCell={editingCell}
          onCellEdit={onCellEdit}
          onCellClick={onCellClick}
          onCellBlur={onCellBlur}
        />
      </td>
      <td className="border border-gray-200 w-60">
        <EditableCell
          item={item}
          index={index}
          field="originalItem"
          value={item.originalItem}
          editingCell={editingCell}
        />
      </td>
      <td className="border border-gray-200">
        <div className="space-y-1">
          <div className="min-w-0">
            <EditableCell
              item={item}
              index={index}
              field="matchedItem"
              value={item.matchedDescription}
              editingCell={editingCell}
              selectOptions={selectOptions}
              fuseInstance={fuseInstance}
              onSelectChange={onSelectChange}
            />
          </div>
          <div className="flex flex-wrap gap-1 justify-start">
            {item.isPreference && (
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap"
                title={`Product matched by preference (used ${item.frequency || 1} time${(item.frequency || 1) === 1 ? '' : 's'} before)`}
              >
                🎯 Product Preference
              </span>
            )}
            {item.supplierDecision?.isUserPreferred && (
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap"
                title={`Supplier selected by user preference: ${item.supplierDecision.selectionReason} (confidence: ${item.supplierDecision.confidence})`}
              >
                ⭐ Supplier Choice
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="border border-gray-200 w-32">
        <EditableCell
          item={item}
          index={index}
          field="selectedSupplier"
          value={item.selectedSupplier}
          editingCell={editingCell}
          availableSuppliers={availableSuppliers}
          productSuppliers={productSuppliers}
          onCellEdit={onCellEdit}
        />
      </td>
      <td className="border border-gray-200 w-20 text-center">
        <EditableCell
          item={item}
          index={index}
          field="unitPrice"
          value={item.unitPrice}
          editingCell={editingCell}
          onCellEdit={onCellEdit}
          onCellClick={onCellClick}
          onCellBlur={onCellBlur}
        />
      </td>
      <td className="border border-gray-200 w-20 text-center">
        <EditableCell
          item={item}
          index={index}
          field="totalPrice"
          value={item.totalPrice}
          editingCell={editingCell}
        />
      </td>
    </tr>
  )
}

export default PicklistTableRow