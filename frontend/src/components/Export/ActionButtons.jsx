import React from 'react'

function ActionButtons({ onBack, onShoppingList, onExport, isExporting }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
      <button
        onClick={onBack}
        className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform btn-secondary hover:scale-102 focus:outline-none focus:ring-4 focus:ring-gray-200 flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Upload
      </button>

      <button
        onClick={onShoppingList}
        className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform gradient-green text-white hover:scale-102 hover:shadow-large active:scale-[1.02] shadow-soft focus:outline-none focus:ring-4 focus:ring-success-200 flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
        Shopping List
      </button>

      <button
        onClick={onExport}
        disabled={isExporting}
        className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-primary-200 flex items-center justify-center gap-3 ${
          isExporting
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'gradient-bg text-white hover:scale-102 hover:shadow-large active:scale-[1.02] shadow-soft'
        }`}
      >
        {isExporting ? (
          <>
            <span className="spinner w-5 h-5"></span>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Picklist
          </>
        )}
      </button>
    </div>
  )
}

export default ActionButtons