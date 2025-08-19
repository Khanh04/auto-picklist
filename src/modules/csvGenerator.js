/**
 * CSV Generation utility
 */

/**
 * Generate CSV content from picklist data
 * @param {Array} picklistData - Array of picklist items
 * @returns {string} CSV content as string
 */
function generateCSV(picklistData) {
    // Input validation
    if (!Array.isArray(picklistData)) {
        throw new Error('picklistData must be an array');
    }
    
    if (picklistData.length === 0) {
        throw new Error('picklistData cannot be empty');
    }
    
    // CSV Headers
    const headers = ['quantity', 'item', 'selectedSupplier', 'unitPrice', 'totalPrice'];
    const csvHeaders = headers.join(',') + '\n';
    
    // Process each row with proper escaping
    const csvRows = picklistData.map(row => {
        const values = [
            (row.quantity || 0).toString(),
            escapeCSVField(row.item || ''),
            escapeCSVField(row.selectedSupplier || ''),
            (row.unitPrice || '').toString(),
            (row.totalPrice || '').toString()
        ];
        return values.join(',');
    });
    
    return csvHeaders + csvRows.join('\n');
}

/**
 * Escape CSV field content to prevent injection and handle special characters
 * @param {string} field - Field content to escape
 * @returns {string} Escaped field content
 */
function escapeCSVField(field) {
    if (!field || typeof field !== 'string') {
        return '""';
    }
    
    // Remove potentially dangerous characters and normalize whitespace
    let cleaned = field
        .replace(/[\r\n\t]/g, ' ')  // Replace newlines and tabs with spaces
        .replace(/\s+/g, ' ')       // Normalize multiple spaces
        .trim();
    
    // Escape quotes by doubling them
    cleaned = cleaned.replace(/"/g, '""');
    
    // Always wrap in quotes for safety
    return `"${cleaned}"`;
}

/**
 * Generate CSV content and stream it to response
 * @param {Array} picklistData - Array of picklist items
 * @param {Object} res - Express response object
 * @param {string} filename - Filename for download
 */
function streamCSV(picklistData, res, filename = 'picklist.csv') {
    try {
        const csvContent = generateCSV(picklistData);
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
        
        // Send CSV content
        res.send(csvContent);
        
    } catch (error) {
        throw new Error(`Failed to generate CSV: ${error.message}`);
    }
}

module.exports = {
    generateCSV,
    escapeCSVField,
    streamCSV
};