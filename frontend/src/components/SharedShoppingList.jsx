import React, { useState, useEffect } from 'react';
import ShoppingList from './ShoppingList';

function SharedShoppingList({ shareId, onError }) {
  const [loading, setLoading] = useState(true);
  const [sharedData, setSharedData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shareId) return;

    const fetchSharedList = async () => {
      try {
        const response = await fetch(`/api/shopping-list/share/${shareId}`);
        const result = await response.json();
        
        if (result.success) {
          console.log('Shared shopping list data:', result.data);
          setSharedData(result.data);
        } else {
          setError(result.error || 'Failed to load shopping list');
        }
      } catch (err) {
        console.error('Error fetching shared list:', err);
        setError('Network error while loading shopping list');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedList();
  }, [shareId]);

  const handleBack = () => {
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading Shopping List</h2>
          <p className="text-gray-600">Please wait while we load your shared shopping list...</p>
        </div>
      </div>
    );
  }

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
            onClick={handleBack}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
          >
            Go to Main App
          </button>
        </div>
      </div>
    );
  }

  if (!loading && !sharedData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Data</h2>
          <p className="text-gray-600 mb-6">This shopping list appears to be empty.</p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full"
          >
            Go to Main App
          </button>
        </div>
      </div>
    );
  }

  // Only render ShoppingList when we have data
  if (!loading && sharedData && sharedData.picklist) {
    return (
      <div className="min-h-screen">
        {/* Shared List Header */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="text-center">
            <div className="text-sm text-blue-600">📤 Shared Shopping List</div>
            <div className="text-xs text-blue-500">
              Created {new Date(sharedData.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <ShoppingList
          picklist={sharedData.picklist}
          shareId={shareId}
          onBack={handleBack}
          loading={false}
        />
      </div>
    );
  }

  // If we get here, we're still loading or don't have complete data
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
        <div className="text-6xl mb-4 animate-spin">⏳</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading Shopping List</h2>
        <p className="text-gray-600">Please wait while we load your shared shopping list...</p>
      </div>
    </div>
  );
}

export default SharedShoppingList;