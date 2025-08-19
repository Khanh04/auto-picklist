const PDFDocument = require('pdfkit');
const fs = require('fs');

/**
 * Configuration for PDF table layout
 */
const PDF_CONFIG = {
    rowHeight: 20,
    colWidths: [30, 280, 80, 60, 60],
    colPositions: [50, 80, 360, 440, 500],
    headers: ['Qty', 'Item Description', 'Supplier', 'Unit Price', 'Total'],
    pageHeight: 750,
    headerHeight: 25
};

/**
 * Dynamic color palette for suppliers
 */
const COLOR_PALETTE = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', 
    '#e67e22', '#1abc9c', '#34495e', '#16a085', '#d35400', 
    '#2980b9', '#27ae60', '#7f8c8d', '#2c3e50', '#95a5a6',
    '#f1c40f', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'
];

// Cache for generated colors to ensure consistency
// Clear cache periodically to prevent memory leaks
const supplierColorCache = new Map();
const MAX_CACHE_SIZE = 1000;

/**
 * Generate a consistent color for a supplier name using hash-based selection
 * @param {string} supplierName - Name of supplier
 * @returns {string} Hex color code
 */
function generateSupplierColor(supplierName) {
    // Clean up supplier name by trimming whitespace
    const cleanName = supplierName ? supplierName.trim() : '';
    
    // Handle special case for no supplier
    if (!cleanName || cleanName === 'No supplier found') {
        return '#888888';
    }
    
    // Check cache first
    if (supplierColorCache.has(cleanName)) {
        return supplierColorCache.get(cleanName);
    }
    
    // Generate hash from supplier name
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
        const char = cleanName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use hash to select color from palette
    const colorIndex = Math.abs(hash) % COLOR_PALETTE.length;
    const color = COLOR_PALETTE[colorIndex];
    
    // Cache the result with size limit to prevent memory leaks
    if (supplierColorCache.size >= MAX_CACHE_SIZE) {
        // Clear oldest entries (simple FIFO approach)
        const firstKey = supplierColorCache.keys().next().value;
        supplierColorCache.delete(firstKey);
    }
    supplierColorCache.set(cleanName, color);
    
    return color;
}

/**
 * Get color for supplier name
 * @param {string} supplierName - Name of supplier
 * @returns {string} Hex color code
 */
function getSupplierColor(supplierName) {
    return generateSupplierColor(supplierName);
}

/**
 * Clear the supplier color cache (useful for testing or memory management)
 */
function clearSupplierColorCache() {
    supplierColorCache.clear();
}

/**
 * Calculate summary statistics for picklist
 * @param {Array} picklistData - Array of picklist items
 * @returns {Object} Summary statistics
 */
function calculateSummary(picklistData) {
    const totalItems = picklistData.length;
    const totalCost = picklistData
        .filter(item => !isNaN(parseFloat(item.totalPrice)))
        .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const itemsWithSuppliers = picklistData.filter(item => item.selectedSupplier !== 'No supplier found').length;
    
    return { totalItems, totalCost, itemsWithSuppliers };
}

/**
 * Draw table header in PDF
 * @param {Object} doc - PDFDocument instance
 * @param {number} yPos - Y position to draw header
 * @returns {number} New Y position after header
 */
function drawTableHeader(doc, yPos) {
    const { rowHeight, colWidths, colPositions, headers, headerHeight } = PDF_CONFIG;
    
    // Draw header background
    doc.rect(50, yPos, 510, rowHeight).fillAndStroke('#4a90e2', '#000');
    doc.fillColor('white');
    
    // Draw header text
    headers.forEach((header, i) => {
        doc.text(header, colPositions[i], yPos + 5, { 
            width: colWidths[i], 
            align: 'left' 
        });
    });
    
    doc.fillColor('black');
    return yPos + headerHeight;
}

/**
 * Format row data for PDF display
 * @param {Object} item - Picklist item
 * @returns {Array} Formatted row data
 */
function formatRowData(item) {
    return [
        (item.quantity || 0).toString(),
        item.item ? (item.item.length > 50 ? item.item.substring(0, 47) + '...' : item.item) : '',
        item.selectedSupplier || 'No supplier found',
        typeof item.unitPrice === 'number' ? `$${item.unitPrice.toFixed(2)}` : (item.unitPrice || 'N/A'),
        typeof item.totalPrice === 'string' && item.totalPrice !== 'N/A' ? `$${item.totalPrice}` : (item.totalPrice || 'N/A')
    ];
}

/**
 * Draw a single table row in PDF
 * @param {Object} doc - PDFDocument instance
 * @param {Array} rowData - Row data to display
 * @param {number} y - Y position
 * @param {number} index - Row index for alternating colors
 * @param {string} supplierName - Supplier name for color coding
 * @returns {number} New Y position
 */
function drawTableRow(doc, rowData, y, index, supplierName) {
    const { rowHeight, colWidths, colPositions } = PDF_CONFIG;
    
    // Alternate row colors
    if (index % 2 === 0) {
        doc.rect(50, y, 510, rowHeight).fill('#f9f9f9');
    }
    
    // Draw row border
    doc.rect(50, y, 510, rowHeight).stroke();
    
    // Add text with different colors for supplier column
    rowData.forEach((data, i) => {
        // Set color for each column individually
        if (i === 2) { // Supplier column
            doc.fillColor(getSupplierColor(supplierName));
        } else {
            doc.fillColor('black');
        }
        
        // Draw the text for this column
        doc.text(data, colPositions[i], y + 5, { 
            width: colWidths[i], 
            align: 'left' 
        });
    });
    
    // Reset to black for consistency
    doc.fillColor('black');
    
    return y + rowHeight;
}

/**
 * Generate PDF from picklist data
 * @param {Array} picklistData - Array of picklist items
 * @param {string} outputPath - Output file path
 */
function generatePDF(picklistData, outputPath = 'final_picklist.pdf') {
    // Input validation
    if (!Array.isArray(picklistData)) {
        throw new Error('picklistData must be an array');
    }
    
    if (picklistData.length === 0) {
        throw new Error('picklistData cannot be empty');
    }
    
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(outputPath));
    
    // Add title and date
    doc.fontSize(20).text('AUTO-GENERATED PICKLIST', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    
    // Add summary
    const summary = calculateSummary(picklistData);
    doc.text(`Total Items: ${summary.totalItems}`);
    doc.text(`Items with Suppliers: ${summary.itemsWithSuppliers}`);
    doc.text(`Total Estimated Cost: $${summary.totalCost.toFixed(2)}`);
    doc.moveDown();
    
    // Set up table
    doc.fontSize(10);
    let y = drawTableHeader(doc, doc.y);
    
    // Add table rows
    picklistData.forEach((item, index) => {
        // Skip invalid items
        if (!item || typeof item !== 'object') {
            return;
        }
        
        // Check if we need a new page
        if (y + PDF_CONFIG.rowHeight > PDF_CONFIG.pageHeight) {
            doc.addPage();
            y = drawTableHeader(doc, 50);
        }
        
        const rowData = formatRowData(item);
        y = drawTableRow(doc, rowData, y, index, item.selectedSupplier);
    });
    
    doc.end();
    console.log(`PDF picklist saved to "${outputPath}"`);
}

module.exports = {
    generatePDF,
    calculateSummary,
    clearSupplierColorCache
};