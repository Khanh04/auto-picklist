const { Pool } = require('pg');

// Connect to the database
const dbPool = new Pool({
    user: process.env.DB_USER || process.env.USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'autopicklist',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

async function addPartialQuantityColumn() {
    try {
        console.log('🏗️  Adding purchased_quantity column to shopping_list_items...');

        // Check if column already exists
        const columnCheck = await dbPool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'shopping_list_items' 
            AND column_name = 'purchased_quantity'
        `);

        if (columnCheck.rows.length === 0) {
            // Add the purchased_quantity column
            await dbPool.query(`
                ALTER TABLE shopping_list_items 
                ADD COLUMN purchased_quantity INTEGER DEFAULT 0 NOT NULL
            `);
            console.log('✅ Added purchased_quantity column');
        } else {
            console.log('✅ purchased_quantity column already exists');
        }

        console.log('✅ Migration completed successfully!');
        console.log('📊 shopping_list_items table now supports partial quantities');

        await dbPool.end();

    } catch (error) {
        console.error('❌ Failed to add purchased_quantity column:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    addPartialQuantityColumn()
        .then(() => {
            console.log('🎉 Partial quantity column migration completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addPartialQuantityColumn };