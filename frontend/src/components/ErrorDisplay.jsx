import React from 'react'

function ErrorDisplay({ error, onTryAgain }) {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="max-w-md mx-auto p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-6">💥</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Oops! Something went wrong
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">
              {error || 'An unexpected error occurred while processing your file.'}
            </p>
          </div>
          <button
            onClick={onTryAgain}
            className="w-full gradient-bg text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    </div>
  )
}

export default ErrorDisplay