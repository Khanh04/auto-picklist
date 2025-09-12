const XLSX = require('xlsx');
const { pool } = require('../database/config');

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
 * Excel Import Service - Handles additive imports from Excel files
 * Preserves existing data and user preferences
 */
class ExcelImportService {
    /**
     * Import Excel data into database using additive approach
     * @param {string} filePath - Path to Excel file
     * @param {Object} options - Import options
     * @param {boolean} options.preserveData - Whether to preserve existing data (default: true)
     * @param {Function} options.progressCallback - Optional progress callback function
     * @returns {Object} Import results
     */
    async importExcelFile(filePath, options = {}) {
        const { 
            preserveData = true, 
            progressCallback = null 
        } = options;

        const client = await pool.connect();
        
        try {
            console.log('📊 Starting Excel data import...');
            
            // Verify database schema exists
            console.log('🔍 Verifying database schema...');
            const tableCheck = await client.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name IN ('suppliers', 'products', 'supplier_prices')
            `);
            
            if (tableCheck.rows.length < 3) {
                throw new Error('❌ Database schema not found. Please run: npm run setup-db');
            }
            console.log('✅ Database schema verified');
            
            // Read Excel file
            console.log(`📖 Reading Excel file: ${filePath}...`);
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

            // Get all column names by examining all rows
            const allColumns = new Set();
            rawData.forEach(row => {
                Object.keys(row).forEach(key => allColumns.add(key));
            });
            const columns = Array.from(allColumns);
            
            // Find item column
            const itemCol = columns.find(col => 
                ['item', 'product', 'name', 'description'].some(keyword => 
                    col.toLowerCase().includes(keyword)
                )
            );
            
            if (!itemCol) {
                throw new Error('Could not find item/product description column in Excel file. Please ensure you have a column with "item", "product", "name", or "description" in the header.');
            }
            
            // All other columns are potential supplier columns
            const supplierCols = columns.filter(col => col !== itemCol);
            console.log(`🏪 Found ${supplierCols.length} supplier columns:`, supplierCols.slice(0, 5), '...');

            if (supplierCols.length === 0) {
                throw new Error('No supplier columns found. Excel file should have supplier names as column headers.');
            }

            // Start transaction
            await client.query('BEGIN');
            
            if (!preserveData) {
                console.log('🧹 Clearing existing data...');
                await client.query('DELETE FROM supplier_prices');
                await client.query('DELETE FROM products');
                await client.query('DELETE FROM suppliers');
                
                // Reset sequences
                await client.query('ALTER SEQUENCE suppliers_id_seq RESTART WITH 1');
                await client.query('ALTER SEQUENCE products_id_seq RESTART WITH 1');
                await client.query('ALTER SEQUENCE supplier_prices_id_seq RESTART WITH 1');
            } else {
                console.log('🔄 Preparing for additive import (preserving existing data)...');
            }

            // Insert or get existing suppliers
            console.log('🏪 Processing suppliers (insert new, get existing)...');
            const supplierIds = {};
            for (const supplierName of supplierCols) {
                if (preserveData) {
                    // Try to insert, or get existing supplier ID
                    const result = await client.query(
                        'INSERT INTO suppliers (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                        [supplierName]
                    );
                    supplierIds[supplierName] = result.rows[0].id;
                } else {
                    // Direct insert for destructive mode
                    const result = await client.query(
                        'INSERT INTO suppliers (name) VALUES ($1) RETURNING id',
                        [supplierName]
                    );
                    supplierIds[supplierName] = result.rows[0].id;
                }
            }
            console.log(`✅ Processed ${Object.keys(supplierIds).length} suppliers`);

            // Process products and prices
            console.log('📦 Processing products and prices...');
            let newProductCount = 0;
            let updatedProductCount = 0;
            let newPriceCount = 0;
            let updatedPriceCount = 0;
            let errorCount = 0;
            const processedProducts = new Set(); // To avoid duplicates
            const errors = [];
            
            for (const [index, row] of rawData.entries()) {
                try {
                    const description = String(row[itemCol] || '').trim();
                    
                    if (!description || description.length < 3) {
                        continue; // Skip empty or too short descriptions
                    }
                    
                    // Skip if we've already processed this exact description in this batch
                    if (processedProducts.has(description)) {
                        continue;
                    }
                    processedProducts.add(description);
                    
                    const normalizedDescription = normalizeItemName(description);
                    
                    let productId;
                    let isNewProduct;

                    if (preserveData) {
                        // Insert or update product based on description
                        const productResult = await client.query(
                            `INSERT INTO products (description, normalized_description, updated_at) 
                             VALUES ($1, $2, CURRENT_TIMESTAMP) 
                             ON CONFLICT (description) DO UPDATE SET 
                                normalized_description = EXCLUDED.normalized_description,
                                updated_at = CURRENT_TIMESTAMP
                             RETURNING id, (xmax = 0) AS is_new`,
                            [description, normalizedDescription]
                        );
                        productId = productResult.rows[0].id;
                        isNewProduct = productResult.rows[0].is_new;
                        
                        if (isNewProduct) {
                            newProductCount++;
                        } else {
                            updatedProductCount++;
                        }
                    } else {
                        // Direct insert for destructive mode
                        const productResult = await client.query(
                            'INSERT INTO products (description, normalized_description) VALUES ($1, $2) RETURNING id',
                            [description, normalizedDescription]
                        );
                        productId = productResult.rows[0].id;
                        newProductCount++;
                    }
                    
                    // Process prices for this product
                    for (const supplierCol of supplierCols) {
                        const priceValue = row[supplierCol];
                        
                        if (priceValue !== undefined && priceValue !== null && priceValue !== '') {
                            // Parse price value
                            const priceStr = String(priceValue).replace(/[@$,\s]/g, '');
                            const price = parseFloat(priceStr);
                            
                            if (!isNaN(price) && price > 0) {
                                if (preserveData) {
                                    // Insert or update price
                                    const priceResult = await client.query(
                                        `INSERT INTO supplier_prices (product_id, supplier_id, price, updated_at) 
                                         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                                         ON CONFLICT (product_id, supplier_id) DO UPDATE SET 
                                            price = EXCLUDED.price,
                                            updated_at = CURRENT_TIMESTAMP
                                         RETURNING (xmax = 0) AS is_new`,
                                        [productId, supplierIds[supplierCol], price]
                                    );
                                    
                                    if (priceResult.rows[0].is_new) {
                                        newPriceCount++;
                                    } else {
                                        updatedPriceCount++;
                                    }
                                } else {
                                    // Direct insert for destructive mode
                                    await client.query(
                                        'INSERT INTO supplier_prices (product_id, supplier_id, price) VALUES ($1, $2, $3)',
                                        [productId, supplierIds[supplierCol], price]
                                    );
                                    newPriceCount++;
                                }
                            }
                        }
                    }
                    
                    // Progress indicator
                    const totalProcessed = newProductCount + updatedProductCount;
                    if (totalProcessed % 100 === 0) {
                        const message = preserveData 
                            ? `   📦 Processed ${totalProcessed} products (${newProductCount} new, ${updatedProductCount} updated)...`
                            : `   📦 Processed ${totalProcessed} products, ${newPriceCount + updatedPriceCount} prices...`;
                        console.log(message);
                        
                        // Call progress callback if provided
                        if (progressCallback) {
                            progressCallback({
                                totalRows: rawData.length,
                                processedRows: index + 1,
                                newProducts: newProductCount,
                                updatedProducts: updatedProductCount,
                                newPrices: newPriceCount,
                                updatedPrices: updatedPriceCount,
                                errors: errorCount
                            });
                        }
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
            const summary = {
                suppliers: Object.keys(supplierIds).length,
                totalProducts: newProductCount + updatedProductCount,
                newProducts: newProductCount,
                updatedProducts: updatedProductCount,
                totalPrices: newPriceCount + updatedPriceCount,
                newPrices: newPriceCount,
                updatedPrices: updatedPriceCount,
                errors: errorCount,
                totalRows: rawData.length
            };

            console.log(`📊 Import Summary:`);
            console.log(`   🏪 Suppliers: ${summary.suppliers}`);
            if (preserveData) {
                console.log(`   📦 Products: ${summary.totalProducts} total (${summary.newProducts} new, ${summary.updatedProducts} updated)`);
                console.log(`   💰 Price entries: ${summary.totalPrices} total (${summary.newPrices} new, ${summary.updatedPrices} updated)`);
            } else {
                console.log(`   📦 Products: ${summary.totalProducts}`);
                console.log(`   💰 Price entries: ${summary.totalPrices}`);
            }
            console.log(`   ❌ Errors: ${summary.errors}`);
            
            // Show some sample data
            console.log('\n📋 Sample data verification:');
            const sampleQuery = `
                SELECT 
                    p.description, 
                    s.name as supplier, 
                    sp.price 
                FROM products p 
                JOIN supplier_prices sp ON p.id = sp.product_id 
                JOIN suppliers s ON sp.supplier_id = s.id 
                ORDER BY p.description 
                LIMIT 5
            `;
            const sampleResult = await client.query(sampleQuery);
            
            sampleResult.rows.forEach(row => {
                console.log(`   "${row.description}" - ${row.supplier}: $${row.price}`);
            });

            return {
                success: true,
                summary,
                errors: errors.slice(0, 50), // Limit errors for response size
                warnings: errors.length > 50 ? [`... and ${errors.length - 50} more errors`] : []
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Import failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = { ExcelImportService, normalizeItemName };