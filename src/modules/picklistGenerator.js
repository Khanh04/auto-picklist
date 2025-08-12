const { findBestSupplier } = require('./priceListLoader');

/**
 * Create the final picklist with best suppliers
 * @param {Array} orderItems - Array of order items
 * @param {Array} priceData - Price data from Excel file
 * @returns {Array} Final picklist with supplier selections
 */
function createPicklist(orderItems, priceData) {
    const picklist = [];

    orderItems.forEach(orderItem => {
        const { supplier, price } = findBestSupplier(orderItem.item, priceData);
        
        const picklistItem = {
            quantity: orderItem.quantity,
            item: orderItem.item,
            selectedSupplier: supplier || 'No supplier found',
            unitPrice: price || 'No price found',
            totalPrice: price ? (price * orderItem.quantity).toFixed(2) : 'N/A'
        };

        picklist.push(picklistItem);
    });

    return picklist;
}

/**
 * Convert picklist data to CSV format
 * @param {Array} data - Picklist data
 * @returns {string} CSV formatted string
 */
function convertToCSV(data) {
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            return typeof value === 'string' && value.includes(',') 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
        });
        csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
}

module.exports = {
    createPicklist,
    convertToCSV
};