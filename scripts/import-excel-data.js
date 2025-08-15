const XLSX = require('xlsx');
const { pool } = require('../src/database/config');

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

async function importExcelData() {
    const client = await pool.connect();
    
    try {
        console.log('📊 Starting Excel data import...');
        
        // Read Excel file
        const excelFile = 'GENERAL PRICE LIST.xlsx';
        console.log(`📖 Reading ${excelFile}...`);
        
        const workbook = XLSX.readFile(excelFile);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`📋 Found ${rawData.length} rows in Excel file`);

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
            throw new Error('Could not find item/product description column in Excel file');
        }
        
        // All other columns are potential supplier columns
        const supplierCols = columns.filter(col => col !== itemCol);
        console.log(`🏪 Found ${supplierCols.length} supplier columns:`, supplierCols.slice(0, 5), '...');

        // Start transaction
        await client.query('BEGIN');
        
        console.log('🧹 Clearing existing data...');
        await client.query('DELETE FROM supplier_prices');
        await client.query('DELETE FROM products');
        await client.query('DELETE FROM suppliers');
        
        // Reset sequences
        await client.query('ALTER SEQUENCE suppliers_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE products_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE supplier_prices_id_seq RESTART WITH 1');

        // Insert suppliers
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

        // Process products and prices
        console.log('📦 Processing products and prices...');
        let productCount = 0;
        let priceCount = 0;
        const processedProducts = new Set(); // To avoid duplicates
        
        for (const row of rawData) {
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
            
            // Insert product
            const productResult = await client.query(
                'INSERT INTO products (description, normalized_description) VALUES ($1, $2) RETURNING id',
                [description, normalizedDescription]
            );
            const productId = productResult.rows[0].id;
            productCount++;
            
            // Insert prices for this product
            for (const supplierCol of supplierCols) {
                const priceValue = row[supplierCol];
                
                if (priceValue !== undefined && priceValue !== null && priceValue !== '') {
                    // Parse price value
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
        }
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log('✅ Import completed successfully!');
        console.log(`📊 Import Summary:`);
        console.log(`   🏪 Suppliers: ${Object.keys(supplierIds).length}`);
        console.log(`   📦 Products: ${productCount}`);
        console.log(`   💰 Price entries: ${priceCount}`);
        
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
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Import failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run import if called directly
if (require.main === module) {
    importExcelData()
        .then(() => {
            console.log('\n🎉 Excel data import completed!');
            console.log('💡 You can now start the web application: npm run web');
            process.exit(0);
        })
        .catch(error => {
            console.error('Import failed:', error);
            process.exit(1);
        });
}

module.exports = { importExcelData };