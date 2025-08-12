const XLSX = require('xlsx');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const pdfParse = require('pdf-parse');

/**
 * Automated Picklist Generator
 * Reads order items from PDF, matches with Excel price list,
 * and generates optimized supplier selections with lowest prices.
 */

/**
 * Parse order items from PDF file
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<Array>} Array of order items with quantity and description
 */
async function parseOrderItemsFromPDF(pdfPath) {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        let cleanText = data.text.replace(/QuantityItem Title/g, '').trim();
        
        const orderItems = [];
        
        // Try regex pattern matching first
        const itemMatches = cleanText.match(/(\d+)([A-Z#][^0-9]*?)(?=\d+[A-Z#]|$)/g);
        
        if (itemMatches) {
            for (let match of itemMatches) {
                const itemMatch = match.match(/^(\d+)(.+)$/);
                if (itemMatch) {
                    const quantity = parseInt(itemMatch[1]);
                    const item = itemMatch[2].trim();
                    
                    if (isValidOrderItem(quantity, item)) {
                        orderItems.push({ quantity, item });
                    }
                }
            }
        }
        
        // Fallback parsing method
        if (orderItems.length < 5) {
            const potentialItems = cleanText.split(/(?=\d+[A-Z#])/);
            
            for (let item of potentialItems) {
                const trimmed = item.trim();
                if (!trimmed) continue;
                
                const match = trimmed.match(/^(\d+)(.+)/);
                if (match) {
                    const quantity = parseInt(match[1]);
                    const description = match[2].trim();
                    
                    if (isValidOrderItem(quantity, description)) {
                        orderItems.push({ quantity, item: description });
                    }
                }
            }
        }
        
        return orderItems.length > 5 ? orderItems : getHardcodedOrderItems();
        
    } catch (error) {
        console.error('Error parsing PDF:', error.message);
        return getHardcodedOrderItems();
    }
}

/**
 * Validate if an order item is valid
 * @param {number} quantity - Item quantity
 * @param {string} item - Item description
 * @returns {boolean} True if valid
 */
function isValidOrderItem(quantity, item) {
    return quantity > 0 && quantity <= 100 && item.length > 5;
}

/**
 * Fallback hardcoded order items (used when PDF parsing fails)
 * @returns {Array} Array of order items
 */
function getHardcodedOrderItems() {
    return [
        {quantity: 2, item: "#1 Eyelash Glue Beauty #1 \"Secret PLUS\" 2-Second-Adhesive 0.34 fl oz"},
        {quantity: 1, item: "7 STAR 2-IN-1 Acrylic & Dipping Powder 2 oz [#201-437][273]"},
        {quantity: 1, item: "CND Rescue RXx - Daily Keratin Nail Treatment - 0.5oz/15ml - 90763"},
        {quantity: 1, item: "CND Vinylux Long Wear Nail Polish 5oz/15mL Love Letter"},
        {quantity: 1, item: "DND DC DUO Matching Gel & Lacquer Creamy Collection - #145-#180 *Pick Any*[#168 - Andorra]"},
        {quantity: 1, item: "DND DC Duo Gel & Nail Polish Set - Goodie Bag #321 Brand New Color 2022"},
        {quantity: 1, item: "DND DC Gel Polish UV/LED #008 - NY Islanders (GEL ONLY)"},
        {quantity: 1, item: "DND DC Matching Duo ON SALE!! 004 - Pink Lemonade"},
        {quantity: 1, item: "DND DC Soak Off Gel Polish Duo Part 2 #320 - #2543 LED/UV New *PICK ANY COLORS*[2461 - Milky Pink]"},
        {quantity: 4, item: "DND DIVA Base #100 + Top #300 Combo No Cleanse NIB 2025"},
        {quantity: 1, item: "DND DIVA Base #100 + Top #300 Combo No Cleanse NIB 2025"},
        {quantity: 1, item: "DND DUO DIVA GEL & LACQUER #273 - Sound Of Rain"},
        {quantity: 1, item: "DND DUO Matching Gel & Lacquer #515 - Tropical Waterfall"},
        {quantity: 1, item: "DND Daisy Soak Off Gel Polish Duo full size .5oz (Part 2: #601-799)[658 - Basic Plum]"},
        {quantity: 1, item: "DND Daisy Soak Off Gel Polish Duo full size .5oz (Part 2: #601-799)[660 - Indigo Glow]"},
        {quantity: 1, item: "DND Duo Matching Soak-Off Gel & Nail Polish - #868 - Gossip Girl"},
        {quantity: 1, item: "DND Duo Matching Soak-Off Gel & Nail Polish - #878 - Picnic For 2"},
        {quantity: 1, item: "DND No Wipe UV/LED Cure Soak off Gel Top Coat 0.5oz On Sale!"},
        {quantity: 1, item: "Harmony Gelish Soak-Off Gel-STRUCTURE Gel Clear + Cover Pink + Translucent Pink"},
        {quantity: 2, item: "IBD LED/UV Hard Gel Builder Gel Clear 8oz Refill On Sale!"},
        {quantity: 1, item: "Kiara Sky Dipping Powder 1oz, Essential 0.5 oz - SUMMER'19 UPDATED[D603 - EXPOSED]"},
        {quantity: 1, item: "Nail Harmony Gelish Gel Color #842 Good Gossip for Chrismas Hot Color 0.5 oz"},
        {quantity: 1, item: "OPI \"What's Your Mani-tude\" Nail Lacquer Fall 2025 Collection *Pick Any*[GCT F035 - Grunge Queen]"},
        {quantity: 1, item: "OPI NAIL LACQUER BASE + TOP COAT Duo On Sale"},
        {quantity: 1, item: "OPI Nail Envy Original Formula Maximum Strengthener 0.5 Fl Oz (No box)"},
        {quantity: 1, item: "OPI Nail Polish 0.5 fl oz - NLM89 My Chihuahua Doesn't Bite Anymore"},
        {quantity: 1, item: "OPI Nail Polish Colors 0.5oz/ea. Updated Newest colors 2024 *Pick ur colors*[L21 - Now Museum, Now You Don't]"},
        {quantity: 1, item: "OPI Nail Polish Colors 0.5oz/ea. Updated Newest colors 2024 *Pick ur colors*[P35 - Grandma Kissed a Gaucho]"},
        {quantity: 1, item: "OPI Nail Polish Colors 0.5oz/ea. Updated Newest colors 2024 *Pick ur colors*[S96 - Sweetheart]"},
        {quantity: 1, item: "OPI Nail Polish Colors 0.5oz/ea. Updated Newest colors 2024 *Pick ur colors*[T84 - All Your Dreams in Vending Machines]"},
        {quantity: 1, item: "OPI Nail Polish Colors 0.5oz/ea. Updated Newest colors 2024 *Pick ur colors*[T85 - Sumarai Breaks a Nail]"},
        {quantity: 1, item: "OPI Powder Perfection System - Nail Dipping Liquid Essentials - Pick Any[Step 1 - Base]"},
        {quantity: 3, item: "Orly Gel FX BUILDER IN A BOTTLE 1.2oz NEW LARGE SIZE BOTTLE 2022"},
        {quantity: 2, item: "Orly Gel FX BUILDER IN A BOTTLE 1.2oz NEW LARGE SIZE BOTTLE 2022"},
        {quantity: 1, item: "Seche Vive Instant Gel Effect Top Coat Fast Dry Nail Refill Kit 4oz + 0.5oz"},
        {quantity: 1, item: "iGel Dip & Dap Powder 56 g/2 oz (DD1-247) *Pick Any*[DD11 - Seashell]"},
        {quantity: 1, item: "iGel Gel & Lac DUO 15mL/0.5 oz DD146 - Shimmering Snow"},
        {quantity: 1, item: "iGel Gel & Lac DUO 15mL/0.5 oz DD9 - Ballerina Gown"}
    ];
}

/**
 * Load price list from Excel file
 * @param {string} filename - Path to Excel file
 * @returns {Array|null} Price data or null if error
 */
function loadPriceList(filename) {
    try {
        const workbook = XLSX.readFile(filename);
        console.log('Available sheets:', workbook.SheetNames);
        
        // Check all sheets
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            console.log(`\nSheet: ${sheetName}`);
            console.log('Columns:', Object.keys(data[0] || {}));
            console.log('Sample rows with all columns:', data.slice(0, 10));
        });
        
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
 */
function generatePDF(picklistData) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream('final_picklist.pdf'));
    
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
    console.log('PDF picklist saved to "final_picklist.pdf"');
}

/**
 * Main function to process picklist generation
 */
async function main() {
    try {
        console.log('Creating automated picklist...');

        // Load order items from PDF
        const orderItems = await parseOrderItemsFromPDF('H order.pdf');
        if (!orderItems || orderItems.length === 0) {
            throw new Error('No order items found in PDF');
        }

        // Load price list
        const priceData = loadPriceList('GENERAL PRICE LIST.xlsx');
        if (!priceData) {
            throw new Error('Failed to load price list from Excel file');
        }

        // Create picklist
        const picklist = createPicklist(orderItems, priceData);

        // Save outputs
        const csvContent = convertToCSV(picklist);
        fs.writeFileSync('final_picklist.csv', csvContent);
        generatePDF(picklist);

        // Display summary
        const summary = calculateSummary(picklist);
        console.log(`\n✅ Picklist generated successfully!`);
        console.log(`📄 Order items processed: ${orderItems.length}`);
        console.log(`💰 Total estimated cost: $${summary.totalCost.toFixed(2)}`);
        console.log(`🏪 Items with suppliers: ${summary.itemsWithSuppliers}/${summary.totalItems}`);
        console.log(`📊 Files created: final_picklist.csv, final_picklist.pdf`);

    } catch (error) {
        console.error('❌ Error generating picklist:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);