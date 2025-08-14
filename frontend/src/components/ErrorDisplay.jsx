import React from 'react'

function ErrorDisplay({ error, onTryAgain }) {
  return (
    <div className="error-section">
      <div className="error-message">
        <h3>❌ Error Processing File</h3>
        <p>{error}</p>
        <button 
          type="button" 
          className="try-again-btn"
          onClick={onTryAgain}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

export default ErrorDisplay