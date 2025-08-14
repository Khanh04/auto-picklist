import React from 'react'

function Results({ results, onNewUpload, onBackToPreview }) {
  const { summary, csvPath, pdfPath } = results

  const downloadFile = (type, filename) => {
    const link = document.createElement('a')
    link.href = `/download/${type}/${filename}`
    link.download = `picklist-${Date.now()}.${type}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadPdf = () => {
    const filename = pdfPath.split('/').pop()
    downloadFile('pdf', filename)
  }

  const handleDownloadCsv = () => {
    const filename = csvPath.split('/').pop()
    downloadFile('csv', filename)
  }

  return (
    <div className="results-section">
      <h3>✅ Picklist Generated Successfully!</h3>
      
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-number">{summary.totalItems}</div>
          <div className="summary-label">Total Items</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">${summary.totalCost.toFixed(2)}</div>
          <div className="summary-label">Estimated Cost</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{summary.itemsWithSuppliers}</div>
          <div className="summary-label">Items Matched</div>
        </div>
      </div>

      <div className="download-section">
        <h4>Download Your Picklist</h4>
        <div className="download-buttons">
          <button 
            type="button" 
            className="download-btn pdf-btn"
            onClick={handleDownloadPdf}
          >
            <span className="btn-icon">📄</span>
            Download PDF
          </button>
          <button 
            type="button" 
            className="download-btn csv-btn"
            onClick={handleDownloadCsv}
          >
            <span className="btn-icon">📊</span>
            Download CSV
          </button>
        </div>
      </div>

      <div className="results-actions">
        {onBackToPreview && (
          <button 
            type="button" 
            className="back-btn"
            onClick={onBackToPreview}
          >
            ← Edit Picklist
          </button>
        )}
        <button 
          type="button" 
          className="new-upload-btn"
          onClick={onNewUpload}
        >
          Upload Another File
        </button>
      </div>
    </div>
  )
}

export default Results