import React, { useState, useEffect } from 'react'

function PicklistPreview({ results, onExport, onBack }) {
  const [picklist, setPicklist] = useState([])
  const [editingCell, setEditingCell] = useState(null)
  const [availableSuppliers, setAvailableSuppliers] = useState([])

  useEffect(() => {
    // Convert results to editable picklist format
    if (results && results.picklist) {
      setPicklist(results.picklist)
      
      // Extract unique suppliers for dropdown
      const suppliers = [...new Set(results.picklist
        .filter(item => item.selectedSupplier !== 'No supplier found')
        .map(item => item.selectedSupplier)
      )].sort()
      setAvailableSuppliers(['No supplier found', ...suppliers])
    }
  }, [results])

  const handleCellEdit = (index, field, value) => {
    const newPicklist = [...picklist]
    newPicklist[index] = { ...newPicklist[index] }
    
    if (field === 'selectedSupplier') {
      newPicklist[index].selectedSupplier = value
      // Reset price when supplier changes to manual entry
      newPicklist[index].unitPrice = ''
      newPicklist[index].totalPrice = 'N/A'
    } else if (field === 'unitPrice') {
      const price = parseFloat(value)
      newPicklist[index].unitPrice = isNaN(price) ? value : price
      if (!isNaN(price)) {
        newPicklist[index].totalPrice = (price * newPicklist[index].quantity).toFixed(2)
      } else {
        newPicklist[index].totalPrice = 'N/A'
      }
    } else if (field === 'quantity') {
      const qty = parseInt(value)
      newPicklist[index].quantity = isNaN(qty) ? value : qty
      if (!isNaN(qty) && typeof newPicklist[index].unitPrice === 'number') {
        newPicklist[index].totalPrice = (newPicklist[index].unitPrice * qty).toFixed(2)
      }
    }
    
    setPicklist(newPicklist)
  }

  const calculateSummary = () => {
    const totalItems = picklist.length
    const itemsWithSuppliers = picklist.filter(item => 
      item.selectedSupplier !== 'No supplier found' && 
      item.selectedSupplier !== ''
    ).length
    
    const totalCost = picklist.reduce((sum, item) => {
      const price = parseFloat(item.totalPrice)
      return sum + (isNaN(price) ? 0 : price)
    }, 0)
    
    return { totalItems, itemsWithSuppliers, totalCost }
  }

  const handleExport = () => {
    const summary = calculateSummary()
    onExport({ picklist, summary })
  }

  const summary = calculateSummary()

  return (
    <div className="preview-section">
      <h3>📋 Review Your Picklist</h3>
      <p>Review and edit supplier selections before exporting. Click on any cell to modify.</p>
      
      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-number">{summary.totalItems}</div>
          <div className="summary-label">Total Items</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">${summary.totalCost.toFixed(2)}</div>
          <div className="summary-label">Estimated Cost</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{summary.itemsWithSuppliers}</div>
          <div className="summary-label">Items Matched</div>
        </div>
      </div>

      {/* Editable Table */}
      <div className="table-container">
        <table className="picklist-table">
          <thead>
            <tr>
              <th>Qty</th>
              <th>Item Description</th>
              <th>Supplier</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {picklist.map((item, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleCellEdit(index, 'quantity', e.target.value)}
                    className="qty-input"
                    min="1"
                  />
                </td>
                <td className="item-description">{item.item}</td>
                <td>
                  <select
                    value={item.selectedSupplier}
                    onChange={(e) => handleCellEdit(index, 'selectedSupplier', e.target.value)}
                    className="supplier-select"
                  >
                    {availableSuppliers.map(supplier => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                    <option value="">-- Custom --</option>
                  </select>
                  {item.selectedSupplier === '' && (
                    <input
                      type="text"
                      placeholder="Enter supplier name"
                      onBlur={(e) => handleCellEdit(index, 'selectedSupplier', e.target.value)}
                      className="custom-supplier-input"
                    />
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice === 'No price found' ? '' : item.unitPrice}
                    onChange={(e) => handleCellEdit(index, 'unitPrice', e.target.value)}
                    className="price-input"
                    placeholder="0.00"
                  />
                </td>
                <td className="total-price">
                  {item.totalPrice === 'N/A' ? 'N/A' : `$${parseFloat(item.totalPrice || 0).toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="preview-actions">
        <button 
          type="button" 
          className="back-btn"
          onClick={onBack}
        >
          ← Back to Upload
        </button>
        <button 
          type="button" 
          className="export-btn"
          onClick={handleExport}
        >
          Export Picklist →
        </button>
      </div>
    </div>
  )
}

export default PicklistPreview