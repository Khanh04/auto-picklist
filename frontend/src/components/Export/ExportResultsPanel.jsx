import React from 'react'

function ExportResultsPanel({ exportResult }) {
  if (!exportResult) return null

  return (
    <div className="status-success p-8 mb-8 rounded-2xl shadow-soft animate-slide-up">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-success-500 rounded-2xl flex items-center justify-center shadow-soft">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-success-800 mb-1">Export Successful!</h3>
          <p className="text-success-700">Your picklist has been generated and is ready for download</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportResult.csvUrl && (
          <a
            href={exportResult.csvUrl}
            className="group relative overflow-hidden bg-white border border-success-200 p-6 rounded-2xl hover:shadow-medium transition-all duration-300 transform hover:scale-102 focus:outline-none focus:ring-4 focus:ring-success-200"
            download
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-success-100 to-success-200 rounded-xl flex items-center justify-center group-hover:from-success-200 group-hover:to-success-300 transition-colors duration-300">
                <svg className="w-6 h-6 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 group-hover:text-success-700 transition-colors duration-300">CSV Download</h4>
                <p className="text-sm text-gray-600">Spreadsheet format for data analysis</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-success-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </a>
        )}

        {exportResult.pdfUrl && (
          <a
            href={exportResult.pdfUrl}
            className="group relative overflow-hidden bg-white border border-success-200 p-6 rounded-2xl hover:shadow-medium transition-all duration-300 transform hover:scale-102 focus:outline-none focus:ring-4 focus:ring-success-200"
            download
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-error-100 to-error-200 rounded-xl flex items-center justify-center group-hover:from-error-200 group-hover:to-error-300 transition-colors duration-300">
                <svg className="w-6 h-6 text-error-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 group-hover:text-error-700 transition-colors duration-300">PDF Download</h4>
                <p className="text-sm text-gray-600">Professional report format</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-error-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </a>
        )}
      </div>
    </div>
  )
}

export default ExportResultsPanel