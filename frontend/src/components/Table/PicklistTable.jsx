import React from 'react'
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
            <th className="border border-gray-200 p-2 text-center font-semibold text-gray-700 w-10">
              <input
                type="checkbox"
                checked={selectedRows.size === currentPicklist.length && currentPicklist.length > 0}
                onChange={onSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
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