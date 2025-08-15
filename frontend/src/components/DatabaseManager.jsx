import React, { useState, useEffect } from 'react';

const DatabaseManager = ({ onBack }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form states
    const [newSupplier, setNewSupplier] = useState({ name: '' });
    const [newItem, setNewItem] = useState({
        description: '',
        supplier: '',
        price: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/api/suppliers');
            if (response.ok) {
                const data = await response.json();
                setSuppliers(data.suppliers || []);
            }
        } catch (err) {
            console.error('Error fetching suppliers:', err);
        }
    };

    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (!newSupplier.name.trim()) {
            setError('Supplier name is required');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/suppliers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newSupplier.name.trim() }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`Supplier "${newSupplier.name}" added successfully! 🎉`);
                setNewSupplier({ name: '' });
                fetchSuppliers(); // Refresh supplier list
            } else {
                setError(data.error || 'Failed to add supplier');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.description.trim() || !newItem.supplier || !newItem.price) {
            setError('All fields are required for adding items');
            return;
        }

        const price = parseFloat(newItem.price);
        if (isNaN(price) || price <= 0) {
            setError('Price must be a valid positive number');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: newItem.description.trim(),
                    supplier: newItem.supplier,
                    price: price
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`Item "${newItem.description}" added successfully! 🎉`);
                setNewItem({ description: '', supplier: '', price: '' });
            } else {
                setError(data.error || 'Failed to add item');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <button 
                            className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            onClick={onBack}
                        >
                            ← Back to Upload
                        </button>
                        <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
                            🗄️ Database Management
                        </h2>
                        <p className="text-lg text-white opacity-90">
                            Add new suppliers and items to the database
                        </p>
                    </div>

                    {/* Alert Messages */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                            <span className="text-red-500">⚠️</span>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                            <span className="text-green-500">✅</span>
                            {success}
                        </div>
                    )}

                    {/* Forms Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Add Supplier Form */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                🏪 Add New Supplier
                            </h3>
                            <form onSubmit={handleAddSupplier} className="space-y-4">
                                <div>
                                    <label htmlFor="supplierName" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Supplier Name:
                                    </label>
                                    <input
                                        type="text"
                                        id="supplierName"
                                        value={newSupplier.name}
                                        onChange={(e) => setNewSupplier({ name: e.target.value })}
                                        placeholder="Enter supplier name (e.g., ACME Corp)"
                                        disabled={loading}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading || !newSupplier.name.trim()}
                                    className="w-full gradient-bg text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="spinner"></span>
                                            Adding...
                                        </span>
                                    ) : (
                                        '➕ Add Supplier'
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Add Item Form */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                📦 Add New Item
                            </h3>
                            <form onSubmit={handleAddItem} className="space-y-4">
                                <div>
                                    <label htmlFor="itemDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Item Description:
                                    </label>
                                    <input
                                        type="text"
                                        id="itemDescription"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        placeholder="Enter item description (e.g., OPI Nail Polish 0.5 fl oz - Red)"
                                        disabled={loading}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="itemSupplier" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Supplier:
                                    </label>
                                    <select
                                        id="itemSupplier"
                                        value={newItem.supplier}
                                        onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                                        disabled={loading}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select a supplier</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.name}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="itemPrice" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Price (USD):
                                    </label>
                                    <input
                                        type="number"
                                        id="itemPrice"
                                        value={newItem.price}
                                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        disabled={loading}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading || !newItem.description.trim() || !newItem.supplier || !newItem.price}
                                    className="w-full gradient-green text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="spinner"></span>
                                            Adding...
                                        </span>
                                    ) : (
                                        '➕ Add Item'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Current Suppliers List */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            📋 Current Suppliers ({suppliers.length})
                        </h3>
                        {suppliers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-4">🤷‍♂️</div>
                                <p>No suppliers found. Add your first supplier above!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {suppliers.map((supplier) => (
                                    <div 
                                        key={supplier.id} 
                                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md hover:scale-105 transition-all duration-300"
                                    >
                                        <div className="font-semibold text-gray-800 text-lg mb-1">
                                            {supplier.name}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {supplier.product_count || 0} items
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseManager;