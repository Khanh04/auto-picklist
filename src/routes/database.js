const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;

const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../database/config');

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
        }
    }
});

/**
 * Normalize item names for better matching (from existing script)
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
 * POST /api/database/import-excel
 * Import suppliers and items from Excel file using existing import logic
 */
router.post('/import-excel', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded'
        });
    }

    const filePath = req.file.path;
    const client = await pool.connect();
    
    try {
        console.log('📊 Starting Excel data import from web upload...');
        
        // Read Excel file
        console.log(`📖 Reading uploaded file: ${req.file.originalname}...`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error('Excel file contains no worksheets');
        }
        
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`📋 Found ${rawData.length} rows in Excel file`);

        if (rawData.length === 0) {
            throw new Error('Excel file contains no data rows');
        }

        // Get all column names by examining all rows (from existing script)
        const allColumns = new Set();
        rawData.forEach(row => {
            Object.keys(row).forEach(key => allColumns.add(key));
        });
        const columns = Array.from(allColumns);
        
        // Find item column (from existing script)
        const itemCol = columns.find(col => 
            ['item', 'product', 'name', 'description'].some(keyword => 
                col.toLowerCase().includes(keyword)
            )
        );
        
        if (!itemCol) {
            throw new Error('Could not find item/product description column in Excel file. Please ensure you have a column with "item", "product", "name", or "description" in the header.');
        }
        
        // All other columns are potential supplier columns (from existing script)
        const supplierCols = columns.filter(col => col !== itemCol);
        console.log(`🏪 Found ${supplierCols.length} supplier columns`);

        if (supplierCols.length === 0) {
            throw new Error('No supplier columns found. Excel file should have supplier names as column headers.');
        }

        // Start transaction
        await client.query('BEGIN');
        
        console.log('🧹 Clearing existing data...');
        await client.query('DELETE FROM supplier_prices');
        await client.query('DELETE FROM products');
        await client.query('DELETE FROM suppliers');
        
        // Reset sequences (from existing script)
        await client.query('ALTER SEQUENCE suppliers_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE products_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE supplier_prices_id_seq RESTART WITH 1');

        // Insert suppliers (from existing script)
        console.log('🏪 Inserting suppliers...');
        const supplierIds = {};
        for (const supplierName of supplierCols) {
            const result = await client.query(
                'INSERT INTO suppliers (name) VALUES ($1) RETURNING id',
                [supplierName]
            );
            supplierIds[supplierName] = result.rows[0].id;
        }
        console.log(`✅ Inserted ${Object.keys(supplierIds).length} suppliers`);

        // Process products and prices (from existing script)
        console.log('📦 Processing products and prices...');
        let productCount = 0;
        let priceCount = 0;
        let errorCount = 0;
        const processedProducts = new Set(); // To avoid duplicates
        const errors = [];
        
        for (const [index, row] of rawData.entries()) {
            try {
                const description = String(row[itemCol] || '').trim();
                
                if (!description || description.length < 3) {
                    continue; // Skip empty or too short descriptions
                }
                
                // Skip if we've already processed this exact description
                if (processedProducts.has(description)) {
                    continue;
                }
                processedProducts.add(description);
                
                const normalizedDescription = normalizeItemName(description);
                
                // Insert product with normalized description
                const productResult = await client.query(
                    'INSERT INTO products (description, normalized_description) VALUES ($1, $2) RETURNING id',
                    [description, normalizedDescription]
                );
                const productId = productResult.rows[0].id;
                productCount++;
                
                // Insert prices for this product (from existing script)
                for (const supplierCol of supplierCols) {
                    const priceValue = row[supplierCol];
                    
                    if (priceValue !== undefined && priceValue !== null && priceValue !== '') {
                        // Parse price value (from existing script)
                        const priceStr = String(priceValue).replace(/[@$,\s]/g, '');
                        const price = parseFloat(priceStr);
                        
                        if (!isNaN(price) && price > 0) {
                            await client.query(
                                'INSERT INTO supplier_prices (product_id, supplier_id, price) VALUES ($1, $2, $3)',
                                [productId, supplierIds[supplierCol], price]
                            );
                            priceCount++;
                        }
                    }
                }
                
                // Progress indicator
                if (productCount % 100 === 0) {
                    console.log(`   📦 Processed ${productCount} products, ${priceCount} prices...`);
                }
                
            } catch (rowError) {
                errorCount++;
                errors.push({
                    row: index + 2, // +2 for 1-indexed and header row
                    message: rowError.message,
                    description: row[itemCol] || 'Unknown item'
                });
                
                // Don't fail the entire import for individual row errors
                console.warn(`⚠️  Row ${index + 2} error: ${rowError.message}`);
            }
        }
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log('✅ Import completed successfully!');
        console.log(`📊 Import Summary:`);
        console.log(`   🏪 Suppliers: ${Object.keys(supplierIds).length}`);
        console.log(`   📦 Products: ${productCount}`);
        console.log(`   💰 Price entries: ${priceCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

        // Clean up uploaded file
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            console.error('Failed to delete uploaded file:', unlinkError);
        }

        // Return success response
        res.json({
            success: true,
            message: 'Excel file imported successfully',
            summary: {
                totalRows: rawData.length,
                suppliersAdded: Object.keys(supplierIds).length,
                itemsAdded: productCount,
                pricesAdded: priceCount,
                errors: errorCount
            },
            errors: errors.slice(0, 50), // Limit errors to first 50 for UI
            warnings: errors.length > 50 ? [`... and ${errors.length - 50} more errors`] : []
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        
        // Clean up uploaded file on error
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            console.error('Failed to delete uploaded file:', unlinkError);
        }
        
        console.error('Excel import error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to import Excel file'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/database/export-excel
 * Export database data as Excel file
 */
router.get('/export-excel', asyncHandler(async (req, res) => {
    const client = await pool.connect();
    
    try {
        console.log('📤 Starting Excel data export...');
        
        // Get all suppliers
        const suppliersResult = await client.query('SELECT * FROM suppliers ORDER BY name');
        const suppliers = suppliersResult.rows;
        
        if (suppliers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No suppliers found to export'
            });
        }
        
        // Get all products with their prices
        const productsQuery = `
            SELECT 
                p.description,
                s.name as supplier_name,
                sp.price
            FROM products p
            LEFT JOIN supplier_prices sp ON p.id = sp.product_id
            LEFT JOIN suppliers s ON sp.supplier_id = s.id
            ORDER BY p.description, s.name
        `;
        const productsResult = await client.query(productsQuery);
        const productData = productsResult.rows;
        
        // Group products by description
        const productMap = new Map();
        productData.forEach(row => {
            if (!productMap.has(row.description)) {
                productMap.set(row.description, {});
            }
            if (row.supplier_name && row.price) {
                productMap.get(row.description)[row.supplier_name] = row.price;
            }
        });
        
        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        
        // Prepare data in price matrix format
        const excelData = [];
        const supplierNames = suppliers.map(s => s.name).sort();
        
        // Add header row
        excelData.push(['Item/Product/Description', ...supplierNames]);
        
        // Add product rows
        for (const [description, prices] of productMap.entries()) {
            const row = [description];
            for (const supplierName of supplierNames) {
                row.push(prices[supplierName] || '');
            }
            excelData.push(row);
        }
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        
        // Auto-size columns
        const colWidths = [];
        excelData[0].forEach((header, index) => {
            let maxLength = header.length;
            excelData.forEach(row => {
                if (row[index] && row[index].toString().length > maxLength) {
                    maxLength = row[index].toString().length;
                }
            });
            colWidths.push({ width: Math.min(maxLength + 2, 50) });
        });
        worksheet['!cols'] = colWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Price List');
        
        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx',
            compression: true
        });
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `database-export-${timestamp}.xlsx`;
        
        console.log(`✅ Export completed: ${productMap.size} products, ${suppliers.length} suppliers`);
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        
        // Send the Excel file
        res.end(excelBuffer);
        
    } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export database'
        });
    } finally {
        client.release();
    }
}));

module.exports = router;