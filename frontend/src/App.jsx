import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { devLog } from './utils/logger'
import { PicklistProvider, usePicklist } from './contexts/PicklistContext'
import apiClient from './utils/apiClient'
import Header from './components/Header'
import FileUpload from './components/FileUpload'
import PicklistPreview from './components/PicklistPreview'
import ShoppingList from './components/ShoppingList'
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

// Main App Content Component
function AppContent() {
  const navigate = useNavigate()
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)


  const handleFileUpload = async (file, useIntelligent = true) => {
    navigate('/processing')
    setError(null)

    try {
      let result;

      if (useIntelligent) {
        // Use new intelligent picklist generation with user-first supplier selection
        devLog('Using intelligent picklist generation with user preferences...')
        result = await apiClient.uploadFileIntelligent(file)
        devLog('Intelligent upload result:', result)
      } else {
        // Use legacy approach
        devLog('Using legacy picklist generation...')
        result = await apiClient.uploadPicklist(file, true)
        devLog('Legacy upload result:', result)
      }

      devLog('Picklist items:', result.picklist)

      // Wrap result to maintain existing component expectations
      setResults({ success: true, ...result })

      // Clear database session when new file is uploaded
      apiClient.clearSessionPicklist().catch(console.warn)
      navigate('/')
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to process file')
      navigate('/error')
    }
  }

  const handleMultiFileUpload = async (files) => {
    navigate('/processing')
    setError(null)

    try {
      devLog(`Uploading ${files.length} CSV files for combined processing...`)
      const result = await apiClient.uploadMultipleCSV(files, true)
      devLog('Multi-CSV upload result:', result)

      // Transform multi-CSV results to be compatible with existing UI
      const transformedResult = {
        success: true,
        picklist: result.combinedPicklist,
        summary: result.overallSummary,
        validation: { isValid: true, errors: [], warnings: [] },
        multiCsvData: {
          files: result.files,
          analytics: result.analytics,
          metadata: result.metadata,
          individualSummaries: result.individualSummaries
        }
      }
      
      devLog('Combined picklist items:', result.combinedPicklist)
      setResults(transformedResult)
      
      // Clear database session when new file is uploaded
      apiClient.clearSessionPicklist().catch(console.warn)
      navigate('/')
    } catch (err) {
      console.error('Multi-CSV upload error:', err)
      setError(err.message || 'Failed to process CSV files')
      navigate('/error')
    }
  }

  const handleReset = () => {
    setResults(null)
    setError(null)
    // Clear database session when resetting
    apiClient.clearSessionPicklist().catch(console.warn)
    navigate('/')
  }

  const handleExportPicklist = () => {
    // No-op - export handled in preview component
  }


  // Shared Shopping List Component
  const SharedShoppingListPage = () => {
    const { shareId } = useParams()
    return (
      <div className="min-h-screen">
        <ShoppingList
          shareId={shareId}
          onBack={() => navigate('/')}
        />
      </div>
    )
  }

  // Processing Component
  const ProcessingPage = () => (
    <div className="min-h-screen gradient-bg">
      <Header />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="gradient-bg text-white px-8 py-4 rounded-lg inline-flex items-center justify-center gap-3 cursor-not-allowed opacity-75">
              <span className="spinner"></span>
              Processing your file...
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )

  // Home Page Component
  const HomePage = () => (
    <div className="min-h-screen gradient-bg">
      <Header />
      <main className="flex-1">
        {!results ? (
          <FileUpload onFileUpload={handleFileUpload} onMultiFileUpload={handleMultiFileUpload} />
        ) : (
          <PicklistPreview
            results={results}
            onBack={handleReset}
            onNavigate={(view) => navigate(`/${view}`)}
          />
        )}
      </main>
      <Footer />
    </div>
  )

  // Preview Page Component
  const PreviewPage = () => (
    <div className="min-h-screen gradient-bg">
      <Header />
      <main className="flex-1">
        <PicklistPreview
          results={results}
          onBack={handleReset}
          onNavigate={(view) => navigate(`/${view}`)}
        />
      </main>
      <Footer />
    </div>
  )

  // Shopping List Page Component - creates/redirects to shared shopping list
  const ShoppingListPage = () => {
    const { picklist: currentPicklist } = usePicklist()
    
    React.useEffect(() => {
      if (!currentPicklist || currentPicklist.length === 0) {
        navigate('/')
        return
      }

      // Create a shared shopping list and redirect to it
      const createSharedList = async () => {
        try {
          const result = await apiClient.createSharedList(currentPicklist, 'Shopping List')
          navigate(`/shopping/${result.shareId}`)
        } catch (error) {
          console.error('Error creating shared shopping list:', error)
        }
      }

      createSharedList()
    }, [currentPicklist, navigate])
    
    // Show loading while redirecting
    return (
      <div className="min-h-screen gradient-bg">
        <Header />
        <main className="flex-1">
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="gradient-bg text-white px-8 py-4 rounded-lg inline-flex items-center justify-center gap-3 cursor-not-allowed opacity-75">
                <span className="spinner"></span>
                Creating shopping list...
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Database Manager Page Component
  const DatabasePage = () => (
    <div className="min-h-screen gradient-bg">
      <Header />
      <main className="flex-1">
        <DatabaseManager onBack={() => navigate('/')} />
      </main>
      <Footer />
    </div>
  )

  // Error Page Component
  const ErrorPage = () => (
    <div className="min-h-screen gradient-bg">
      <Header />
      <main className="flex-1">
        <ErrorDisplay 
          error={error} 
          onTryAgain={handleReset}
        />
      </main>
      <Footer />
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/processing" element={<ProcessingPage />} />
      <Route path="/preview" element={<PreviewPage />} />
      <Route path="/shopping" element={<ShoppingListPage />} />
      <Route path="/database" element={<DatabasePage />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="/shopping/:shareId" element={<SharedShoppingListPage />} />
    </Routes>
  )
}

// Main App Component with Router
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PicklistProvider>
        <Router>
          <AppContent />
        </Router>
      </PicklistProvider>
    </ThemeProvider>
  )
}

export default App