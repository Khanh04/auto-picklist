const { pool } = require('../src/database/config');

/**
 * Add unique constraint to products.description column if it doesn't exist
 * This is needed to support ON CONFLICT clause in the import script
 */
async function addUniqueConstraintToProducts() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Checking products table unique constraint...');
        
        // Check if unique constraint already exists
        const constraintCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'products' 
            AND constraint_type = 'UNIQUE' 
            AND constraint_name = 'products_description_key'
        `);
        
        if (constraintCheck.rows.length > 0) {
            console.log('✅ Unique constraint on products.description already exists');
            return;
        }
        
        console.log('🔨 Adding unique constraint to products.description...');
        
        // Start transaction
        await client.query('BEGIN');
        
        // First, remove any duplicate descriptions, keeping the most recent
        console.log('📋 Checking for duplicate descriptions...');
        const duplicateCheck = await client.query(`
            SELECT description, COUNT(*) as count
            FROM products 
            GROUP BY description 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateCheck.rows.length > 0) {
            console.log(`⚠️  Found ${duplicateCheck.rows.length} duplicate descriptions. Removing older duplicates...`);
            
            // Remove older duplicate products (keep the most recent by id)
            await client.query(`
                DELETE FROM products 
                WHERE id NOT IN (
                    SELECT MAX(id) 
                    FROM products 
                    GROUP BY description
                )
            `);
            
            console.log('✅ Removed duplicate products');
        } else {
            console.log('✅ No duplicate descriptions found');
        }
        
        // Add the unique constraint
        await client.query(`
            ALTER TABLE products 
            ADD CONSTRAINT products_description_key 
            UNIQUE (description)
        `);
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log('✅ Successfully added unique constraint to products.description');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to add unique constraint:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Run migration if called directly
if (require.main === module) {
    addUniqueConstraintToProducts()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addUniqueConstraintToProducts };