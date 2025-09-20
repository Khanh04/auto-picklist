import React from 'react'
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
  return (
    <tr className={`hover:bg-gray-50 transition-colors ${
      selectedRows.has(index) ? 'bg-blue-50 border-blue-200' : ''
    }`}>
      <td className="border border-gray-200 p-2 text-center w-10">
        <input
          type="checkbox"
          checked={selectedRows.has(index)}
          onChange={(e) => onRowSelection(index, e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </td>
      <td className="border border-gray-200 p-2 text-center text-gray-600 w-12">
        {index + 1}
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
          {item.isPreference && (
            <div className="flex justify-start">
              <span
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap"
                title={`Matched by preference (used ${item.frequency || 1} time${(item.frequency || 1) === 1 ? '' : 's'} before)`}
              >
                ⭐ Preference
              </span>
            </div>
          )}
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