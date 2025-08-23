import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const getCurrentView = () => {
    if (location.pathname === '/database') return 'database'
    return 'upload' // Default to upload for home and other routes
  }
  
  const currentView = getCurrentView()
  
  return (
    <header className="px-4 py-6">
      {/* Navigation Bar */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-white">
            Auto Picklist
          </h1>
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentView === 'upload' 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'text-white opacity-80 hover:opacity-100 hover:bg-white hover:bg-opacity-10'
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => navigate('/database')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentView === 'database' 
                  ? 'bg-white text-blue-600 shadow-md' 
                  : 'text-white opacity-80 hover:opacity-100 hover:bg-white hover:bg-opacity-10'
              }`}
            >
              Database
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className="md:hidden">
          <select
            value={currentView}
            onChange={(e) => {
              if (e.target.value === 'upload') navigate('/')
              else navigate(`/${e.target.value}`)
            }}
            className="bg-white bg-opacity-20 text-white rounded-lg px-3 py-2 text-sm font-medium border border-white border-opacity-30"
          >
            <option value="upload" className="text-gray-800">Upload</option>
            <option value="database" className="text-gray-800">Database</option>
          </select>
        </div>
      </nav>

      {/* Main Header Content */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
          Auto Picklist Generator
        </h2>
        <p className="text-lg md:text-xl text-white opacity-90 max-w-2xl mx-auto">
          Upload your CSV order file and get an optimized picklist with the best suppliers and prices
        </p>
      </div>
    </header>
  )
}

export default Header