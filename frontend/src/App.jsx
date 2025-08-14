import React, { useState } from 'react'
import Header from './components/Header'
import FileUpload from './components/FileUpload'
import PicklistPreview from './components/PicklistPreview'
import Results from './components/Results'
import ErrorDisplay from './components/ErrorDisplay'
import Footer from './components/Footer'

function App() {
  const [currentView, setCurrentView] = useState('upload') // 'upload', 'processing', 'preview', 'results', 'error'
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (file) => {
    setIsProcessing(true)
    setCurrentView('processing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('csvFile', file)

      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setResults(result)
        setCurrentView('preview') // Show preview first instead of results
      } else {
        setError(result.error || 'Failed to process file')
        setCurrentView('error')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Network error. Please try again.')
      setCurrentView('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setCurrentView('upload')
    setResults(null)
    setError(null)
    setIsProcessing(false)
  }

  const handleExportPicklist = async (editedResults) => {
    try {
      setIsProcessing(true)
      
      // Send edited picklist to server for export
      const response = await fetch('/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedResults)
      })

      const result = await response.json()

      if (result.success) {
        setResults({ ...editedResults, ...result })
        setCurrentView('results')
      } else {
        setError(result.error || 'Failed to export picklist')
        setCurrentView('error')
      }
    } catch (err) {
      console.error('Export error:', err)
      setError('Network error during export. Please try again.')
      setCurrentView('error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBackToPreview = () => {
    setCurrentView('preview')
  }

  return (
    <div className="container">
      <Header />
      <main className="main">
        {currentView === 'upload' && (
          <FileUpload onFileUpload={handleFileUpload} />
        )}
        
        {currentView === 'processing' && (
          <div className="upload-section">
            <div className="process-btn" disabled>
              <span className="spinner"></span>
              Processing your file...
            </div>
          </div>
        )}
        
        {currentView === 'preview' && (
          <PicklistPreview
            results={results}
            onExport={handleExportPicklist}
            onBack={handleReset}
          />
        )}

        {currentView === 'results' && (
          <Results 
            results={results} 
            onNewUpload={handleReset}
            onBackToPreview={handleBackToPreview}
          />
        )}
        
        {currentView === 'error' && (
          <ErrorDisplay 
            error={error} 
            onTryAgain={handleReset}
          />
        )}
      </main>
      <Footer />
    </div>
  )
}

export default App