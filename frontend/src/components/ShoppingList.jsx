import React, { useState, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';

function ShoppingList({ picklist, onBack, shareId = null }) {
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

  // Initialize WebSocket connection for shared lists
  const { isConnected, connectionError, subscribe, toggleCompleted } = useWebSocket(shareId);

  // Set up WebSocket event handlers for shared lists
  useEffect(() => {
    if (!shareId) return;

    // Handle real-time item toggle updates from other users
    const unsubscribeToggle = subscribe('item_toggled', (data) => {
      const { index, checked } = data;
      console.log('Received real-time update:', data);
      setCheckedItems(prevItems => {
        const newItems = new Set(prevItems);
        if (checked) {
          newItems.add(index);
        } else {
          newItems.delete(index);
        }
        return newItems;
      });
    });

    // Handle errors from WebSocket
    const unsubscribeError = subscribe('error', (data) => {
      console.error('WebSocket error:', data.message);
      // Optionally show user-friendly error message
    });

    return () => {
      unsubscribeToggle();
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
      // For shared lists, the state is loaded from the database via the picklist prop
      // which already includes isChecked state from the API
      const checkedIndices = new Set();
      if (picklist) {
        picklist.forEach((item, index) => {
          if (item.isChecked) {
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
  }, [shareId, picklist]);

  // Group items by supplier and calculate costs
  useEffect(() => {
    if (!picklist || picklist.length === 0) return;

    const grouped = {};
    let total = 0;
    let checked = 0;

    picklist.forEach((item, index) => {
      const supplier = item.selectedSupplier || 'No supplier found';
      if (!grouped[supplier]) {
        grouped[supplier] = [];
      }
      
      const itemWithIndex = { ...item, index };
      grouped[supplier].push(itemWithIndex);

      // Calculate costs
      const price = parseFloat(item.totalPrice) || 0;
      total += price;
      if (checkedItems.has(index)) {
        checked += price;
      }
    });

    setGroupedItems(grouped);
    setTotalCost(total);
    setCheckedCost(checked);
  }, [picklist, checkedItems]);

  // Save checked items to localStorage (only for local lists)
  useEffect(() => {
    if (!shareId) {
      const storageKey = 'shopping-list-checked';
      localStorage.setItem(storageKey, JSON.stringify([...checkedItems]));
    }
  }, [checkedItems, shareId]);

  const handleItemCheck = (index) => {
    const newCheckedItems = new Set(checkedItems);
    const willBeChecked = !newCheckedItems.has(index);
    
    if (willBeChecked) {
      newCheckedItems.add(index);
    } else {
      newCheckedItems.delete(index);
    }
    
    setCheckedItems(newCheckedItems);

    // Send real-time update for shared lists
    if (shareId && toggleCompleted) {
      toggleCompleted({
        index: index,
        checked: willBeChecked,
        timestamp: Date.now()
      });
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all checked items?')) {
      // For shared lists, send WebSocket updates for each checked item
      if (shareId && toggleCompleted && checkedItems.size > 0) {
        checkedItems.forEach(index => {
          toggleCompleted({
            index: index,
            checked: false,
            timestamp: Date.now()
          });
        });
      }
      
      setCheckedItems(new Set());
    }
  };

  const handleCheckAllSupplier = (supplierItems) => {
    const newCheckedItems = new Set(checkedItems);
    const allChecked = supplierItems.every(item => newCheckedItems.has(item.index));
    
    supplierItems.forEach(item => {
      const willBeChecked = !allChecked;
      
      if (allChecked) {
        newCheckedItems.delete(item.index);
      } else {
        newCheckedItems.add(item.index);
      }

      // Send real-time update for each item in shared lists
      if (shareId && toggleCompleted) {
        toggleCompleted({
          index: item.index,
          checked: willBeChecked,
          timestamp: Date.now()
        });
      }
    });
    
    setCheckedItems(newCheckedItems);
  };

  const getItemsCount = () => {
    const total = picklist.length;
    const checked = checkedItems.size;
    return { total, checked, remaining: total - checked };
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const response = await fetch('/api/shopping-list/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          picklist,
          title: listTitle
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setShareUrl(result.shareUrl);
        setShowShareOptions(true);
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
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Link copied to clipboard!');
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

  if (!picklist || picklist.length === 0) {
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
      {/* Header - Fixed */}
      <div className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Picklist
            </button>
            <h1 className="text-lg font-bold text-gray-900">Shopping List</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
              >
                {isSharing ? '⏳' : '📤'} Share
              </button>
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
                    <div>
                      <h3 className="font-semibold text-gray-900">{supplier}</h3>
                      <p className="text-sm text-gray-600">
                        {supplierChecked}/{supplierTotal} items
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-gray-100">
                {items
                  .filter(item => showCompleted || !checkedItems.has(item.index))
                  .map((item) => {
                    const isChecked = checkedItems.has(item.index);
                    return (
                      <div
                        key={item.index}
                        className={`px-4 py-3 transition-all duration-200 ${
                          isChecked ? 'bg-gray-50 opacity-75' : 'bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => handleItemCheck(item.index)}
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
                                {item.matchedDescription && item.matchedDescription !== item.originalItem && (
                                  <p className={`text-xs mt-1 ${
                                    isChecked ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Matched: {item.matchedDescription}
                                  </p>
                                )}
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
                              {isChecked && (
                                <div className="text-xs text-green-600 font-medium">
                                  ✓ Purchased
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
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
    </div>
  );
}

export default ShoppingList;