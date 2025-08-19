const { pool } = require('../src/database/config');

/**
 * Validate that the database setup was successful
 */
async function validateSetup() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Validating database setup...\n');
        
        // Check if all required tables exist
        const tableCheck = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        const tables = tableCheck.rows.map(row => row.table_name);
        const requiredTables = ['suppliers', 'products', 'supplier_prices'];
        
        console.log('📋 Tables found:', tables);
        
        for (const table of requiredTables) {
            if (!tables.includes(table)) {
                throw new Error(`❌ Required table missing: ${table}`);
            }
        }
        console.log('✅ All required tables exist\n');
        
        // Check if data exists
        const supplierCount = await client.query('SELECT COUNT(*) FROM suppliers');
        const productCount = await client.query('SELECT COUNT(*) FROM products'); 
        const priceCount = await client.query('SELECT COUNT(*) FROM supplier_prices');
        
        console.log('📊 Data summary:');
        console.log(`   🏪 Suppliers: ${supplierCount.rows[0].count}`);
        console.log(`   📦 Products: ${productCount.rows[0].count}`);
        console.log(`   💰 Price entries: ${priceCount.rows[0].count}\n`);
        
        if (parseInt(supplierCount.rows[0].count) === 0) {
            console.log('⚠️  No suppliers found - you may need to run: npm run import-data');
            return false;
        }
        
        if (parseInt(productCount.rows[0].count) === 0) {
            console.log('⚠️  No products found - you may need to run: npm run import-data'); 
            return false;
        }
        
        // Test a sample query like the app would use
        console.log('🔍 Testing sample query...');
        const sampleQuery = await client.query(`
            SELECT 
                p.description,
                s.name as supplier,
                sp.price
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
            LIMIT 3
        `);
        
        console.log('📋 Sample matching data:');
        sampleQuery.rows.forEach((row, i) => {
            console.log(`   ${i+1}. "${row.description}" - ${row.supplier}: $${row.price}`);
        });
        
        console.log('\n✅ Database validation successful!');
        console.log('🎉 Your auto-picklist system is ready to use');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Validation failed:', error.message);
        
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
            console.log('\n💡 Database schema missing. Run: npm run setup-db');
        } else if (error.message.includes('connect')) {
            console.log('\n💡 Database connection failed. Check PostgreSQL is running and configuration is correct.');
        }
        
        return false;
        
    } finally {
        client.release();
    }
}

// Run if called directly
if (require.main === module) {
    validateSetup()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Validation error:', error);
            process.exit(1);
        });
}

module.exports = { validateSetup };