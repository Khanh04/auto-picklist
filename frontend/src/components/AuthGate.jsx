import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import Register from './Register';
import { CircularProgress, Box, Typography } from '@mui/material';

/**
 * AuthGate - Authentication gatekeeper component
 * Enforces mandatory authentication for the entire application
 */
const AuthGate = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        className="gradient-bg"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2, color: 'white' }}>
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // If user is not authenticated, show login/register forms
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen gradient-bg">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            {authMode === 'login' ? (
              <Login onSwitchToRegister={() => setAuthMode('register')} />
            ) : (
              <Register onSwitchToLogin={() => setAuthMode('login')} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected application
  return children;
};

export default AuthGate;