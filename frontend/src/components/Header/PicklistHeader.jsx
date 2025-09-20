import React from 'react'

function PicklistHeader({ results, summary }) {
  return (
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        {results?.multiCsvData ? 'Combined Picklist Preview' : 'Picklist Preview'}
      </h2>
      <p className="text-gray-600 text-lg">Review and edit your picklist before exporting</p>

      {/* Multi-CSV Analytics */}
      {results?.multiCsvData && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mt-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📊</span>
            <h3 className="text-lg font-semibold text-purple-800">Multi-CSV Analysis</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">
                {results?.multiCsvData?.metadata?.filesProcessed}
              </div>
              <div className="text-purple-700">Files Processed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {results?.multiCsvData?.metadata?.totalOriginalItems}
              </div>
              <div className="text-blue-700">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">
                {results?.multiCsvData?.metadata?.totalUniqueItems}
              </div>
              <div className="text-green-700">Unique Items</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">
                {results?.multiCsvData?.analytics?.supplierAnalysis?.totalSuppliers || 0}
              </div>
              <div className="text-orange-700">Suppliers</div>
            </div>
          </div>

          {results?.multiCsvData?.files?.length > 1 && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-xs text-purple-600 text-center">
                Files: {results?.multiCsvData?.files?.map(f => f.filename).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{summary.totalItems}</div>
          <div className="text-sm text-blue-700">Total Items</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{summary.itemsWithSuppliers}</div>
          <div className="text-sm text-green-700">Items with Suppliers</div>
        </div>
        {(summary.productPreferences > 0 || summary.supplierPreferences > 0) ? (
          <>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                🎯 {summary.productPreferences || 0}
              </div>
              <div className="text-sm text-blue-700">Product Matches</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                ⭐ {summary.supplierPreferences || 0}
              </div>
              <div className="text-sm text-purple-700">Supplier Choices</div>
            </div>
          </>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 flex items-center gap-1">
              ⭐ {summary.preferenceMatches}
            </div>
            <div className="text-sm text-yellow-700">Preference Matches</div>
          </div>
        )}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">${summary.totalCost.toFixed(2)}</div>
          <div className="text-sm text-indigo-700">Estimated Total</div>
        </div>
      </div>
    </div>
  )
}

export default PicklistHeader