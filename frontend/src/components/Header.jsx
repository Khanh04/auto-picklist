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

          {/* Authentication Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              // Authenticated user menu
              <>
                {!isMobile && (
                  <span className="text-white opacity-90 text-sm">
                    {user?.firstName} {user?.lastName}
                  </span>
                )}
                <IconButton
                  onClick={handleUserMenuClick}
                  sx={{
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {getInitials()}
                  </Avatar>
                </IconButton>
              </>
            ) : (
              // Login/Register buttons
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  onClick={handleOpenLogin}
                  startIcon={<LoginIcon />}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  variant="outlined"
                  size="small"
                >
                  {isMobile ? '' : 'Sign In'}
                </Button>
                <Button
                  onClick={handleOpenRegister}
                  startIcon={<PersonAdd />}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                  variant="contained"
                  size="small"
                >
                  {isMobile ? '' : 'Sign Up'}
                </Button>
              </Box>
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
                className="bg-white bg-opacity-20 text-white rounded-lg px-3 py-2 text-sm font-medium border border-white border-opacity-30"
              >
                <option value="upload" className="text-gray-800">Upload</option>
                <option value="database" className="text-gray-800">Database</option>
              </select>
            </div>
          )}
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