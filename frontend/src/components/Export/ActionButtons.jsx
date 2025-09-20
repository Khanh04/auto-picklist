import React from 'react'

function ActionButtons({ onBack, onShoppingList, onExport, isExporting }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <button
        onClick={onBack}
        className="w-full sm:w-auto px-8 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
      >
        Back to Upload
      </button>
      <button
        onClick={onShoppingList}
        className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
      >
        🛒 Shopping List
      </button>
      <button
        onClick={onExport}
        disabled={isExporting}
        className={`w-full sm:w-auto px-8 py-3 rounded-lg font-semibold transition-all ${
          isExporting
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'gradient-bg text-white hover:opacity-90'
        }`}
      >
        {isExporting ? (
          <span className="flex items-center gap-2">
            <span className="spinner"></span>
            Exporting...
          </span>
        ) : (
          'Export Picklist'
        )}
      </button>
    </div>
  )
}

export default ActionButtons