import React from 'react'

function InstructionsPanel() {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
      <div className="flex">
        <div className="text-blue-400 mr-3">INFO</div>
        <div>
          <p className="text-blue-700 font-medium">Editing Instructions:</p>
          <ul className="text-blue-600 text-sm mt-1 space-y-1">
            <li>• Select matched items from the database to get automatic supplier and pricing</li>
            <li>• Type in the matched item field to instantly search and filter 500+ items</li>
            <li>• Use checkboxes to select multiple rows and bulk edit them (change items or suppliers)</li>
            <li>• Switch between "Change Items" and "Change Suppliers" tabs in bulk edit mode</li>
            <li>• Click the header checkbox to select/deselect all rows at once</li>
            <li>• Use arrow keys, Enter, and Escape for keyboard navigation</li>
            <li>• Items marked with ⭐ <span className="font-semibold text-purple-700">Preference</span> are automatically matched based on your past manual selections</li>
            <li>• Supplier dropdown shows all available suppliers with their prices</li>
            <li>• Numbers in blue badges indicate how many suppliers are available for that item</li>
            <li>• When you export, the system remembers your manual matches for future uploads</li>
            <li>• Click on quantities and prices to edit values</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default InstructionsPanel