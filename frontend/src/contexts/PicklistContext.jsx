import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { devLog } from '../utils/logger';

// Action types
const PICKLIST_ACTIONS = {
  SET_PICKLIST: 'SET_PICKLIST',
  UPDATE_ITEM: 'UPDATE_ITEM',
  UPDATE_MULTIPLE_ITEMS: 'UPDATE_MULTIPLE_ITEMS',
  RESET_PICKLIST: 'RESET_PICKLIST',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Initial state
const initialState = {
  picklist: [],
  loading: false,
  error: null,
  lastUpdated: null
};

// Reducer function
const picklistReducer = (state, action) => {
  switch (action.type) {
    case PICKLIST_ACTIONS.SET_PICKLIST:
      return {
        ...state,
        picklist: action.payload,
        lastUpdated: Date.now(),
        error: null
      };
    
    case PICKLIST_ACTIONS.UPDATE_ITEM:
      const { index, changes } = action.payload;
      const newPicklist = [...state.picklist];
      newPicklist[index] = { ...newPicklist[index], ...changes };
      return {
        ...state,
        picklist: newPicklist,
        lastUpdated: Date.now()
      };
    
    case PICKLIST_ACTIONS.UPDATE_MULTIPLE_ITEMS:
      const updatedPicklist = [...state.picklist];
      action.payload.updates.forEach(({ index, changes }) => {
        updatedPicklist[index] = { ...updatedPicklist[index], ...changes };
      });
      return {
        ...state,
        picklist: updatedPicklist,
        lastUpdated: Date.now()
      };
    
    case PICKLIST_ACTIONS.RESET_PICKLIST:
      return {
        ...initialState,
        picklist: []
      };
    
    case PICKLIST_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    case PICKLIST_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
    
    default:
      return state;
  }
};

// Context
const PicklistContext = createContext();

// Provider component
export const PicklistProvider = ({ children }) => {
  const [state, dispatch] = useReducer(picklistReducer, initialState);

  // Action creators
  const setPicklist = useCallback((picklist) => {
    devLog('PicklistContext: Setting picklist with', picklist?.length, 'items');
    dispatch({
      type: PICKLIST_ACTIONS.SET_PICKLIST,
      payload: picklist || []
    });
  }, []);

  const updateItem = useCallback((index, changes) => {
    devLog('PicklistContext: Updating item', index, 'with changes:', changes);
    dispatch({
      type: PICKLIST_ACTIONS.UPDATE_ITEM,
      payload: { index, changes }
    });
  }, []);

  const updateMultipleItems = useCallback((updates) => {
    devLog('PicklistContext: Updating multiple items:', updates.length);
    dispatch({
      type: PICKLIST_ACTIONS.UPDATE_MULTIPLE_ITEMS,
      payload: { updates }
    });
  }, []);

  const resetPicklist = useCallback(() => {
    devLog('PicklistContext: Resetting picklist');
    dispatch({
      type: PICKLIST_ACTIONS.RESET_PICKLIST
    });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({
      type: PICKLIST_ACTIONS.SET_LOADING,
      payload: loading
    });
  }, []);

  const setError = useCallback((error) => {
    dispatch({
      type: PICKLIST_ACTIONS.SET_ERROR,
      payload: error
    });
  }, []);

  // Helper functions
  const getItem = useCallback((index) => {
    return state.picklist[index] || null;
  }, [state.picklist]);

  const getItemById = useCallback((itemId) => {
    return state.picklist.find(item => item.id === itemId) || null;
  }, [state.picklist]);

  const getTotalItems = useCallback(() => {
    return state.picklist.length;
  }, [state.picklist]);

  const getTotalCost = useCallback(() => {
    return state.picklist.reduce((total, item) => {
      const price = parseFloat(item.totalPrice) || 0;
      return total + price;
    }, 0);
  }, [state.picklist]);

  // Context value
  const value = {
    // State
    ...state,
    
    // Actions
    setPicklist,
    updateItem,
    updateMultipleItems,
    resetPicklist,
    setLoading,
    setError,
    
    // Helpers
    getItem,
    getItemById,
    getTotalItems,
    getTotalCost
  };

  return (
    <PicklistContext.Provider value={value}>
      {children}
    </PicklistContext.Provider>
  );
};

// Custom hook
export const usePicklist = () => {
  const context = useContext(PicklistContext);
  if (!context) {
    throw new Error('usePicklist must be used within a PicklistProvider');
  }
  return context;
};

export default PicklistContext;