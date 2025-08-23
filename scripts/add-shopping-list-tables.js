const { Pool } = require('pg');

// Connect to the database
const dbPool = new Pool({
    user: process.env.DB_USER || process.env.USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'autopicklist',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

async function addShoppingListTables() {
    try {
        console.log('🏗️  Adding shopping list tables...');

        // Create shopping_lists table to store shared shopping list metadata
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS shopping_lists (
                id SERIAL PRIMARY KEY,
                share_id VARCHAR(32) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL DEFAULT 'Shopping List',
                picklist_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
            )
        `);

        // Create shopping_list_items table to store individual item states
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS shopping_list_items (
                id SERIAL PRIMARY KEY,
                shopping_list_id INTEGER REFERENCES shopping_lists(id) ON DELETE CASCADE,
                item_index INTEGER NOT NULL,
                is_checked BOOLEAN DEFAULT FALSE,
                checked_at TIMESTAMP NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(shopping_list_id, item_index)
            )
        `);

        // Create indexes for performance
        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_shopping_lists_share_id 
            ON shopping_lists(share_id)
        `);

        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_shopping_lists_expires_at 
            ON shopping_lists(expires_at)
        `);

        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id 
            ON shopping_list_items(shopping_list_id)
        `);

        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_shopping_list_items_updated_at 
            ON shopping_list_items(updated_at)
        `);

        // Create a function to clean up expired shopping lists
        await dbPool.query(`
            CREATE OR REPLACE FUNCTION cleanup_expired_shopping_lists()
            RETURNS INTEGER AS $$
            DECLARE
                deleted_count INTEGER;
            BEGIN
                DELETE FROM shopping_lists WHERE expires_at < CURRENT_TIMESTAMP;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                RETURN deleted_count;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('✅ Shopping list tables created successfully!');
        console.log('📊 New tables:');
        console.log('   - shopping_lists (shared shopping list metadata)');
        console.log('   - shopping_list_items (individual item check states)');
        console.log('   - cleanup_expired_shopping_lists() function');

        await dbPool.end();

    } catch (error) {
        console.error('❌ Failed to add shopping list tables:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    addShoppingListTables()
        .then(() => {
            console.log('🎉 Shopping list tables migration completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addShoppingListTables };