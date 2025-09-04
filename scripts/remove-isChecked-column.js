const { Pool } = require('pg');

// Connect to the database
const dbPool = new Pool({
    user: process.env.DB_USER || process.env.USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'autopicklist',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

async function removeIsCheckedColumn() {
    try {
        console.log('🏗️  Removing isChecked column from shopping_list_items...');

        // Check if column exists
        const columnCheck = await dbPool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'shopping_list_items' 
            AND column_name = 'is_checked'
        `);

        if (columnCheck.rows.length > 0) {
            // Remove the is_checked column
            await dbPool.query(`
                ALTER TABLE shopping_list_items 
                DROP COLUMN is_checked
            `);
            console.log('✅ Removed is_checked column');
        } else {
            console.log('✅ is_checked column does not exist');
        }

        // Also remove checked_at since it's no longer needed
        const checkedAtCheck = await dbPool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'shopping_list_items' 
            AND column_name = 'checked_at'
        `);

        if (checkedAtCheck.rows.length > 0) {
            await dbPool.query(`
                ALTER TABLE shopping_list_items 
                DROP COLUMN checked_at
            `);
            console.log('✅ Removed checked_at column');
        }

        console.log('✅ Migration completed successfully!');
        console.log('📊 shopping_list_items table now uses only purchasedQuantity');

        await dbPool.end();

    } catch (error) {
        console.error('❌ Failed to remove isChecked column:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    removeIsCheckedColumn()
        .then(() => {
            console.log('🎉 isChecked column removal completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { removeIsCheckedColumn };