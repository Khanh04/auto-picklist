import React, { useState, useEffect } from 'react';

const DatabaseManager = ({ onBack }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [preferences, setPreferences] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('manage'); // 'manage', 'preferences', or 'import'
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierItems, setSupplierItems] = useState([]);
    const [editingPrice, setEditingPrice] = useState(null); // {supplierId, supplierPriceId, currentPrice}
    const [newSupplierItem, setNewSupplierItem] = useState({ description: '', price: '' }); // For adding items to specific supplier

    // Excel import states
    const [importFile, setImportFile] = useState(null);
    const [importProgress, setImportProgress] = useState(null);
    const [importResults, setImportResults] = useState(null);

    // Form states
    const [newSupplier, setNewSupplier] = useState({ name: '' });
    const [newItem, setNewItem] = useState({
        description: '',
        supplier: '',
        price: ''
    });

    useEffect(() => {
        fetchSuppliers();
        fetchPreferences();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/api/suppliers');
            if (response.ok) {
                const data = await response.json();
                setSuppliers(data.data?.suppliers || data.suppliers || []);
            }
        } catch (err) {
            console.error('Error fetching suppliers:', err);
        }
    };

    const fetchPreferences = async () => {
        try {
            const response = await fetch('/api/preferences/unified');
            if (response.ok) {
                const data = await response.json();
                setPreferences(data.data?.preferences || data.preferences || []);
            }
        } catch (err) {
            console.error('Error fetching preferences:', err);
        }
    };

    const handleDeletePreference = async (id, originalItem) => {
        if (!confirm(`Are you sure you want to delete the preference for "${originalItem}"?`)) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`/api/preferences/unified/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.meta?.message || 'Preference deleted successfully');
                fetchPreferences(); // Refresh preferences list
            } else {
                setError(data.error?.message || 'Failed to delete preference');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSupplierClick = async (supplier) => {
        setSelectedSupplier(supplier);
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/suppliers/${supplier.id}/items`);
            if (response.ok) {
                const data = await response.json();
                setSupplierItems(data.data?.items || data.items || []);
            } else {
                setError('Failed to fetch supplier items');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePriceEdit = (item) => {
        setEditingPrice({
            supplierId: selectedSupplier.id,
            supplierPriceId: item.supplier_price_id,
            currentPrice: item.price
        });
    };

    const handlePriceUpdate = async (newPrice) => {
        if (!editingPrice) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`/api/suppliers/${editingPrice.supplierId}/items/${editingPrice.supplierPriceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ price: newPrice })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Price updated successfully');
                setEditingPrice(null);
                // Refresh supplier items
                handleSupplierClick(selectedSupplier);
            } else {
                setError(data.error || 'Failed to update price');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleItemDelete = async (item) => {
        if (!confirm(`Are you sure you want to remove "${item.description}" from ${selectedSupplier.name}?`)) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`/api/suppliers/${selectedSupplier.id}/items/${item.supplier_price_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message);
                // Refresh supplier items and suppliers list
                handleSupplierClick(selectedSupplier);
                fetchSuppliers();
            } else {
                setError(data.error || 'Failed to delete item');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSupplierItem = async (e) => {
        e.preventDefault();
        if (!newSupplierItem.description.trim() || !newSupplierItem.price) {
            setError('Item description and price are required');
            return;
        }

        const price = parseFloat(newSupplierItem.price);
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
                    description: newSupplierItem.description.trim(),
                    supplier: selectedSupplier.name,
                    price: price
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`Item "${newSupplierItem.description}" added to ${selectedSupplier.name} successfully!`);
                setNewSupplierItem({ description: '', price: '' });
                // Refresh supplier items and suppliers list
                handleSupplierClick(selectedSupplier);
                fetchSuppliers();
            } else {
                setError(data.error || 'Failed to add item');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
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

    const handleExcelImport = async (e) => {
        e.preventDefault();
        
        if (!importFile) {
            setError('Please select an Excel file to import');
            return;
        }

        const formData = new FormData();
        formData.append('file', importFile);

        setLoading(true);
        setError('');
        setSuccess('');
        setImportProgress('Uploading file...');
        setImportResults(null);

        try {
            const response = await fetch('/api/database/import-excel', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                setImportResults(result);
                setSuccess(`Import completed! Added ${result.summary?.itemsAdded || 0} items from ${result.summary?.suppliersAdded || 0} suppliers.`);
                setImportFile(null);
                // Refresh suppliers list
                fetchSuppliers();
            } else {
                setError(result.error || 'Failed to import Excel file');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
            setImportProgress(null);
        }
    };

    const resetImport = () => {
        setImportFile(null);
        setImportProgress(null);
        setImportResults(null);
        setError('');
        setSuccess('');
    };

    const handleExportData = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/database/export-excel', {
                method: 'GET'
            });

            if (response.ok) {
                // Get filename from Content-Disposition header or use default
                const contentDisposition = response.headers.get('Content-Disposition');
                const filename = contentDisposition 
                    ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
                    : `database-export-${new Date().toISOString().split('T')[0]}.xlsx`;

                // Create blob and download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                setSuccess('Database exported successfully! Download should start automatically.');
            } else {
                const result = await response.json();
                setError(result.error || 'Failed to export database');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg relative">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-1/4 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute top-40 right-1/3 w-60 h-60 bg-white/3 rounded-full blur-3xl"></div>
            </div>

            <div className="container mx-auto px-4 py-8 relative z-10">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12 animate-fade-in">
                        <button
                            className="mb-8 inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-2xl border border-white/20 hover:bg-white/30 transition-all duration-300 font-medium transform hover:scale-102"
                            onClick={onBack}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Upload
                        </button>

                        <div className="mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
                                Database Management
                            </h2>
                            <div className="w-24 h-1 bg-white/30 rounded-full mx-auto mb-6"></div>
                        </div>

                        <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed font-medium">
                            Manage suppliers, items, and item matching preferences for optimal picklist generation
                        </p>

                        {/* Tabs */}
                        <div className="flex justify-center mt-10">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-1.5 border border-white/20 inline-flex gap-2">
                                <button
                                    onClick={() => setActiveTab('manage')}
                                    className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                                        activeTab === 'manage'
                                            ? 'bg-white text-primary-600 shadow-soft transform scale-105'
                                            : 'text-white/90 hover:text-white hover:bg-white/10 transform hover:scale-102'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                    </svg>
                                    Manage Data
                                </button>
                                <button
                                    onClick={() => setActiveTab('import')}
                                    className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                                        activeTab === 'import'
                                            ? 'bg-white text-primary-600 shadow-soft transform scale-105'
                                            : 'text-white/90 hover:text-white hover:bg-white/10 transform hover:scale-102'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Import Excel
                                </button>
                                <button
                                    onClick={() => setActiveTab('preferences')}
                                    className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                                        activeTab === 'preferences'
                                            ? 'bg-white text-primary-600 shadow-soft transform scale-105'
                                            : 'text-white/90 hover:text-white hover:bg-white/10 transform hover:scale-102'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                    </svg>
                                    Preferences ({preferences.length})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Alert Messages */}
                    {error && (
                        <div className="status-error px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-slide-up shadow-soft">
                            <div className="w-8 h-8 bg-error-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="font-medium">{error}</div>
                        </div>
                    )}

                    {success && (
                        <div className="status-success px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-slide-up shadow-soft">
                            <div className="w-8 h-8 bg-success-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="font-medium">{success}</div>
                        </div>
                    )}

                    {/* Tab Content */}
                    {activeTab === 'manage' && (
                        <>
                            {/* Forms Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 animate-slide-up">
                                {/* Add Supplier Form */}
                                <div className="card p-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-full -translate-y-16 translate-x-16 opacity-60"></div>
                                    <div className="relative">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-soft">
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                                                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-800">Add New Supplier</h3>
                                        </div>
                                        <form onSubmit={handleAddSupplier} className="space-y-6">
                                            <div>
                                                <label htmlFor="supplierName" className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Supplier Name
                                                </label>
                                                <input
                                                    type="text"
                                                    id="supplierName"
                                                    value={newSupplier.name}
                                                    onChange={(e) => setNewSupplier({ name: e.target.value })}
                                                    placeholder="Enter supplier name (e.g., ACME Corp)"
                                                    disabled={loading}
                                                    required
                                                    className="input-enhanced w-full"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={loading || !newSupplier.name.trim()}
                                                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-primary-200 ${
                                                    loading || !newSupplier.name.trim()
                                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                        : 'gradient-bg text-white hover:scale-105 hover:shadow-large active:scale-[1.02] shadow-soft'
                                                }`}
                                            >
                                                {loading ? (
                                                    <div className="flex items-center justify-center gap-3">
                                                        <span className="spinner w-5 h-5"></span>
                                                        Adding Supplier...
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-3">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                        </svg>
                                                        Add Supplier
                                                    </div>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Add Item Form */}
                                <div className="card p-8 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-secondary-50 to-primary-50 rounded-full -translate-y-16 -translate-x-16 opacity-60"></div>
                                    <div className="relative">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 bg-gradient-to-br from-secondary-500 to-primary-500 rounded-2xl flex items-center justify-center shadow-soft">
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-800">Add New Item</h3>
                                        </div>
                                        <form onSubmit={handleAddItem} className="space-y-6">
                                            <div>
                                                <label htmlFor="itemDescription" className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Item Description
                                                </label>
                                                <input
                                                    type="text"
                                                    id="itemDescription"
                                                    value={newItem.description}
                                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                                    placeholder="Enter item description (e.g., OPI Nail Polish 0.5 fl oz - Red)"
                                                    disabled={loading}
                                                    required
                                                    className="input-enhanced w-full"
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="itemSupplier" className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Supplier
                                                </label>
                                                <select
                                                    id="itemSupplier"
                                                    value={newItem.supplier}
                                                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                                                    disabled={loading}
                                                    required
                                                    className="input-enhanced w-full"
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
                                                <label htmlFor="itemPrice" className="block text-sm font-semibold text-gray-700 mb-3">
                                                    Price (USD)
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-lg">$</span>
                                                    </div>
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
                                                        className="input-enhanced w-full pl-8"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading || !newItem.description.trim() || !newItem.supplier || !newItem.price}
                                                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform focus:outline-none focus:ring-4 focus:ring-success-200 ${
                                                    loading || !newItem.description.trim() || !newItem.supplier || !newItem.price
                                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                        : 'gradient-green text-white hover:scale-105 hover:shadow-large active:scale-[1.02] shadow-soft'
                                                }`}
                                            >
                                                {loading ? (
                                                    <div className="flex items-center justify-center gap-3">
                                                        <span className="spinner w-5 h-5"></span>
                                                        Adding Item...
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-3">
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                        </svg>
                                                        Add Item
                                                    </div>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* Current Suppliers List */}
                            <div className="card p-8 animate-slide-up">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-soft">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-800">Current Suppliers</h3>
                                        <p className="text-gray-600">
                                            {suppliers.length} {suppliers.length === 1 ? 'supplier' : 'suppliers'} configured
                                        </p>
                                    </div>
                                </div>

                                {suppliers.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                                            <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <h4 className="text-xl font-semibold text-gray-700 mb-3">No suppliers yet</h4>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Get started by adding your first supplier using the form above. Suppliers help organize your product catalog and pricing.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {suppliers.map((supplier) => (
                                            <div
                                                key={supplier.id}
                                                onClick={() => handleSupplierClick(supplier)}
                                                className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-medium hover:border-primary-200 transition-all duration-300 cursor-pointer transform hover:scale-102 card-interactive"
                                            >
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl flex items-center justify-center group-hover:from-primary-200 group-hover:to-secondary-200 transition-colors duration-300">
                                                        <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                                                            <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-gray-800 text-lg truncate group-hover:text-primary-700 transition-colors duration-300">
                                                            {supplier.name}
                                                        </h4>
                                                        <p className="text-sm text-gray-500 font-medium">
                                                            {supplier.product_count || 0} {supplier.product_count === 1 ? 'item' : 'items'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-primary-600 font-medium text-sm group-hover:text-primary-700 transition-colors duration-300">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        View Items
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Import Tab */}
                    {activeTab === 'import' && (
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                        📊 Import & Export Data
                                    </h3>
                                    <p className="text-gray-600 mt-2">
                                        Upload an Excel file to bulk import suppliers and items, or export your current database to Excel format.
                                    </p>
                                </div>
                                <button
                                    onClick={handleExportData}
                                    disabled={loading}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner"></span>
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            📤 Export Database
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="border-t border-gray-200 pt-6">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4">📥 Import Excel File</h4>
                                <p className="text-gray-600 mb-6">
                                    The Excel file should have one column for <strong>Item/Product descriptions</strong> and additional columns with <strong>Supplier names</strong> as headers containing price data.
                                </p>

                            {/* Import Form */}
                            <form onSubmit={handleExcelImport} className="mb-8">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                    <div className="mb-4">
                                        <div className="text-6xl mb-4">📋</div>
                                        <h4 className="text-lg font-semibold text-gray-700 mb-2">
                                            Choose Excel File to Import
                                        </h4>
                                        <p className="text-sm text-gray-500 mb-4">
                                            Supported formats: .xlsx, .xls
                                        </p>
                                    </div>
                                    
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={(e) => {
                                            setImportFile(e.target.files[0]);
                                            setError('');
                                            setSuccess('');
                                            setImportResults(null);
                                        }}
                                        disabled={loading}
                                        className="hidden"
                                        id="excel-file-input"
                                    />
                                    
                                    <label 
                                        htmlFor="excel-file-input"
                                        className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                                    >
                                        📁 Select File
                                    </label>
                                    
                                    {importFile && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg inline-block">
                                            <div className="flex items-center gap-2 text-blue-700">
                                                <span>📄</span>
                                                <span className="font-medium">{importFile.name}</span>
                                                <span className="text-sm">
                                                    ({(importFile.size / 1024 / 1024).toFixed(2)} MB)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setImportFile(null);
                                                        resetImport();
                                                    }}
                                                    disabled={loading}
                                                    className="ml-2 text-red-600 hover:text-red-800"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Import Progress */}
                                {importProgress && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="spinner"></span>
                                            <span className="text-blue-700 font-medium">{importProgress}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-4 mt-6">
                                    <button
                                        type="submit"
                                        disabled={!importFile || loading}
                                        className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="spinner"></span>
                                                Importing...
                                            </span>
                                        ) : (
                                            '📊 Import Data'
                                        )}
                                    </button>
                                    
                                    {(importFile || importResults) && (
                                        <button
                                            type="button"
                                            onClick={resetImport}
                                            disabled={loading}
                                            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 disabled:bg-gray-400 transition-colors"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </form>

                            {/* Import Results */}
                            {importResults && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                    <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                                        ✅ Import Results
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div className="bg-white p-4 rounded-lg border border-green-200">
                                            <div className="text-2xl font-bold text-green-600">
                                                {importResults.summary?.itemsAdded || 0}
                                            </div>
                                            <div className="text-sm text-green-700">Items Added</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border border-green-200">
                                            <div className="text-2xl font-bold text-green-600">
                                                {importResults.summary?.suppliersAdded || 0}
                                            </div>
                                            <div className="text-sm text-green-700">New Suppliers</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border border-green-200">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {importResults.summary?.totalRows || 0}
                                            </div>
                                            <div className="text-sm text-blue-700">Total Rows Processed</div>
                                        </div>
                                    </div>

                                    {importResults.errors && importResults.errors.length > 0 && (
                                        <div className="mt-4">
                                            <h5 className="font-semibold text-red-700 mb-2">
                                                ⚠️ Errors ({importResults.errors.length}):
                                            </h5>
                                            <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded p-3">
                                                {importResults.errors.map((error, index) => (
                                                    <div key={index} className="text-sm text-red-600 mb-1">
                                                        Row {error.row}: {error.message}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {importResults.warnings && importResults.warnings.length > 0 && (
                                        <div className="mt-4">
                                            <h5 className="font-semibold text-yellow-700 mb-2">
                                                ⚠️ Warnings ({importResults.warnings.length}):
                                            </h5>
                                            <div className="max-h-40 overflow-y-auto bg-yellow-50 border border-yellow-200 rounded p-3">
                                                {importResults.warnings.map((warning, index) => (
                                                    <div key={index} className="text-sm text-yellow-600 mb-1">
                                                        Row {warning.row}: {warning.message}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            </div>

                            {/* Export Info */}
                            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-green-800 mb-4">
                                    📤 Export Database
                                </h4>
                                <p className="text-green-700 mb-4">
                                    Export your current database to an Excel file in the same price matrix format used for imports. 
                                    This creates a backup of your data or allows you to edit prices externally and re-import.
                                </p>
                                <div className="text-sm text-green-600">
                                    <strong>📋 Export Features:</strong>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Same format as import: items in rows, suppliers in columns</li>
                                        <li>All current suppliers and products included</li>
                                        <li>Auto-sized columns for easy viewing</li>
                                        <li>Date-stamped filename for organization</li>
                                        <li>Can be used to backup data before imports</li>
                                        <li>Compatible with the import functionality</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Format Guide */}
                            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-blue-800 mb-4">
                                    📋 Excel File Format Guide
                                </h4>
                                <p className="text-blue-700 mb-4">
                                    Your Excel file should be structured as a price matrix with items in rows and suppliers in columns. 
                                    Use the <strong>Export Database</strong> button above to see the exact format expected.
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse bg-white text-sm">
                                        <thead>
                                            <tr className="bg-blue-100">
                                                <th className="border border-blue-300 p-2 text-left font-semibold text-blue-800">Item/Product/Description</th>
                                                <th className="border border-blue-300 p-2 text-left font-semibold text-blue-800">BEAUTY ZONE</th>
                                                <th className="border border-blue-300 p-2 text-left font-semibold text-blue-800">SKYLINE</th>
                                                <th className="border border-blue-300 p-2 text-left font-semibold text-blue-800">KAREN</th>
                                                <th className="border border-blue-300 p-2 text-left font-semibold text-blue-800">...</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border border-blue-300 p-2 font-medium">OPI Nail Polish 0.5 fl oz - Red</td>
                                                <td className="border border-blue-300 p-2 text-center">2.50</td>
                                                <td className="border border-blue-300 p-2 text-center">2.75</td>
                                                <td className="border border-blue-300 p-2 text-center">3.00</td>
                                                <td className="border border-blue-300 p-2 text-center">...</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-blue-300 p-2 font-medium">DND Gel Polish UV/LED</td>
                                                <td className="border border-blue-300 p-2 text-center">3.96</td>
                                                <td className="border border-blue-300 p-2 text-center"></td>
                                                <td className="border border-blue-300 p-2 text-center">4.20</td>
                                                <td className="border border-blue-300 p-2 text-center">...</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-blue-300 p-2 font-medium">Essie Nail Polish</td>
                                                <td className="border border-blue-300 p-2 text-center">3.15</td>
                                                <td className="border border-blue-300 p-2 text-center">3.25</td>
                                                <td className="border border-blue-300 p-2 text-center">3.50</td>
                                                <td className="border border-blue-300 p-2 text-center">...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 text-sm text-blue-600">
                                    <strong>💡 Format Requirements:</strong>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>First column must contain item/product descriptions</li>
                                        <li>Column headers should be supplier names (case-sensitive)</li>
                                        <li>Prices should be numbers only ($ symbol will be stripped automatically)</li>
                                        <li>Empty price cells are ignored (item won't be added for that supplier)</li>
                                        <li><strong>⚠️ Warning: This will replace all existing data in the database</strong></li>
                                        <li>Duplicate items with same description will be merged</li>
                                        <li>Text in brackets [like this] and asterisks *like this* will be normalized</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                Item Matching Preferences
                            </h3>
                            <p className="text-gray-600 mb-6">
                                These are learned product matching preferences from your previous manual selections. 
                                The system will automatically match these products in future uploads and default to the lowest price supplier.
                            </p>
                            
                            {preferences.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <div className="text-6xl mb-4">🤖</div>
                                    <h4 className="text-xl font-semibold mb-2">No Preferences Yet</h4>
                                    <p className="max-w-md mx-auto">
                                        Preferences are created automatically when you manually select item matches 
                                        in the picklist preview and export them. The system learns from your choices!
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Original Item</th>
                                                <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Matched Product</th>
                                                <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Preferred Supplier</th>
                                                <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Used</th>
                                                <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Last Used</th>
                                                <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preferences.map((pref) => (
                                                <tr key={pref.id} className="hover:bg-gray-50">
                                                    <td className="border border-gray-200 p-3">
                                                        <div className="font-medium text-gray-900 max-w-xs">
                                                            {pref.original_item}
                                                        </div>
                                                    </td>
                                                    <td className="border border-gray-200 p-3">
                                                        <div className="text-gray-900 max-w-xs">
                                                            {pref.product_description || 'No description'}
                                                        </div>
                                                    </td>
                                                    <td className="border border-gray-200 p-3">
                                                        <div className="text-gray-900 max-w-xs">
                                                            {pref.supplier_name || 'Unknown supplier'}
                                                        </div>
                                                    </td>
                                                    <td className="border border-gray-200 p-3 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {pref.frequency}x
                                                        </span>
                                                    </td>
                                                    <td className="border border-gray-200 p-3 text-sm text-gray-600">
                                                        {new Date(pref.last_used).toLocaleDateString()}
                                                    </td>
                                                    <td className="border border-gray-200 p-3">
                                                        <button
                                                            onClick={() => handleDeletePreference(pref.id, pref.original_item)}
                                                            disabled={loading}
                                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                                            title="Delete this preference"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Supplier Detail Modal */}
                    {selectedSupplier && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-2xl font-bold">{selectedSupplier.name}</h3>
                                            <p className="text-blue-100">{supplierItems.length} items</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedSupplier(null);
                                                setSupplierItems([]);
                                                setEditingPrice(null);
                                                setNewSupplierItem({ description: '', price: '' });
                                            }}
                                            className="text-white hover:bg-white hover:bg-opacity-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Content */}
                                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                                    {/* Add New Item Form */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Add New Item to {selectedSupplier.name}</h4>
                                        <form onSubmit={handleAddSupplierItem} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="supplierItemDescription" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Item Description
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="supplierItemDescription"
                                                        value={newSupplierItem.description}
                                                        onChange={(e) => setNewSupplierItem({ ...newSupplierItem, description: e.target.value })}
                                                        placeholder="Enter item description"
                                                        disabled={loading}
                                                        required
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="supplierItemPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Price (USD)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id="supplierItemPrice"
                                                        value={newSupplierItem.price}
                                                        onChange={(e) => setNewSupplierItem({ ...newSupplierItem, price: e.target.value })}
                                                        placeholder="0.00"
                                                        min="0"
                                                        step="0.01"
                                                        disabled={loading}
                                                        required
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <button 
                                                    type="submit" 
                                                    disabled={loading || !newSupplierItem.description.trim() || !newSupplierItem.price}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                                                >
                                                    {loading ? 'Adding...' : 'Add Item'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Items List */}
                                    {supplierItems.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <div className="text-6xl mb-4">📦</div>
                                            <h4 className="text-xl font-semibold mb-2">No Items Yet</h4>
                                            <p>This supplier doesn't have any items yet. Use the form above to add the first item.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Item Description</th>
                                                        <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Price</th>
                                                        <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {supplierItems.map((item) => (
                                                        <tr key={item.supplier_price_id} className="hover:bg-gray-50">
                                                            <td className="border border-gray-200 p-3">
                                                                <div className="font-medium text-gray-900">
                                                                    {item.description}
                                                                </div>
                                                            </td>
                                                            <td className="border border-gray-200 p-3">
                                                                {editingPrice?.supplierPriceId === item.supplier_price_id ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-gray-600">$</span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            defaultValue={editingPrice.currentPrice}
                                                                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    handlePriceUpdate(e.target.value);
                                                                                } else if (e.key === 'Escape') {
                                                                                    setEditingPrice(null);
                                                                                }
                                                                            }}
                                                                            onBlur={(e) => {
                                                                                if (e.target.value !== editingPrice.currentPrice) {
                                                                                    handlePriceUpdate(e.target.value);
                                                                                } else {
                                                                                    setEditingPrice(null);
                                                                                }
                                                                            }}
                                                                            autoFocus
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <span 
                                                                        className="font-medium text-green-600 cursor-pointer hover:bg-green-50 px-2 py-1 rounded"
                                                                        onClick={() => handlePriceEdit(item)}
                                                                        title="Click to edit price"
                                                                    >
                                                                        ${item.price}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="border border-gray-200 p-3">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handlePriceEdit(item)}
                                                                        disabled={loading || editingPrice?.supplierPriceId === item.supplier_price_id}
                                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50 text-sm"
                                                                    >
                                                                        Edit Price
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleItemDelete(item)}
                                                                        disabled={loading}
                                                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50 text-sm"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatabaseManager;