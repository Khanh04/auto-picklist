import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
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
  const [editedPicklist, setEditedPicklist] = useState(null)

  const handleFileUpload = async (file) => {
    navigate('/processing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('useDatabase', 'true')

      const response = await fetch('/api/picklist/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      console.log('Upload result:', result)

      if (result.success) {
        console.log('Picklist items:', result.picklist)
        setResults(result)
        setEditedPicklist(null)
        navigate('/')
      } else {
        setError(result.error || 'Failed to process file')
        navigate('/error')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Network error. Please try again.')
      navigate('/error')
    }
  }

  const handleReset = () => {
    setResults(null)
    setEditedPicklist(null)
    setError(null)
    navigate('/')
  }

  const handleExportPicklist = () => {
    // No-op - export handled in preview component
  }

  const handlePicklistUpdate = (updatedPicklist) => {
    setEditedPicklist(updatedPicklist)
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
          <FileUpload onFileUpload={handleFileUpload} />
        ) : (
          <PicklistPreview
            results={results}
            editedPicklist={editedPicklist}
            onPicklistUpdate={handlePicklistUpdate}
            onExport={handleExportPicklist}
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
          editedPicklist={editedPicklist}
          onPicklistUpdate={handlePicklistUpdate}
          onExport={handleExportPicklist}
          onBack={handleReset}
          onNavigate={(view) => navigate(`/${view}`)}
        />
      </main>
      <Footer />
    </div>
  )

  // Shopping List Page Component - automatically creates shared list
  const ShoppingListPage = () => {
    const [isCreatingShare, setIsCreatingShare] = useState(false)
    
    useEffect(() => {
      // Auto-create shared list when accessing shopping list
      const createSharedList = async () => {
        const currentPicklist = editedPicklist || (results && results.picklist)
        if (!currentPicklist || currentPicklist.length === 0) {
          navigate('/')
          return
        }
        
        setIsCreatingShare(true)
        try {
          const response = await fetch('/api/shopping-list/share', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              picklist: currentPicklist,
              title: 'Shopping List'
            })
          })
          
          const result = await response.json()
          if (result.success) {
            // Redirect to shared shopping list
            navigate(`/shopping/${result.shareId}`, { replace: true })
          } else {
            console.error('Failed to create shared list:', result.error)
            setIsCreatingShare(false)
          }
        } catch (error) {
          console.error('Error creating shared list:', error)
          setIsCreatingShare(false)
        }
      }
      
      createSharedList()
    }, [editedPicklist, results, navigate])
    
    if (isCreatingShare) {
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
    
    return null
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
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  )
}

export default App