import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { devLog } from './utils/logger'
import { PicklistProvider, usePicklist } from './contexts/PicklistContext'
import { AuthProvider } from './contexts/AuthContext'
import apiClient from './utils/apiClient'
import AuthGate from './components/AuthGate'
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

      // Session clearing removed - now using shared lists only
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
      
      // Session clearing removed - now using shared lists only
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
    // Session clearing removed - now using shared lists only
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
        <div className="max-w-2xl mx-auto p-8 animate-fade-in">
          <div className="card p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 to-secondary-50/50 opacity-60"></div>
            <div className="relative">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-soft animate-pulse-subtle">
                <span className="spinner w-8 h-8 border-3 border-white"></span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Processing your files</h3>
              <p className="text-gray-600 mb-6">Please wait while we analyze and optimize your picklist...</p>
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
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
          <div className="max-w-2xl mx-auto p-8 animate-fade-in">
            <div className="card p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-success-50/50 to-primary-50/50 opacity-60"></div>
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-success-500 to-primary-500 rounded-2xl flex items-center justify-center shadow-soft animate-pulse-subtle">
                  <span className="spinner w-8 h-8 border-3 border-white"></span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Creating shopping list</h3>
                <p className="text-gray-600 mb-6">Setting up your personalized shopping experience...</p>
                <div className="flex justify-center gap-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
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
      <AuthProvider>
        <AuthGate>
          <PicklistProvider>
            <Router>
              <AppContent />
            </Router>
          </PicklistProvider>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App