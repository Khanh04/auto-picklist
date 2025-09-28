import React, { useState } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

/**
 * ProtectedRoute component that renders children only if user is authenticated
 * Shows loading state while checking authentication
 * Shows login prompt for unauthenticated users
 */
const ProtectedRoute = ({
  children,
  fallback = null,
  showLoginPrompt = true,
  requireAuth = true,
  loadingComponent = null
}) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Show loading state while checking authentication
  if (loading) {
    if (loadingComponent) {
      return loadingComponent;
    }

    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // If authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Show login prompt if enabled
    if (showLoginPrompt) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          gap={3}
          textAlign="center"
          p={4}
        >
          <Typography variant="h5" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={2}>
            Please log in to access this feature and save your preferences.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => setAuthModalOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
              }
            }}
          >
            Sign In
          </Button>

          <AuthModal
            open={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            initialMode="login"
          />
        </Box>
      );
    }

    // Return null if no login prompt
    return null;
  }

  // User is authenticated or authentication is not required - render children
  return children;
};

/**
 * Higher-order component version of ProtectedRoute
 */
export const withAuth = (Component, options = {}) => {
  const WrappedComponent = (props) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Hook to check if user has specific permissions/roles
 */
export const usePermissions = () => {
  const { user, isAuthenticated } = useAuth();

  const hasRole = (role) => {
    if (!isAuthenticated || !user) return false;
    return user.roles?.includes(role) || false;
  };

  const hasPermission = (permission) => {
    if (!isAuthenticated || !user) return false;
    return user.permissions?.includes(permission) || false;
  };

  const isAdmin = () => hasRole('admin');
  const isModerator = () => hasRole('moderator') || isAdmin();

  return {
    hasRole,
    hasPermission,
    isAdmin,
    isModerator,
    roles: user?.roles || [],
    permissions: user?.permissions || []
  };
};

/**
 * Component to conditionally render content based on roles/permissions
 */
export const ConditionalRender = ({
  role,
  permission,
  requireAuth = true,
  fallback = null,
  children
}) => {
  const { isAuthenticated } = useAuth();
  const { hasRole, hasPermission } = usePermissions();

  // Check authentication first
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }

  // Check role if specified
  if (role && !hasRole(role)) {
    return fallback;
  }

  // Check permission if specified
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  return children;
};

export default ProtectedRoute;