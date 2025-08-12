const fs = require('fs');

/**
 * Parse order items from eBay CSV order report
 * @param {string} csvPath - Path to the eBay CSV file
 * @returns {Promise<Array>} Array of order items with quantity and description
 */
async function parseOrderItemsFromEbayCSV(csvPath) {
    try {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length < 2) {
            throw new Error('CSV file appears to be empty or malformed');
        }
        
        const header = lines[0].toLowerCase();
        
        // Find column indices
        const columns = header.split(',');
        const quantityIndex = columns.findIndex(col => 
            col.includes('quantity') || col.includes('qty')
        );
        const titleIndex = columns.findIndex(col => 
            col.includes('title') || col.includes('item') || col.includes('product') || col.includes('name')
        );
        
        if (quantityIndex === -1 || titleIndex === -1) {
            throw new Error('Could not find required columns (Quantity and Item Title) in CSV');
        }
        
        const orderItems = [];
        
        // Parse data rows (skip header)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;
            
            // Simple CSV parsing (handles basic cases)
            const values = parseCSVLine(line);
            
            if (values.length > Math.max(quantityIndex, titleIndex)) {
                const quantity = parseInt(values[quantityIndex]);
                const item = values[titleIndex].replace(/^"|"$/g, ''); // Remove quotes
                
                if (!isNaN(quantity) && quantity > 0 && item && item.length > 3) {
                    orderItems.push({ quantity, item });
                }
            }
        }
        
        console.log(`📊 Parsed ${orderItems.length} items from eBay CSV`);
        return orderItems;
        
    } catch (error) {
        console.error('Error parsing eBay CSV:', error.message);
        throw error;
    }
}

/**
 * Simple CSV line parser that handles quoted values with commas
 * @param {string} line - CSV line to parse
 * @returns {Array<string>} Array of values
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of value
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last value
    values.push(current.trim());
    
    return values;
}

/**
 * Auto-detect the eBay CSV file in the current directory
 * @returns {string|null} Path to eBay CSV file or null if not found
 */
function findEbayCSV() {
    try {
        const files = fs.readdirSync('.');
        
        // Look for files that match eBay report patterns
        const ebayFile = files.find(file => 
            file.toLowerCase().includes('ebay') && 
            file.toLowerCase().includes('order') && 
            file.endsWith('.csv')
        );
        
        return ebayFile || null;
    } catch (error) {
        console.error('Error finding eBay CSV:', error.message);
        return null;
    }
}

module.exports = {
    parseOrderItemsFromEbayCSV,
    findEbayCSV,
    parseCSVLine
};