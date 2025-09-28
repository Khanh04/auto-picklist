import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { devLog } from '../utils/logger';
import apiClient from '../utils/apiClient';

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  LOGOUT: 'LOGOUT',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  SET_PREFERENCES: 'SET_PREFERENCES',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES'
};

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true, // Start with loading true to check auth status
  error: null,
  preferences: null
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false
      };

    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: action.payload,
        error: null
      };

    case AUTH_ACTIONS.SET_PREFERENCES:
      return {
        ...state,
        preferences: action.payload
      };

    case AUTH_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };

    default:
      return state;
  }
};

// Context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Helper function to check if user is authenticated
  const checkAuthStatus = useCallback(async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      // Try to get current user profile
      const userData = await apiClient.getCurrentUser();

      if (userData) {
        devLog('AuthContext: User authenticated:', userData);
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: userData });

        // Load user preferences
        try {
          const preferencesData = await apiClient.getUserPreferences();
          dispatch({ type: AUTH_ACTIONS.SET_PREFERENCES, payload: preferencesData });
        } catch (prefError) {
          devLog('AuthContext: Could not load preferences:', prefError);
          // Don't set error for preferences failure
        }
      } else {
        devLog('AuthContext: No authenticated user');
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: null });
      }
    } catch (error) {
      devLog('AuthContext: Auth check failed:', error);
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: null });
    }
  }, []);

  // Check auth status on mount and set up API client callback
  useEffect(() => {
    // Set up API client to call logout when authentication fails
    apiClient.setAuthFailureCallback(() => {
      devLog('AuthContext: API client triggered auth failure - logging out');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    });

    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiClient.login(email, password);

      if (response.user) {
        devLog('AuthContext: Login successful:', response.user);
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: response.user });

        // Load user preferences
        try {
          const preferencesData = await apiClient.getUserPreferences();
          dispatch({ type: AUTH_ACTIONS.SET_PREFERENCES, payload: preferencesData });
        } catch (prefError) {
          devLog('AuthContext: Could not load preferences after login:', prefError);
        }

        return { success: true, user: response.user };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      devLog('AuthContext: Login failed:', error);
      const errorMessage = error.message || 'Login failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiClient.register(userData);

      devLog('AuthContext: Registration successful:', response);

      // Note: After registration, user may need email verification
      // Don't automatically log them in
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });

      return {
        success: true,
        message: response.message || 'Registration successful. Please check your email for verification.'
      };
    } catch (error) {
      devLog('AuthContext: Registration failed:', error);
      const errorMessage = error.message || 'Registration failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
      devLog('AuthContext: Logout successful');
    } catch (error) {
      devLog('AuthContext: Logout API call failed:', error);
      // Continue with local logout even if API call fails
    }

    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  }, []);

  // Update profile function
  const updateProfile = useCallback(async (profileData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const updatedUser = await apiClient.updateProfile(profileData);

      devLog('AuthContext: Profile updated:', updatedUser);
      dispatch({ type: AUTH_ACTIONS.UPDATE_PROFILE, payload: updatedUser });

      return { success: true, user: updatedUser };
    } catch (error) {
      devLog('AuthContext: Profile update failed:', error);
      const errorMessage = error.message || 'Profile update failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Update preferences function
  const updatePreferences = useCallback(async (newPreferences) => {
    try {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const updatedPreferences = await apiClient.updateUserPreferences(newPreferences);

      devLog('AuthContext: Preferences updated:', updatedPreferences);
      dispatch({ type: AUTH_ACTIONS.UPDATE_PREFERENCES, payload: updatedPreferences });

      return { success: true, preferences: updatedPreferences };
    } catch (error) {
      devLog('AuthContext: Preferences update failed:', error);
      const errorMessage = error.message || 'Preferences update failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // Refresh auth status (useful after token refresh)
  const refreshAuth = useCallback(async () => {
    await checkAuthStatus();
  }, [checkAuthStatus]);

  // Context value
  const value = {
    // State
    ...state,

    // Actions
    login,
    register,
    logout,
    updateProfile,
    updatePreferences,
    clearError,
    refreshAuth,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;