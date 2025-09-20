import React from 'react'

function ExportResultsPanel({ exportResult }) {
  if (!exportResult) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-2xl">[SUCCESS]</div>
        <h3 className="text-xl font-bold text-green-800">Export Successful!</h3>
      </div>
      <p className="text-green-700 mb-4">Your picklist has been generated and is ready for download.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportResult.csvUrl && (
          <a
            href={exportResult.csvUrl}
            className="flex items-center justify-center gap-3 bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition-colors font-semibold"
            download
          >
            Download CSV
          </a>
        )}
        {exportResult.pdfUrl && (
          <a
            href={exportResult.pdfUrl}
            className="flex items-center justify-center gap-3 bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors font-semibold"
            download
          >
            Download PDF
          </a>
        )}
      </div>
    </div>
  )
}

export default ExportResultsPanel