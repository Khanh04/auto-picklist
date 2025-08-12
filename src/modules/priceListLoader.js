const XLSX = require('xlsx');

/**
 * Load price list from Excel file
 * @param {string} filename - Path to Excel file
 * @returns {Array|null} Price data or null if error
 */
function loadPriceList(filename) {
    try {
        const workbook = XLSX.readFile(filename);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
        console.error('Error loading Excel file:', error.message);
        return null;
    }
}

/**
 * Normalize item names for better matching
 * @param {string} itemName - Original item name
 * @returns {string} Normalized item name
 */
function normalizeItemName(itemName) {
    return itemName
        .replace(/\[.*?\]/g, '')  // Remove bracketed text
        .replace(/\*.*?\*/g, '')  // Remove text between asterisks
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim()
        .toLowerCase();
}

/**
 * Find the best supplier with lowest price for a given item
 * @param {string} itemName - Name of the item to find
 * @param {Array} priceData - Price data from Excel file
 * @returns {Object} Object with supplier and price, or null values if not found
 */
function findBestSupplier(itemName, priceData) {
    if (!priceData || priceData.length === 0) {
        return { supplier: null, price: null };
    }

    const normalizedItem = normalizeItemName(itemName);
    const matches = [];

    // Get all column names by examining all rows (not just first row)
    const allColumns = new Set();
    priceData.forEach(row => {
        Object.keys(row).forEach(key => allColumns.add(key));
    });
    const columns = Array.from(allColumns);
    
    // Find item column
    const itemCol = columns.find(col => 
        ['item', 'product', 'name', 'description'].some(keyword => 
            col.toLowerCase().includes(keyword)
        )
    );
    
    // All other columns are potential supplier columns
    const supplierCols = columns.filter(col => col !== itemCol);

    if (!itemCol) {
        return { supplier: null, price: null };
    }

    // Search for matches
    priceData.forEach((row) => {
        const rowItem = String(row[itemCol] || '').toLowerCase();
        const normalizedWords = normalizedItem.split(' ').filter(word => word.length > 2);
        
        // Improved matching logic - require more specific matches
        let matchScore = 0;
        let hasMatch = false;
        
        // Exact substring match (high score)
        if (rowItem.includes(normalizedItem.substring(0, 15))) {
            matchScore += 10;
            hasMatch = true;
        }
        
        // Brand/product name match
        const orderBrand = normalizedItem.split(' ')[0];
        if (orderBrand.length > 2 && rowItem.includes(orderBrand)) {
            matchScore += 5;
            hasMatch = true;
        }
        
        // Multiple word match (require at least 2 significant words)
        const matchingWords = normalizedWords.filter(word => 
            word.length > 3 && rowItem.includes(word)
        );
        if (matchingWords.length >= 2) {
            matchScore += matchingWords.length;
            hasMatch = true;
        }
        
        // Single important word match (lower score)
        else if (normalizedWords.some(word => 
            word.length > 4 && rowItem.includes(word) && 
            !['nail', 'polish', 'color', 'glue'].includes(word)
        )) {
            matchScore += 1;
            hasMatch = true;
        }
        
        if (hasMatch) {
            // Check all supplier columns for prices
            supplierCols.forEach(supplierCol => {
                const priceValue = row[supplierCol];
                if (priceValue !== undefined && priceValue !== null && priceValue !== '') {
                    const price = parseFloat(String(priceValue).replace(/[@$,\s]/g, ''));
                    
                    if (!isNaN(price) && price > 0) {
                        matches.push({ 
                            supplier: supplierCol, 
                            price: price, 
                            rowItem: rowItem,
                            matchedItem: itemName,
                            matchScore: matchScore
                        });
                    }
                }
            });
        }
    });

    if (matches.length > 0) {
        // First, find matches with the highest match score
        const maxScore = Math.max(...matches.map(m => m.matchScore));
        const bestScoreMatches = matches.filter(m => m.matchScore === maxScore);
        
        // Among the best scoring matches, return the one with the lowest price
        const bestMatch = bestScoreMatches.reduce((best, current) => 
            current.price < best.price ? current : best
        );
        console.log(`Match found for "${itemName}": ${bestMatch.supplier} at $${bestMatch.price}`);
        return { supplier: bestMatch.supplier, price: bestMatch.price };
    }

    return { supplier: null, price: null };
}

module.exports = {
    loadPriceList,
    findBestSupplier,
    normalizeItemName
};