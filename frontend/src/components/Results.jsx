import React from 'react'

function Results({ results, onNewUpload, onBackToPreview }) {
  if (!results) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">[!]</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Results</h2>
          <p className="text-gray-600 mb-6">No picklist results to display.</p>
          <button
            onClick={onNewUpload}
            className="gradient-bg text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">[SUCCESS]</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Picklist Generated Successfully!
              </h2>
              <p className="text-gray-600 text-lg">
                Your optimized picklist has been generated and is ready for download.
              </p>
            </div>

            {/* Summary Statistics */}
            {results.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {results.summary.totalItems || 0}
                  </div>
                  <div className="text-blue-700">Total Items</div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {results.summary.itemsWithSuppliers || 0}
                  </div>
                  <div className="text-green-700">Items with Suppliers</div>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    ${(results.summary.totalCost || 0).toFixed(2)}
                  </div>
                  <div className="text-purple-700">Estimated Total</div>
                </div>
              </div>
            )}

            {/* Download Section */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                Download Your Files
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.csvPath && (
                  <a
                    href={`/download/csv/${results.csvPath.split('/').pop()}`}
                    className="flex items-center justify-center gap-3 bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    download
                  >
                    Download CSV
                  </a>
                )}
                {results.pdfPath && (
                  <a
                    href={`/download/pdf/${results.pdfPath.split('/').pop()}`}
                    className="flex items-center justify-center gap-3 bg-red-500 text-white p-4 rounded-lg hover:bg-red-600 transition-colors font-semibold"
                    download
                  >
                    Download PDF
                  </a>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onBackToPreview}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Back to Preview
              </button>
              <button
                onClick={onNewUpload}
                className="px-8 py-3 gradient-bg text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Process New File
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Results