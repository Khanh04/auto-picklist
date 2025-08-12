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
        item.quantity.toString(),
        item.item.length > 50 ? item.item.substring(0, 47) + '...' : item.item,
        item.selectedSupplier,
        typeof item.unitPrice === 'number' ? `$${item.unitPrice.toFixed(2)}` : item.unitPrice,
        typeof item.totalPrice === 'string' && item.totalPrice !== 'N/A' ? `$${item.totalPrice}` : item.totalPrice
    ];
}

/**
 * Draw a single table row in PDF
 * @param {Object} doc - PDFDocument instance
 * @param {Array} rowData - Row data to display
 * @param {number} y - Y position
 * @param {number} index - Row index for alternating colors
 * @returns {number} New Y position
 */
function drawTableRow(doc, rowData, y, index) {
    const { rowHeight, colWidths, colPositions } = PDF_CONFIG;
    
    // Alternate row colors
    if (index % 2 === 0) {
        doc.rect(50, y, 510, rowHeight).fill('#f9f9f9');
    }
    
    // Draw row border
    doc.rect(50, y, 510, rowHeight).stroke();
    
    // Add text
    doc.fillColor('black');
    rowData.forEach((data, i) => {
        doc.text(data, colPositions[i], y + 5, { 
            width: colWidths[i], 
            align: 'left' 
        });
    });
    
    return y + rowHeight;
}

/**
 * Generate PDF from picklist data
 * @param {Array} picklistData - Array of picklist items
 * @param {string} outputPath - Output file path
 */
function generatePDF(picklistData, outputPath = 'final_picklist.pdf') {
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
        // Check if we need a new page
        if (y + PDF_CONFIG.rowHeight > PDF_CONFIG.pageHeight) {
            doc.addPage();
            y = drawTableHeader(doc, 50);
        }
        
        const rowData = formatRowData(item);
        y = drawTableRow(doc, rowData, y, index);
    });
    
    doc.end();
    console.log(`PDF picklist saved to "${outputPath}"`);
}

module.exports = {
    generatePDF,
    calculateSummary
};