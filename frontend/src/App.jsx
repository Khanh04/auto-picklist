import React, { useState } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline, Container, Box, Tabs, Tab, Paper } from '@mui/material'
import { Upload, Preview, Storage } from '@mui/icons-material'
import Header from './components/Header'
import FileUpload from './components/FileUpload'
import PicklistPreview from './components/PicklistPreview'
import DatabaseManager from './components/DatabaseManager'
import ErrorDisplay from './components/ErrorDisplay'
import Footer from './components/Footer'

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
})

function App() {
  const [currentView, setCurrentView] = useState('upload') // 'upload', 'processing', 'preview', 'database', 'error'
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [editedPicklist, setEditedPicklist] = useState(null) // Store edited picklist state

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
        setEditedPicklist(null) // Reset edited picklist for new upload
        setCurrentView('upload') // Stay on upload tab but show preview
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
    setEditedPicklist(null)
    setError(null)
    setIsProcessing(false)
  }

  // Export is now handled directly in PicklistPreview component
  // This function is no longer needed but kept for compatibility
  const handleExportPicklist = () => {
    // No-op - export handled in preview component
  }

  // Removed handleBackToPreview since Results component is no longer used

  const handleNavigate = (view) => {
    setCurrentView(view)
    // Only reset states when explicitly resetting (not when just switching tabs)
    // State will be preserved when switching between upload/database tabs
  }

  const handlePicklistUpdate = (updatedPicklist) => {
    setEditedPicklist(updatedPicklist)
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Header currentView={currentView} onNavigate={handleNavigate} />
      <main className="flex-1">
        {currentView === 'upload' && !results && (
          <FileUpload onFileUpload={handleFileUpload} />
        )}
        
        {currentView === 'upload' && results && (
          <PicklistPreview
            results={results}
            editedPicklist={editedPicklist}
            onPicklistUpdate={handlePicklistUpdate}
            onExport={handleExportPicklist}
            onBack={handleReset}
          />
        )}
        
        {currentView === 'processing' && (
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="gradient-bg text-white px-8 py-4 rounded-lg inline-flex items-center justify-center gap-3 cursor-not-allowed opacity-75">
                <span className="spinner"></span>
                Processing your file...
              </div>
            </div>
          </div>
        )}
        
        {currentView === 'preview' && (
          <PicklistPreview
            results={results}
            editedPicklist={editedPicklist}
            onPicklistUpdate={handlePicklistUpdate}
            onExport={handleExportPicklist}
            onBack={handleReset}
          />
        )}

        {currentView === 'database' && (
          <DatabaseManager onBack={() => handleNavigate('upload')} />
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