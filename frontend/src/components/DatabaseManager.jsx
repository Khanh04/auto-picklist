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
                setSuccess(`Supplier "${newSupplier.name}" added successfully!`);
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
                setSuccess(`Item "${newItem.description}" added successfully!`);
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
        <div className="database-manager">
            <div className="database-header">
                <button className="back-button" onClick={onBack}>
                    ← Back to Upload
                </button>
                <h2>Database Management</h2>
                <p>Add new suppliers and items to the database</p>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            {success && (
                <div className="success-message">
                    <span className="success-icon">✅</span>
                    {success}
                </div>
            )}

            <div className="database-forms">
                {/* Add Supplier Form */}
                <div className="form-section">
                    <h3>Add New Supplier</h3>
                    <form onSubmit={handleAddSupplier} className="supplier-form">
                        <div className="form-group">
                            <label htmlFor="supplierName">Supplier Name:</label>
                            <input
                                type="text"
                                id="supplierName"
                                value={newSupplier.name}
                                onChange={(e) => setNewSupplier({ name: e.target.value })}
                                placeholder="Enter supplier name (e.g., ACME Corp)"
                                disabled={loading}
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={loading || !newSupplier.name.trim()}
                        >
                            {loading ? 'Adding...' : 'Add Supplier'}
                        </button>
                    </form>
                </div>

                {/* Add Item Form */}
                <div className="form-section">
                    <h3>Add New Item</h3>
                    <form onSubmit={handleAddItem} className="item-form">
                        <div className="form-group">
                            <label htmlFor="itemDescription">Item Description:</label>
                            <input
                                type="text"
                                id="itemDescription"
                                value={newItem.description}
                                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                placeholder="Enter item description (e.g., OPI Nail Polish 0.5 fl oz - Red)"
                                disabled={loading}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="itemSupplier">Supplier:</label>
                            <select
                                id="itemSupplier"
                                value={newItem.supplier}
                                onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                                disabled={loading}
                                required
                            >
                                <option value="">Select a supplier</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.name}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="itemPrice">Price (USD):</label>
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
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={loading || !newItem.description.trim() || !newItem.supplier || !newItem.price}
                        >
                            {loading ? 'Adding...' : 'Add Item'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Current Suppliers List */}
            <div className="suppliers-list">
                <h3>Current Suppliers ({suppliers.length})</h3>
                <div className="suppliers-grid">
                    {suppliers.map((supplier) => (
                        <div key={supplier.id} className="supplier-card">
                            <span className="supplier-name">{supplier.name}</span>
                            <span className="supplier-count">{supplier.product_count || 0} items</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DatabaseManager;