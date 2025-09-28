import React from 'react'

function ErrorDisplay({ error, onTryAgain }) {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center relative">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/3 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-lg mx-auto p-8 relative z-10 animate-fade-in">
        <div className="card p-10 text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>

          <div className="relative">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-error-100 to-error-200 rounded-2xl flex items-center justify-center shadow-soft animate-scale-in">
              <svg className="w-10 h-10 text-error-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>

            <h2 className="text-3xl font-bold text-gray-800 mb-4 tracking-tight">
              Oops! Something went wrong
            </h2>

            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Don't worry, this happens sometimes. Let's try to get you back on track.
            </p>

            {/* Error Details */}
            <div className="status-error p-6 mb-8 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-error-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-error-800 mb-2">Error Details</h4>
                  <p className="text-error-700 text-sm leading-relaxed">
                    {error || 'An unexpected error occurred while processing your file. Please check your file format and try again.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={onTryAgain}
                className="w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform gradient-bg text-white hover:scale-105 hover:shadow-large active:scale-[1.02] shadow-soft focus:outline-none focus:ring-4 focus:ring-primary-200"
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </div>
              </button>

              <div className="flex items-center justify-center gap-4 text-gray-500 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Need help? Check file format</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorDisplay