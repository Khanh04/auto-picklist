const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { waitForDatabase } = require('./wait-for-db');

// Railway PostgreSQL connection using environment variables
const railwayPool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Local PostgreSQL connection (for data export)
const localPool = new Pool({
    user: process.env.LOCAL_DB_USER || process.env.USER || 'postgres',
    host: process.env.LOCAL_DB_HOST || 'localhost',
    database: process.env.LOCAL_DB_NAME || 'autopicklist',
    password: process.env.LOCAL_DB_PASSWORD || '',
    port: process.env.LOCAL_DB_PORT || 5432,
});

async function checkDatabaseExists() {
    try {
        const result = await railwayPool.query('SELECT NOW()');
        console.log('✅ Connected to Railway PostgreSQL database');
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to Railway database:', error.message);
        return false;
    }
}

async function setupDatabaseSchema() {
    console.log('🏗️  Setting up database schema...');
    
    try {
        // Create tables with all the latest schema
        await railwayPool.query(`
            -- Create suppliers table
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create products table
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create supplier_prices table
            CREATE TABLE IF NOT EXISTS supplier_prices (
                id SERIAL PRIMARY KEY,
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(supplier_id, product_id)
            );

            -- Create shopping_lists table
            CREATE TABLE IF NOT EXISTS shopping_lists (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create shopping_list_items table with purchased_quantity column
            CREATE TABLE IF NOT EXISTS shopping_list_items (
                id SERIAL PRIMARY KEY,
                shopping_list_id INTEGER REFERENCES shopping_lists(id) ON DELETE CASCADE,
                item_index INTEGER NOT NULL,
                purchased_quantity INTEGER DEFAULT 0 NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create matching_preferences table
            CREATE TABLE IF NOT EXISTS matching_preferences (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier_id ON supplier_prices(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_supplier_prices_product_id ON supplier_prices(product_id);
            CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);

            -- Create view for easy querying
            CREATE OR REPLACE VIEW product_supplier_prices AS
            SELECT 
                p.id as product_id,
                p.description,
                s.id as supplier_id,
                s.name as supplier_name,
                sp.price,
                sp.created_at
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id;
        `);

        console.log('✅ Database schema created successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to create database schema:', error.message);
        return false;
    }
}

async function migrateDataFromLocal() {
    console.log('🔄 Migrating data from local database...');
    
    try {
        // Check if local database is available
        const localResult = await localPool.query('SELECT COUNT(*) FROM suppliers');
        console.log(`📊 Found ${localResult.rows[0].count} suppliers in local database`);

        if (parseInt(localResult.rows[0].count) === 0) {
            console.log('ℹ️  No local data found, skipping migration');
            return true;
        }

        // Migrate suppliers
        const suppliers = await localPool.query('SELECT * FROM suppliers ORDER BY id');
        for (const supplier of suppliers.rows) {
            await railwayPool.query(`
                INSERT INTO suppliers (name, created_at) 
                VALUES ($1, $2) 
                ON CONFLICT (name) DO NOTHING
            `, [supplier.name, supplier.created_at]);
        }
        console.log(`✅ Migrated ${suppliers.rows.length} suppliers`);

        // Migrate products
        const products = await localPool.query('SELECT * FROM products ORDER BY id');
        for (const product of products.rows) {
            await railwayPool.query(`
                INSERT INTO products (description, created_at) 
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `, [product.description, product.created_at]);
        }
        console.log(`✅ Migrated ${products.rows.length} products`);

        // Migrate supplier_prices (requires mapping IDs)
        const supplierPrices = await localPool.query(`
            SELECT 
                s.name as supplier_name,
                p.description as product_description,
                sp.price,
                sp.created_at
            FROM supplier_prices sp
            JOIN suppliers s ON sp.supplier_id = s.id
            JOIN products p ON sp.product_id = p.id
        `);

        for (const sp of supplierPrices.rows) {
            await railwayPool.query(`
                INSERT INTO supplier_prices (supplier_id, product_id, price, created_at)
                SELECT s.id, p.id, $3, $4
                FROM suppliers s, products p
                WHERE s.name = $1 AND p.description = $2
                ON CONFLICT (supplier_id, product_id) DO NOTHING
            `, [sp.supplier_name, sp.product_description, sp.price, sp.created_at]);
        }
        console.log(`✅ Migrated ${supplierPrices.rows.length} supplier prices`);

        // Migrate shopping lists if they exist
        try {
            const shoppingLists = await localPool.query('SELECT * FROM shopping_lists');
            for (const list of shoppingLists.rows) {
                await railwayPool.query(`
                    INSERT INTO shopping_lists (name, created_at, updated_at)
                    VALUES ($1, $2, $3)
                    ON CONFLICT DO NOTHING
                `, [list.name, list.created_at, list.updated_at]);
            }
            console.log(`✅ Migrated ${shoppingLists.rows.length} shopping lists`);
        } catch (error) {
            console.log('ℹ️  No shopping lists found or error migrating them');
        }

        return true;
    } catch (error) {
        console.error('❌ Failed to migrate data from local database:', error.message);
        console.log('ℹ️  Continuing with empty database...');
        return true; // Don't fail deployment if local migration fails
    }
}

async function runPostMigrationTasks() {
    console.log('🔧 Running post-migration tasks...');
    
    try {
        // Update sequence counters to prevent ID conflicts
        await railwayPool.query(`
            SELECT setval(pg_get_serial_sequence('suppliers', 'id'), COALESCE(MAX(id), 1)) FROM suppliers;
            SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE(MAX(id), 1)) FROM products;
            SELECT setval(pg_get_serial_sequence('supplier_prices', 'id'), COALESCE(MAX(id), 1)) FROM supplier_prices;
            SELECT setval(pg_get_serial_sequence('shopping_lists', 'id'), COALESCE(MAX(id), 1)) FROM shopping_lists;
            SELECT setval(pg_get_serial_sequence('shopping_list_items', 'id'), COALESCE(MAX(id), 1)) FROM shopping_list_items;
        `);

        console.log('✅ Sequence counters updated');
        return true;
    } catch (error) {
        console.error('⚠️  Warning: Failed to update sequence counters:', error.message);
        return true; // Don't fail for this
    }
}

async function runMigration() {
    console.log('🚀 Starting Railway database migration...');
    console.log('📋 Environment:', process.env.NODE_ENV || 'development');
    
    try {
        // Wait for database to be ready
        await waitForDatabase();
        
        // Check Railway database connection
        const connected = await checkDatabaseExists();
        if (!connected) {
            console.error('❌ Cannot connect to Railway database');
            process.exit(1);
        }

        // Setup database schema
        const schemaCreated = await setupDatabaseSchema();
        if (!schemaCreated) {
            console.error('❌ Failed to create database schema');
            process.exit(1);
        }

        // Try to migrate from local database (optional)
        if (process.env.MIGRATE_FROM_LOCAL === 'true') {
            await migrateDataFromLocal();
        } else {
            console.log('ℹ️  Skipping local data migration (set MIGRATE_FROM_LOCAL=true to enable)');
        }

        // Run post-migration tasks
        await runPostMigrationTasks();

        console.log('🎉 Railway database migration completed successfully!');
        
        // Verify migration
        const supplierCount = await railwayPool.query('SELECT COUNT(*) FROM suppliers');
        const productCount = await railwayPool.query('SELECT COUNT(*) FROM products');
        
        console.log('📊 Final database state:');
        console.log(`   - Suppliers: ${supplierCount.rows[0].count}`);
        console.log(`   - Products: ${productCount.rows[0].count}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await railwayPool.end();
        try {
            await localPool.end();
        } catch (e) {
            // Ignore local pool errors
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigration };