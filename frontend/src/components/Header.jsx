import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Box,
  useMediaQuery,
  useTheme
} from '@mui/material'
import {
  AccountCircle,
  Settings,
  ExitToApp,
  Login as LoginIcon,
  PersonAdd
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from './AuthModal'
import UserProfile from './UserProfile'
import UserPreferences from './UserPreferences'

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user, isAuthenticated, logout } = useAuth()

  // State for auth modal and user menu
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')
  const [userMenuAnchor, setUserMenuAnchor] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false)

  const getCurrentView = () => {
    if (location.pathname === '/database') return 'database'
    return 'upload' // Default to upload for home and other routes
  }

  const currentView = getCurrentView()

  // Auth modal handlers
  const handleOpenLogin = () => {
    setAuthModalMode('login')
    setAuthModalOpen(true)
  }

  const handleOpenRegister = () => {
    setAuthModalMode('register')
    setAuthModalOpen(true)
  }

  const handleCloseAuthModal = () => {
    setAuthModalOpen(false)
  }

  // User menu handlers
  const handleUserMenuClick = (event) => {
    setUserMenuAnchor(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null)
  }

  const handleProfileClick = () => {
    setProfileModalOpen(true)
    handleUserMenuClose()
  }

  const handlePreferencesClick = () => {
    setPreferencesModalOpen(true)
    handleUserMenuClose()
  }

  const handleLogout = async () => {
    await logout()
    handleUserMenuClose()
  }

  const getInitials = () => {
    if (!user) return 'U'
    const firstName = user.firstName || ''
    const lastName = user.lastName || ''
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <>
      <header className="px-4 py-8 relative">
        {/* Navigation Bar */}
        <nav className="max-w-6xl mx-auto flex items-center justify-between mb-12 relative z-10">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <span className="text-xl font-bold text-white">📋</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Auto Picklist
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-2xl p-1.5 border border-white/20">
              <button
                onClick={() => navigate('/')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  currentView === 'upload'
                    ? 'bg-white text-primary-600 shadow-soft transform scale-105'
                    : 'text-white/90 hover:text-white hover:bg-white/10 transform hover:scale-102'
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => navigate('/database')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  currentView === 'database'
                    ? 'bg-white text-primary-600 shadow-soft transform scale-105'
                    : 'text-white/90 hover:text-white hover:bg-white/10 transform hover:scale-102'
                }`}
              >
                Database
              </button>
            </div>
          </div>

          {/* Authentication Section */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              // Authenticated user menu
              <div className="flex items-center gap-3">
                {!isMobile && (
                  <div className="text-right">
                    <div className="text-white/90 text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-white/60 text-xs">
                      Welcome back
                    </div>
                  </div>
                )}
                <button
                  onClick={handleUserMenuClick}
                  className="relative group"
                >
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 group-hover:bg-white/30 transition-all duration-300 group-hover:scale-105">
                    <span className="text-sm font-bold text-white">
                      {getInitials()}
                    </span>
                  </div>
                  <div className="absolute -inset-1 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </button>
              </div>
            ) : (
              // Login/Register buttons
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenLogin}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/30 text-white/90 hover:text-white hover:border-white/50 hover:bg-white/10 transition-all duration-300 font-medium text-sm backdrop-blur-sm transform hover:scale-102"
                >
                  <LoginIcon fontSize="small" />
                  {!isMobile && 'Sign In'}
                </button>
                <button
                  onClick={handleOpenRegister}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 border border-white/20 text-white hover:bg-white/30 transition-all duration-300 font-medium text-sm backdrop-blur-sm transform hover:scale-102 hover:shadow-glow"
                >
                  <PersonAdd fontSize="small" />
                  {!isMobile && 'Sign Up'}
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu - updated to include auth when not authenticated */}
          {!isAuthenticated && (
            <div className="md:hidden">
              <select
                value={currentView}
                onChange={(e) => {
                  if (e.target.value === 'upload') navigate('/')
                  else navigate(`/${e.target.value}`)
                }}
                className="bg-white/20 backdrop-blur-sm text-white rounded-xl px-4 py-2.5 text-sm font-medium border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="upload" className="text-gray-800">Upload</option>
                <option value="database" className="text-gray-800">Database</option>
              </select>
            </div>
          )}
        </nav>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-1/4 w-48 h-48 bg-white/3 rounded-full blur-3xl"></div>
        </div>

        {/* Main Header Content */}
        <div className="text-center relative z-10 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
              <span className="inline-block animate-slide-up">Auto Picklist Generator</span>
            </h2>
            <div className="w-24 h-1 bg-white/30 rounded-full mx-auto mb-6"></div>
          </div>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
            Upload your CSV order file and get an optimized picklist with the best suppliers and prices
          </p>
          <div className="mt-8 flex items-center justify-center gap-8 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse-subtle"></div>
              <span>Intelligent Matching</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse-subtle"></div>
              <span>Multi-Supplier Support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse-subtle"></div>
              <span>Real-time Processing</span>
            </div>
          </div>
        </div>
      </header>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={handlePreferencesClick}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preferences</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <ExitToApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign Out</ListItemText>
        </MenuItem>
      </Menu>

      {/* Authentication Modal */}
      <AuthModal
        open={authModalOpen}
        onClose={handleCloseAuthModal}
        initialMode={authModalMode}
      />

      {/* Profile Modal */}
      {profileModalOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            p: 2
          }}
          onClick={() => setProfileModalOpen(false)}
        >
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              maxWidth: 800,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <UserProfile onClose={() => setProfileModalOpen(false)} />
          </Box>
        </Box>
      )}

      {/* Preferences Modal */}
      {preferencesModalOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            p: 2
          }}
          onClick={() => setPreferencesModalOpen(false)}
        >
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              maxWidth: 800,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <UserPreferences onClose={() => setPreferencesModalOpen(false)} />
          </Box>
        </Box>
      )}
    </>
  )
}

export default Header