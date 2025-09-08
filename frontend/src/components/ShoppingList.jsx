import React, { useState, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';

function ShoppingList({ picklist: propPicklist, onBack, shareId = null, loading = false, onPicklistUpdate = null }) {
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [groupedItems, setGroupedItems] = useState({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [checkedCost, setCheckedCost] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [listTitle, setListTitle] = useState('Shopping List');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [currentPicklist, setCurrentPicklist] = useState(propPicklist || []);
  const [switchingSupplier, setSwitchingSupplier] = useState(new Set());
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierModalData, setSupplierModalData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collapsedSuppliers, setCollapsedSuppliers] = useState(new Set());
  const [partialQuantities, setPartialQuantities] = useState(new Map()); // Track partial quantities picked
  
  // Helper functions for cleaner partial quantity logic
  const getPurchasedQuantity = (index) => partialQuantities.get(index) || 0;
  const getRemainingQuantity = (item, index) => {
    const total = parseInt(item.quantity) || 1;
    const purchased = getPurchasedQuantity(index);
    return Math.max(0, total - purchased);
  };
  const isFullyPurchased = (item, index) => {
    const total = parseInt(item.quantity) || 1;
    const purchased = getPurchasedQuantity(index);
    return purchased >= total;
  };
  const isPartiallyPurchased = (item, index) => {
    const purchased = getPurchasedQuantity(index);
    return purchased > 0 && !isFullyPurchased(item, index);
  };
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalData, setQuantityModalData] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Helper function to calculate if an item is checked based on quantities
  const isItemChecked = (item) => {
    const purchasedQty = item.purchasedQuantity || 0;
    const requestedQty = item.requestedQuantity || parseInt(item.quantity) || 1;
    return purchasedQty >= requestedQty;
  };

  // Unified data sync manager - handles all update scenarios
  const syncPicklistData = async (updateFunction, options = {}) => {
    const { 
      broadcastToOthers = false, 
      itemIndex = null,
      suppressWebSocket = false 
    } = options;

    return new Promise((resolve) => {
      setCurrentPicklist(prevPicklist => {
        const newPicklist = updateFunction(prevPicklist);
        
        // Async persistence and sync logic
        const performSync = async () => {
          try {
            // 1. Save to appropriate storage
            const saveSuccess = await persistPicklistData(newPicklist);
            
            // 2. Broadcast to other clients if needed and save was successful
            if (saveSuccess && broadcastToOthers && shareId && broadcastUpdate && !suppressWebSocket) {
              broadcastUpdate({
                itemIndex: itemIndex,
                timestamp: Date.now(),
                updateType: 'supplier_change'
              });
              console.log(`📡 Broadcasted update for item ${itemIndex} to other clients`);
            }

            // 3. Handle parent callback (refresh main page for non-shared lists)
            if (saveSuccess && onPicklistUpdate) {
              console.log(`🔄 Refreshing main page with updated data`);
              onPicklistUpdate(newPicklist);
            }
            
            resolve({ success: saveSuccess, data: newPicklist });
          } catch (error) {
            console.error('Sync operation failed:', error);
            resolve({ success: false, error });
          }
        };
        
        performSync();
        return newPicklist;
      });
    });
  };

  // Persistence layer - handles saving to appropriate storage
  const persistPicklistData = async (picklistData) => {
    try {
      if (shareId) {
        // Shared lists: save to shared database
        const response = await fetch(`/api/shopping-list/share/${shareId}/picklist`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ picklist: picklistData })
        });
        
        if (response.ok) {
          console.log('✅ Saved shared shopping list to database');
          return true;
        } else {
          console.error('❌ Failed to save shared shopping list to database');
          return false;
        }
      } else {
        // Non-shared lists: save to session storage
        const response = await fetch('/api/session/picklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ picklist: picklistData })
        });
        
        if (response.ok) {
          console.log('✅ Saved shopping list to session storage');
          return true;
        } else {
          console.error('❌ Failed to save shopping list to session storage');
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Persistence error:', error);
      return false;
    }
  };

  // Initialize WebSocket connection for shared lists
  const { isConnected, connectionError, subscribe, broadcastUpdate } = useWebSocket(shareId);

  // Initialize picklist data - for shared lists, fetch from API; for main lists, use props
  useEffect(() => {
    const loadPicklistData = async () => {
      if (shareId) {
        // For shared lists, fetch data from API only once
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/shopping-list/share/${shareId}`);
          const result = await response.json();
          
          if (result.success && result.data && result.data.picklist) {
            setCurrentPicklist(result.data.picklist);
            
            // Restore partial quantities from database
            const newPartialQuantities = new Map();
            result.data.picklist.forEach((item, index) => {
              if (item.purchasedQuantity && item.purchasedQuantity > 0) {
                newPartialQuantities.set(index, item.purchasedQuantity);
              }
            });
            setPartialQuantities(newPartialQuantities);
          } else {
            setError(result.error || 'Failed to load shopping list');
          }
        } catch (error) {
          console.error('Error fetching shared list:', error);
          setError('Network error while loading shopping list');
        } finally {
          setIsLoading(false);
        }
      } else {
        // For main lists, use the provided picklist prop
        setCurrentPicklist(propPicklist || []);
      }
    };

    // Only load data if we have a shareId and haven't loaded yet, or if there's no shareId
    if ((shareId && currentPicklist.length === 0) || !shareId) {
      loadPicklistData();
    }
  }, [shareId]); // Removed propPicklist from dependencies to prevent re-fetching

  // Handle prop picklist changes for non-shared lists only
  useEffect(() => {
    if (!shareId && propPicklist) {
      setCurrentPicklist(propPicklist);
    }
  }, [propPicklist, shareId]);

  // Set up WebSocket event handlers for shared lists
  useEffect(() => {
    if (!shareId) return;

    // Handle real-time item toggle updates from other users (legacy handler)
    // NOTE: This is now handled by the unified 'picklist_updated' handler below

    // Handle picklist update signals from other users
    const unsubscribeUpdate = subscribe('picklist_updated', async (data) => {
      console.log('Received picklist update signal:', data);
      
      // Fetch fresh data from database
      try {
        const response = await fetch(`/api/shopping-list/share/${shareId}`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.picklist) {
          console.log('Refreshed picklist data from database');
          console.log('📊 Received picklist data:', result.data.picklist.length, 'items');
          console.log('📊 First few items with purchasedQuantity:', result.data.picklist.slice(0, 5).map((item, idx) => ({
            index: idx,
            purchasedQuantity: item.purchasedQuantity,
            isChecked: item.isChecked,
            quantity: item.quantity
          })));
          setCurrentPicklist(result.data.picklist);
          
          // Update checked items state from database
          const dbCheckedIndices = new Set();
          const newPartialQuantities = new Map();
          result.data.picklist.forEach((item, index) => {
            if (isItemChecked(item)) {
              dbCheckedIndices.add(index);
            }
            if (item.purchasedQuantity && item.purchasedQuantity > 0) {
              newPartialQuantities.set(index, item.purchasedQuantity);
            }
          });
          setCheckedItems(dbCheckedIndices);
          setPartialQuantities(newPartialQuantities);
        }
      } catch (error) {
        console.error('Error refreshing picklist data:', error);
      }
    });

    // Handle errors from WebSocket
    const unsubscribeError = subscribe('error', (data) => {
      console.error('WebSocket error:', data.message);
      // Optionally show user-friendly error message
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeError();
    };
  }, [shareId, subscribe]);

  // Update connection status display
  useEffect(() => {
    if (!shareId) {
      setConnectionStatus('');
      return;
    }

    if (connectionError) {
      setConnectionStatus('Connection failed');
    } else if (isConnected) {
      setConnectionStatus('Connected - Real-time updates active');
    } else {
      setConnectionStatus('Connecting...');
    }
  }, [shareId, isConnected, connectionError]);

  // Load checked items - from database for shared lists, localStorage for local lists
  useEffect(() => {
    if (shareId) {
      // For shared lists, calculate checked state from quantities
      const checkedIndices = new Set();
      if (currentPicklist) {
        currentPicklist.forEach((item, index) => {
          if (isItemChecked(item)) {
            checkedIndices.add(index);
          }
        });
        setCheckedItems(checkedIndices);
      }
    } else {
      // For local lists, use localStorage
      const storageKey = 'shopping-list-checked';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const savedSet = new Set(JSON.parse(saved));
          setCheckedItems(savedSet);
        } catch (error) {
          console.error('Error loading saved checked items:', error);
        }
      }
    }
  }, [shareId, currentPicklist]);

  // Group items by supplier and calculate costs
  useEffect(() => {
    if (!currentPicklist || currentPicklist.length === 0) return;

    const grouped = {};
    let total = 0;
    let checked = 0;

    currentPicklist.forEach((item, index) => {
      const supplier = item.selectedSupplier || 'back order';
      if (!grouped[supplier]) {
        grouped[supplier] = [];
      }
      
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const purchasedQty = getPurchasedQuantity(index);
      const remainingQty = getRemainingQuantity(item, index);
      
      if (isPartiallyPurchased(item, index)) {
        // Split into purchased (checked) and remaining (unchecked) portions
        
        // Purchased portion (checked)
        if (purchasedQty > 0) {
          const purchasedItem = {
            ...item,
            index: index,
            quantity: purchasedQty,
            totalPrice: (unitPrice * purchasedQty).toFixed(2),
            isPurchasedPortion: true
          };
          grouped[supplier].push(purchasedItem);
        }
        
        // Remaining portion (unchecked)
        if (remainingQty > 0) {
          const remainingItem = {
            ...item,
            index: `${index}_remaining`,
            quantity: remainingQty,
            totalPrice: (unitPrice * remainingQty).toFixed(2),
            isRemainingPortion: true,
            originalIndex: index
          };
          grouped[supplier].push(remainingItem);
        }
        
        // Calculate costs - original total for overall, purchased portion for checked
        const originalPrice = parseFloat(item.totalPrice) || 0;
        const purchasedPrice = unitPrice * purchasedQty;
        total += originalPrice;
        checked += purchasedPrice;
        
      } else {
        // Regular item (not partially purchased)
        const itemWithIndex = { ...item, index };
        grouped[supplier].push(itemWithIndex);

        // Calculate costs
        const price = parseFloat(item.totalPrice) || 0;
        total += price;
        if (isFullyPurchased(item, index) || checkedItems.has(index)) {
          checked += price;
        }
      }
    });

    // Sort suppliers with "back order" at the bottom
    const sortedGrouped = {};
    const entries = Object.entries(grouped).sort(([a], [b]) => {
      if (a === 'back order') return 1;
      if (b === 'back order') return -1;
      return a.localeCompare(b);
    });
    
    entries.forEach(([supplier, items]) => {
      sortedGrouped[supplier] = items;
    });
    
    setGroupedItems(sortedGrouped);
    setTotalCost(total);
    setCheckedCost(checked);
  }, [currentPicklist, checkedItems]);

  // Save checked items to localStorage (only for local lists)
  useEffect(() => {
    if (!shareId) {
      const storageKey = 'shopping-list-checked';
      localStorage.setItem(storageKey, JSON.stringify([...checkedItems]));
    }
  }, [checkedItems, shareId]);

  const handleItemCheck = async (index) => {
    const item = currentPicklist[index];
    const willBeChecked = !checkedItems.has(index) && !isFullyPurchased(item, index);
    const remainingQty = getRemainingQuantity(item, index);
    const purchasedQty = getPurchasedQuantity(index);
    
    
    // If item has remaining quantity > 1, show quantity modal
    if (willBeChecked && remainingQty > 1) {
      setSelectedQuantity(remainingQty); // Default to full quantity
      setQuantityModalData({
        item,
        index,
        maxQuantity: remainingQty,
        currentQuantity: purchasedQty,
        isAdditional: purchasedQty > 0
      });
      setShowQuantityModal(true);
      return;
    }
    
    // For regular items or unchecking, proceed normally
    const newCheckedItems = new Set(checkedItems);
    if (willBeChecked) {
      newCheckedItems.add(index);
    } else {
      newCheckedItems.delete(index);
      // Clear partial quantity when unchecking
      setPartialQuantities(prev => {
        const newMap = new Map(prev);
        newMap.delete(index);
        return newMap;
      });
    }
    setCheckedItems(newCheckedItems);

    // For shared lists, use the dedicated item check API
    if (shareId) {
      try {
        // Send purchased quantity to backend
        const item = currentPicklist[index];
        const totalQuantity = parseInt(item.quantity) || 1;
        const purchasedQuantity = willBeChecked ? totalQuantity : 0;
        
        const response = await fetch(`/api/shopping-list/share/${shareId}/item/${index}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchasedQuantity })
        });

        if (response.ok) {
          console.log(`✅ Synced item ${index} check state to database: ${willBeChecked ? 'checked' : 'unchecked'}`);
          
          // Update the item's purchased quantity in local state
          const result = await response.json();
          if (result.success && result.data) {
            setCurrentPicklist(prev => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                purchasedQuantity: result.data.purchasedQuantity,
                requestedQuantity: result.data.requestedQuantity
              };
              return updated;
            });
          }
          
          // Broadcast update to other clients
          if (broadcastUpdate) {
            broadcastUpdate({
              itemIndex: index,
              checked: willBeChecked,
              timestamp: Date.now(),
              updateType: 'item_check'
            });
            console.log(`📡 Broadcasted item ${index} check state to other clients`);
          }
        } else {
          console.error(`❌ Failed to sync item ${index} check state to database`);
          // Revert local state on failure
          setCheckedItems(checkedItems);
        }
      } catch (error) {
        console.error('Error syncing item check state:', error);
        // Revert local state on failure
        setCheckedItems(checkedItems);
      }
    } else {
      // For non-shared lists, just update localStorage (existing behavior)
      console.log(`💾 Saved item ${index} check state to localStorage: ${willBeChecked ? 'checked' : 'unchecked'}`);
    }
  };

  const handleClearAll = async () => {
    if (confirm('Clear all checked items?')) {
      const previousCheckedItems = new Set(checkedItems);
      
      // Clear local state immediately
      setCheckedItems(new Set());

      // For shared lists, update each item individually via API
      if (shareId) {
        let allSuccessful = true;
        
        try {
          // Update each checked item in the database
          const updatePromises = Array.from(previousCheckedItems).map(async (index) => {
            const response = await fetch(`/api/shopping-list/share/${shareId}/item/${index}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ purchasedQuantity: 0 })
            });
            
            // Update local state with the response data
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                setCurrentPicklist(prev => {
                  const updated = [...prev];
                  updated[index] = {
                    ...updated[index],
                    purchasedQuantity: result.data.purchasedQuantity,
                    requestedQuantity: result.data.requestedQuantity
                  };
                  return updated;
                });
              }
            }
            
            return response.ok;
          });

          const results = await Promise.all(updatePromises);
          allSuccessful = results.every(success => success);

          if (allSuccessful) {
            console.log(`✅ Cleared all ${previousCheckedItems.size} checked items in database`);
            
            // Broadcast update to other clients
            if (broadcastUpdate) {
              broadcastUpdate({
                itemIndex: null, // Multiple items
                timestamp: Date.now(),
                updateType: 'clear_all'
              });
              console.log(`📡 Broadcasted clear all to other clients`);
            }
          } else {
            console.error(`❌ Failed to clear some checked items`);
            // Revert local state on failure
            setCheckedItems(previousCheckedItems);
          }
        } catch (error) {
          console.error('Error clearing checked items:', error);
          // Revert local state on failure
          setCheckedItems(previousCheckedItems);
        }
      } else {
        // For non-shared lists, localStorage is already updated by useEffect
        console.log(`💾 Cleared all ${previousCheckedItems.size} checked items in localStorage`);
      }
    }
  };

  const handleCheckAllSupplier = async (supplierItems) => {
    const newCheckedItems = new Set(checkedItems);
    const allChecked = supplierItems.every(item => newCheckedItems.has(item.index));
    const willBeChecked = !allChecked;
    
    // Update local state immediately
    supplierItems.forEach(item => {
      if (willBeChecked) {
        newCheckedItems.add(item.index);
      } else {
        newCheckedItems.delete(item.index);
      }
    });
    setCheckedItems(newCheckedItems);

    // For shared lists, update each item individually via API
    if (shareId) {
      let allSuccessful = true;
      
      try {
        // Update each item in the database
        const updatePromises = supplierItems.map(async (item) => {
          // Calculate purchased quantity based on checked state
          const itemData = currentPicklist[item.index];
          const totalQuantity = parseInt(itemData.quantity) || 1;
          const purchasedQuantity = willBeChecked ? totalQuantity : 0;
          
          const response = await fetch(`/api/shopping-list/share/${shareId}/item/${item.index}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchasedQuantity })
          });
          
          // Update local state with the response data
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              setCurrentPicklist(prev => {
                const updated = [...prev];
                updated[item.index] = {
                  ...updated[item.index],
                  purchasedQuantity: result.data.purchasedQuantity,
                  requestedQuantity: result.data.requestedQuantity
                };
                return updated;
              });
            }
          }
          
          return response.ok;
        });

        const results = await Promise.all(updatePromises);
        allSuccessful = results.every(success => success);

        if (allSuccessful) {
          console.log(`✅ ${willBeChecked ? 'Checked' : 'Unchecked'} ${supplierItems.length} supplier items in database`);
          
          // Broadcast update to other clients
          if (broadcastUpdate) {
            broadcastUpdate({
              itemIndex: null, // Multiple items
              timestamp: Date.now(),
              updateType: 'supplier_check',
              checked: willBeChecked
            });
            console.log(`📡 Broadcasted supplier ${willBeChecked ? 'check' : 'uncheck'} to other clients`);
          }
        } else {
          console.error(`❌ Failed to ${willBeChecked ? 'check' : 'uncheck'} some supplier items`);
          // Revert local state on failure
          setCheckedItems(checkedItems);
        }
      } catch (error) {
        console.error(`Error ${willBeChecked ? 'checking' : 'unchecking'} supplier items:`, error);
        // Revert local state on failure
        setCheckedItems(checkedItems);
      }
    } else {
      // For non-shared lists, localStorage is already updated by useEffect
      console.log(`💾 ${willBeChecked ? 'Checked' : 'Unchecked'} ${supplierItems.length} supplier items in localStorage`);
    }
  };

  const getItemsCount = () => {
    const total = currentPicklist.length;
    const checked = checkedItems.size;
    return { total, checked, remaining: total - checked };
  };

  const toggleSupplierCollapse = (supplier) => {
    setCollapsedSuppliers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(supplier)) {
        newSet.delete(supplier);
      } else {
        newSet.add(supplier);
      }
      return newSet;
    });
  };

  const handleQuantitySelection = async () => {
    if (!quantityModalData) return;
    
    const { index, currentQuantity, isAdditional } = quantityModalData;
    const item = currentPicklist[index];
    const originalQuantity = parseInt(item.quantity) || 1;
    
    // Calculate new total purchased quantity
    const newTotalPurchased = isAdditional ? currentQuantity + selectedQuantity : selectedQuantity;
    
    
    // Store the partial quantity
    setPartialQuantities(prev => {
      const newMap = new Map(prev);
      if (newTotalPurchased >= originalQuantity) {
        // If all items purchased, remove from partial quantities
        newMap.delete(index);
      } else {
        newMap.set(index, newTotalPurchased);
      }
      return newMap;
    });
    
    // Only mark item as checked if full quantity was selected
    const newCheckedItems = new Set(checkedItems);
    if (newTotalPurchased >= originalQuantity) {
      newCheckedItems.add(index);
    } else {
      newCheckedItems.delete(index); // Keep unchecked for partial quantities
    }
    setCheckedItems(newCheckedItems);
    
    // Sync to database for shared lists
    if (shareId) {
      try {
        console.log(`🔍 Sending to database: purchasedQuantity=${newTotalPurchased} for item ${index}`);
        
        const response = await fetch(`/api/shopping-list/share/${shareId}/item/${index}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ purchasedQuantity: newTotalPurchased })
        });

        if (response.ok) {
          console.log(`✅ Synced item ${index} check state to database with partial quantity ${selectedQuantity}/${quantityModalData?.maxQuantity}`);
          
          // Broadcast update to other clients
          if (broadcastUpdate) {
            broadcastUpdate({
              itemIndex: index,
              checked: true,
              partialQuantity: selectedQuantity,
              timestamp: Date.now(),
              updateType: 'item_check'
            });
          }
        } else {
          console.error('❌ Failed to sync item check state to database');
          // Revert local state on failure
          newCheckedItems.delete(index);
          setCheckedItems(newCheckedItems);
          setPartialQuantities(prev => {
            const newMap = new Map(prev);
            newMap.delete(index);
            return newMap;
          });
        }
      } catch (error) {
        console.error('❌ Error syncing item check state:', error);
        // Revert local state on error
        newCheckedItems.delete(index);
        setCheckedItems(newCheckedItems);
        setPartialQuantities(prev => {
          const newMap = new Map(prev);
          newMap.delete(index);
          return newMap;
        });
      }
    } else {
      // For main lists, store in localStorage
      const storageKey = `checkedItems_main`;
      localStorage.setItem(storageKey, JSON.stringify([...newCheckedItems]));
    }
    
    // Close modal
    setShowQuantityModal(false);
    setQuantityModalData(null);
    setSelectedQuantity(1);
  };

  const handleSupplierNotAvailable = async (item, index) => {
    if (switchingSupplier.has(index)) return;

    setSwitchingSupplier(prev => new Set(prev).add(index));

    // Use unified sync manager
    const result = await syncPicklistData(
      prevPicklist => {
        const newPicklist = [...prevPicklist];
        newPicklist[index] = {
          ...newPicklist[index],
          selectedSupplier: 'back order',
          unitPrice: '',
          totalPrice: 'N/A'
        };
        return newPicklist;
      },
      { 
        broadcastToOthers: true, 
        itemIndex: index 
      }
    );

    if (result.success) {
      console.log(`✅ Moved "${item.originalItem}" to back order`);
    } else {
      console.error(`❌ Failed to move "${item.originalItem}" to back order`);
    }
    
    // Remove from switching state
    setSwitchingSupplier(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleManualSupplierSelection = async (selectedSupplier, selectedPrice) => {
    if (!supplierModalData) return;

    const { item, index } = supplierModalData;
    setSwitchingSupplier(prev => new Set(prev).add(index));

    try {
      const response = await fetch(`/api/items/${item.matchedItemId}/select-supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          selectedSupplier: selectedSupplier,
          selectedPrice: selectedPrice
        })
      });

      const result = await response.json();

      if (result.success) {
        const newTotalPrice = (result.supplier.price * item.quantity).toFixed(2);
        
        // Use unified sync manager
        const syncResult = await syncPicklistData(
          prevPicklist => {
            const newPicklist = [...prevPicklist];
            newPicklist[index] = {
              ...newPicklist[index],
              selectedSupplier: result.supplier.name,
              unitPrice: result.supplier.price,
              totalPrice: newTotalPrice
            };
            return newPicklist;
          },
          { 
            broadcastToOthers: true, 
            itemIndex: index 
          }
        );

        if (syncResult.success) {
          console.log(`✅ Manually switched supplier for "${item.originalItem}" to ${result.supplier.name} ($${result.supplier.price})`);
        } else {
          console.error(`❌ Failed to update supplier for "${item.originalItem}"`);
        }
        
        // Close modal
        setShowSupplierModal(false);
        setSupplierModalData(null);
      } else {
        alert(result.error || 'Unable to select supplier');
      }
    } catch (error) {
      console.error('Error selecting supplier:', error);
      alert('Network error while selecting supplier');
    } finally {
      setSwitchingSupplier(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const handleNoSupplier = async () => {
    if (!supplierModalData) return;

    const { index } = supplierModalData;
    
    // Use unified sync manager
    const result = await syncPicklistData(
      prevPicklist => {
        const newPicklist = [...prevPicklist];
        newPicklist[index] = {
          ...newPicklist[index],
          selectedSupplier: 'back order',
          unitPrice: 'No price found',
          totalPrice: 'N/A'
        };
        return newPicklist;
      },
      { 
        broadcastToOthers: true, 
        itemIndex: index 
      }
    );

    if (result.success) {
      console.log(`✅ Marked item ${index} as "No supplier found"`);
    } else {
      console.error(`❌ Failed to mark item ${index} as no supplier`);
    }

    // Close modal
    setShowSupplierModal(false);
    setSupplierModalData(null);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      // First, ensure we have the latest state saved (for non-shared lists)
      if (!shareId) {
        await syncPicklistData(prevPicklist => prevPicklist, { suppressWebSocket: true });
      }

      const response = await fetch('/api/shopping-list/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          picklist: currentPicklist,
          title: listTitle
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setShareUrl(result.shareUrl);
        setShowShareOptions(true);
        console.log('Created shared list with current state including all supplier changes');
      } else {
        alert('Failed to create shareable link: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Network error while creating shareable link');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
      setShowShareOptions(false);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          alert('Link copied to clipboard!');
        } else {
          // If copy failed, show the URL for manual copying
          alert(`Please copy this link manually:\n\n${shareUrl}`);
        }
      } catch (fallbackError) {
        // Final fallback - show URL for manual copying
        alert(`Please copy this link manually:\n\n${shareUrl}`);
      }
      setShowShareOptions(false);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listTitle,
          text: `Check out this shopping list: ${listTitle}`,
          url: shareUrl
        });
        setShowShareOptions(false);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share error:', error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Show loading state while data is being fetched
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading Shopping List</h2>
          <p className="text-gray-600">Please wait while we load your shopping list...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Shopping List Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">This could happen if:</p>
            <ul className="text-sm text-gray-500 text-left space-y-1">
              <li>• The link has expired (24 hour limit)</li>
              <li>• The link was mistyped</li>
              <li>• The list was deleted</li>
            </ul>
          </div>
          <button
            onClick={onBack}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!currentPicklist || currentPicklist.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
          <div className="text-red-500 text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Shopping List</h2>
          <p className="text-gray-600 mb-6">No picklist data available for shopping.</p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
          >
            ← Back to Picklist
          </button>
        </div>
      </div>
    );
  }

  const stats = getItemsCount();
  const progressPercent = stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Shared List Header Banner */}
      {shareId && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="text-center">
            <div className="text-sm text-blue-600">📤 Shared Shopping List</div>
            <div className="text-xs text-blue-500">
              Real-time collaboration active
            </div>
          </div>
        </div>
      )}

      {/* Header - Fixed */}
      <div className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back {shareId ? 'to Main App' : 'to Picklist'}
            </button>
            <h1 className="text-lg font-bold text-gray-900">Shopping List</h1>
            <div className="flex items-center gap-2">
              {!shareId && (
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                >
                  {isSharing ? '⏳' : '📤'} Share
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
                disabled={checkedItems.size === 0}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
              <span>{stats.checked} of {stats.total} items</span>
              <span>{progressPercent}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-600">
              <span className="line-through">${checkedCost.toFixed(2)}</span>
              <span className="ml-2 text-gray-800">${(totalCost - checkedCost).toFixed(2)} remaining</span>
            </div>
            <div className="text-gray-800 font-medium">
              Total: ${totalCost.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Options Bar */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            Show completed items
          </label>
          
          {/* Connection Status for Shared Lists */}
          {shareId && connectionStatus && (
            <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
              isConnected 
                ? 'bg-green-100 text-green-700' 
                : connectionError 
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected 
                  ? 'bg-green-500' 
                  : connectionError 
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`}></div>
              {isConnected ? 'Live' : connectionError ? 'Offline' : 'Connecting'}
            </div>
          )}
        </div>
      </div>

      {/* Shopping List Content */}
      <div className="px-4 py-4 pb-20">
        {Object.entries(groupedItems).map(([supplier, items]) => {
          const supplierChecked = items.filter(item => checkedItems.has(item.index)).length;
          const supplierTotal = items.length;
          const allChecked = supplierChecked === supplierTotal;
          const someChecked = supplierChecked > 0;
          const isCollapsed = collapsedSuppliers.has(supplier);

          return (
            <div key={supplier} className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
              {/* Supplier Header */}
              <div className="bg-gray-50 border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      onClick={() => handleCheckAllSupplier(items)}
                      className="mr-3 focus:outline-none"
                    >
                      <div className={`w-6 h-6 border-2 rounded flex items-center justify-center cursor-pointer ${
                        allChecked 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : someChecked 
                          ? 'bg-blue-100 border-blue-600' 
                          : 'border-gray-300'
                      }`}>
                        {allChecked && '✓'}
                        {someChecked && !allChecked && '-'}
                      </div>
                    </button>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{supplier}</h3>
                      <p className="text-sm text-gray-600">
                        {supplierChecked}/{supplierTotal} items
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-gray-600">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </div>
                    <button
                      onClick={() => toggleSupplierCollapse(supplier)}
                      className="p-1 hover:bg-gray-200 rounded-md transition-colors focus:outline-none"
                      title={isCollapsed ? 'Expand supplier' : 'Collapse supplier'}
                    >
                      <div className={`transform transition-transform duration-200 ${
                        isCollapsed ? 'rotate-0' : 'rotate-90'
                      }`}>
                        ▶
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List - Collapsible */}
              {!isCollapsed && (
                <div className="divide-y divide-gray-100">
                  {items
                    .filter(item => showCompleted || !checkedItems.has(item.index) || item.isRemainingPortion)
                    .map((item) => {
                      const isChecked = item.isPurchasedPortion || 
                        (item.isRemainingPortion ? false : (isFullyPurchased(item, item.index) || checkedItems.has(item.index)));
                      return (
                        <div
                          key={item.index}
                          className={`px-4 py-3 transition-all duration-200 ${
                            isChecked ? 'bg-gray-50 opacity-75' : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => handleItemCheck(item.isRemainingPortion ? item.originalIndex : item.index)}
                        >
                          <div className="flex items-start space-x-3">
                            {/* Checkbox */}
                            <div className="flex-shrink-0 mt-1">
                              <div className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                isChecked 
                                  ? 'bg-green-500 border-green-500 text-white' 
                                  : 'border-gray-300 hover:border-green-400'
                              }`}>
                                {isChecked && '✓'}
                              </div>
                            </div>

                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 mr-2">
                                  <h4 className={`text-sm font-medium leading-5 ${
                                    isChecked ? 'line-through text-gray-500' : 'text-gray-900'
                                  }`}>
                                    {item.originalItem || item.item}
                                  </h4>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className={`text-sm font-medium ${
                                    isChecked ? 'line-through text-gray-500' : 'text-gray-900'
                                  }`}>
                                    {typeof item.unitPrice === 'number' 
                                      ? `$${item.unitPrice.toFixed(2)}` 
                                      : item.unitPrice}
                                  </div>
                                  <div className={`text-xs ${
                                    isChecked ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Qty: {item.quantity}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <div className={`text-xs ${
                                  isChecked ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  Total: {item.totalPrice !== 'N/A' ? `$${item.totalPrice}` : 'N/A'}
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Not Available Button */}
                                  {!isChecked && item.matchedItemId && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSupplierNotAvailable(item, item.index);
                                      }}
                                      disabled={switchingSupplier.has(item.index)}
                                      className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                                        switchingSupplier.has(item.index)
                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                                      }`}
                                      title="Move this item to back order"
                                    >
                                      {switchingSupplier.has(item.index) ? '⏳ Moving...' : '📦 Back Order'}
                                    </button>
                                  )}
                                  {isChecked && (
                                    <div className="text-xs text-green-600 font-medium">
                                      ✓ Purchased
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Share Options Modal */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Share Shopping List</h3>
                <button
                  onClick={() => setShowShareOptions(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Share this shopping list with others. The link will expire in 24 hours.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 break-all">
                  {shareUrl}
                </div>
              </div>

              <div className="space-y-3">
                {navigator.share && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    📤 Share via Apps
                  </button>
                )}
                
                <button
                  onClick={handleCopyLink}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  📋 Copy Link
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500 text-center">
                Recipients can check off items independently
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {stats.checked === stats.total && stats.total > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-20">
          <div className="text-center">
            <div className="text-2xl mb-2">🎉</div>
            <div className="font-semibold">Shopping Complete!</div>
            <div className="text-sm opacity-90">
              All {stats.total} items have been purchased
            </div>
          </div>
        </div>
      )}

      {/* Supplier Selection Modal */}
      {showSupplierModal && supplierModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select Alternative Supplier</h3>
                <button
                  onClick={() => {
                    setShowSupplierModal(false);
                    setSupplierModalData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Item:</strong> {supplierModalData.item.originalItem}
                </p>
                <p className="text-sm text-orange-600 mb-4">
                  No higher-priced suppliers available. Please select an alternative or mark as "back order".
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-gray-900">Available Suppliers:</h4>
                {supplierModalData.availableSuppliers.map((supplier, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleManualSupplierSelection(supplier.name, supplier.price)}
                    disabled={supplier.isCurrent}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      supplier.isCurrent
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {supplier.name}
                          {supplier.isCurrent && ' (Current)'}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        ${supplier.price.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleNoSupplier}
                  className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Mark as "No Supplier Found"
                </button>
                
                <button
                  onClick={() => {
                    setShowSupplierModal(false);
                    setSupplierModalData(null);
                  }}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500 text-center">
                Changes will be synced to all users in shared lists
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Selection Modal */}
      {showQuantityModal && quantityModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select Quantity</h3>
                <button
                  onClick={() => {
                    setShowQuantityModal(false);
                    setQuantityModalData(null);
                    setSelectedQuantity(1);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Item:</strong> {quantityModalData.item.originalItem}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {quantityModalData.isAdditional 
                    ? `How many additional items did you get? (Already have ${quantityModalData.currentQuantity})`
                    : `How many of the ${quantityModalData.maxQuantity} items did you actually get?`
                  }
                </p>
              </div>

              {/* Quantity Input Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-gray-700">Quantity:</label>
                  <span className="text-sm text-gray-500">Max: {quantityModalData.maxQuantity}</span>
                </div>
                
                {/* Number Input with Controls */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                    className="p-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={selectedQuantity <= 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  
                  <input
                    type="number"
                    min="1"
                    max={quantityModalData.maxQuantity}
                    value={selectedQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setSelectedQuantity(Math.min(quantityModalData.maxQuantity, Math.max(1, value)));
                    }}
                    className="w-20 px-3 py-2 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  <button
                    onClick={() => setSelectedQuantity(Math.min(quantityModalData.maxQuantity, selectedQuantity + 1))}
                    className="p-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={selectedQuantity >= quantityModalData.maxQuantity}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>

                {/* Quick Select Options */}
                {quantityModalData.maxQuantity > 5 && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[1, Math.ceil(quantityModalData.maxQuantity * 0.25), Math.ceil(quantityModalData.maxQuantity * 0.5), quantityModalData.maxQuantity].filter((qty, index, arr) => arr.indexOf(qty) === index).map((qty) => (
                      <button
                        key={qty}
                        onClick={() => setSelectedQuantity(qty)}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          selectedQuantity === qty 
                            ? 'bg-blue-100 border-blue-300 text-blue-700' 
                            : 'hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {qty === 1 ? '1' : qty === quantityModalData.no ? 'All' : qty}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Confirmation Button */}
                <button
                  onClick={handleQuantitySelection}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mb-3"
                >
                  Select {selectedQuantity} item{selectedQuantity > 1 ? 's' : ''}
                </button>
              </div>

              <button
                onClick={() => {
                  setShowQuantityModal(false);
                  setQuantityModalData(null);
                  setSelectedQuantity(1);
                }}
                className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>

              <div className="mt-4 text-xs text-gray-500 text-center">
                Your selection will be synced to all users in shared lists
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShoppingList;