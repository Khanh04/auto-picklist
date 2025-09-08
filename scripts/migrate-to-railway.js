const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { waitForDatabase } = require('./wait-for-db');

// Railway PostgreSQL connection using environment variables
const getRailwayConfig = () => {
    const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
    
    if (databaseUrl) {
        return {
            connectionString: databaseUrl,
            ssl: false, // Railway internal network doesn't need SSL
            connectionTimeoutMillis: 10000,
        };
    } else {
        return {
            user: process.env.PGUSER || process.env.DB_USER,
            host: process.env.PGHOST || process.env.DB_HOST,
            database: process.env.PGDATABASE || process.env.DB_NAME,
            password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
            port: process.env.PGPORT || process.env.DB_PORT || 5432,
            ssl: false, // Railway internal network doesn't need SSL
            connectionTimeoutMillis: 10000,
        };
    }
};

const railwayPool = new Pool(getRailwayConfig());

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

async function migrateMatchingPreferencesTable() {
    console.log('🔧 Migrating matching_preferences table...');
    
    try {
        // Check if table exists and get its columns
        const tableExists = await railwayPool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'matching_preferences'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            // Create table with full schema
            await railwayPool.query(`
                CREATE TABLE matching_preferences (
                    id SERIAL PRIMARY KEY,
                    original_item TEXT NOT NULL,
                    matched_product_id INTEGER NOT NULL,
                    frequency INTEGER DEFAULT 1,
                    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (matched_product_id) REFERENCES products(id),
                    UNIQUE(original_item, matched_product_id)
                )
            `);
            console.log('✅ Created matching_preferences table with full schema');
        } else {
            // Table exists, check and add missing columns
            const columns = await railwayPool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'matching_preferences'
            `);
            
            const existingColumns = columns.rows.map(row => row.column_name);
            console.log('📋 Existing columns:', existingColumns.join(', '));
            
            // Add missing columns
            if (!existingColumns.includes('original_item')) {
                await railwayPool.query(`ALTER TABLE matching_preferences ADD COLUMN original_item TEXT`);
                console.log('✅ Added original_item column');
            }
            
            if (!existingColumns.includes('matched_product_id')) {
                await railwayPool.query(`ALTER TABLE matching_preferences ADD COLUMN matched_product_id INTEGER`);
                console.log('✅ Added matched_product_id column');
            }
            
            if (!existingColumns.includes('frequency')) {
                await railwayPool.query(`ALTER TABLE matching_preferences ADD COLUMN frequency INTEGER DEFAULT 1`);
                console.log('✅ Added frequency column');
            }
            
            if (!existingColumns.includes('last_used')) {
                await railwayPool.query(`ALTER TABLE matching_preferences ADD COLUMN last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
                console.log('✅ Added last_used column');
            }
            
            // Try to add constraints (ignore errors if they exist)
            try {
                await railwayPool.query(`
                    ALTER TABLE matching_preferences 
                    ADD CONSTRAINT fk_matched_product_id 
                    FOREIGN KEY (matched_product_id) REFERENCES products(id)
                `);
                console.log('✅ Added foreign key constraint');
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.log('ℹ️  Foreign key constraint issue:', error.message);
                }
            }
            
            try {
                await railwayPool.query(`
                    ALTER TABLE matching_preferences 
                    ADD CONSTRAINT unique_original_matched 
                    UNIQUE(original_item, matched_product_id)
                `);
                console.log('✅ Added unique constraint');
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.log('ℹ️  Unique constraint issue:', error.message);
                }
            }
        }
        
        console.log('✅ matching_preferences table migration completed');
        
    } catch (error) {
        console.error('❌ Failed to migrate matching_preferences table:', error.message);
        throw error;
    }
}

async function setupDatabaseSchema() {
    console.log('🏗️  Setting up database schema...');
    
    try {
        // Create tables with all the latest schema (step by step for better error handling)
        
        // Create suppliers table
        await railwayPool.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create products table  
        await railwayPool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                search_description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create supplier_prices table
        await railwayPool.query(`
            CREATE TABLE IF NOT EXISTS supplier_prices (
                id SERIAL PRIMARY KEY,
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(supplier_id, product_id)
            )
        `);

        // Create shopping_lists table
        await railwayPool.query(`
            CREATE TABLE IF NOT EXISTS shopping_lists (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create shopping_list_items table with purchased_quantity column
        await railwayPool.query(`
            CREATE TABLE IF NOT EXISTS shopping_list_items (
                id SERIAL PRIMARY KEY,
                shopping_list_id INTEGER REFERENCES shopping_lists(id) ON DELETE CASCADE,
                item_index INTEGER NOT NULL,
                purchased_quantity INTEGER DEFAULT 0 NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Handle matching_preferences table migration
        await migrateMatchingPreferencesTable();

        // Create indexes for better performance
        await railwayPool.query(`
            CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier_id ON supplier_prices(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_supplier_prices_product_id ON supplier_prices(product_id);
            CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
            CREATE INDEX IF NOT EXISTS idx_matching_preferences_original_item ON matching_preferences(original_item);
            CREATE INDEX IF NOT EXISTS idx_matching_preferences_product_id ON matching_preferences(matched_product_id);
        `);

        // Create view for easy querying (drop first to avoid conflicts)
        await railwayPool.query(`DROP VIEW IF EXISTS product_supplier_prices`);
        await railwayPool.query(`
            CREATE VIEW product_supplier_prices AS
            SELECT 
                p.id as product_id,
                p.description,
                s.id as supplier_id,
                s.name as supplier_name,
                sp.price,
                sp.created_at
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
        `);

        console.log('✅ Database schema created successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to create database schema:', error.message);
        return false;
    }
}

async function importSeedData() {
    console.log('🔄 Importing seed data from dump file...');
    
    try {
        const path = require('path');
        const fs = require('fs');
        
        // Try multiple possible paths for the seed data file
        const possiblePaths = [
            path.join(__dirname, '..', 'data', 'seed-data.sql'),
            path.join(process.cwd(), 'data', 'seed-data.sql'),
            path.join(__dirname, '..', '..', 'data', 'seed-data.sql'),
            './data/seed-data.sql'
        ];
        
        let seedDataPath = null;
        for (const testPath of possiblePaths) {
            console.log(`🔍 Checking for seed data at: ${testPath}`);
            if (fs.existsSync(testPath)) {
                seedDataPath = testPath;
                console.log(`✅ Found seed data file at: ${seedDataPath}`);
                break;
            }
        }
        
        if (!seedDataPath) {
            console.log('ℹ️  No seed data file found at any location');
            console.log('📂 Current working directory:', process.cwd());
            console.log('📂 Script directory:', __dirname);
            return false;
        }
        
        // Read the SQL dump file
        const seedData = fs.readFileSync(seedDataPath, 'utf8');
        console.log(`📊 Found seed data file (${Math.round(seedData.length / 1024)}KB)`);
        
        // Execute the complete SQL dump (contains schema + data)
        console.log('🔄 Executing complete database dump (schema + data)...');
        
        // Execute with error handling for constraint issues
        try {
            await railwayPool.query(seedData);
        } catch (error) {
            if (error.message.includes('depends on it') || error.message.includes('does not exist')) {
                console.log('ℹ️  Some constraints/objects already exist or missing, continuing...');
                
                // Try to execute in parts - split on statement terminators and execute individually
                const statements = seedData.split(';').filter(stmt => stmt.trim().length > 0);
                
                for (const statement of statements) {
                    try {
                        if (statement.trim()) {
                            await railwayPool.query(statement.trim());
                        }
                    } catch (stmtError) {
                        // Log but don't fail on individual statement errors
                        if (!stmtError.message.includes('already exists') && 
                            !stmtError.message.includes('does not exist') &&
                            !stmtError.message.includes('depends on it')) {
                            console.log(`⚠️  Statement warning: ${stmtError.message.substring(0, 100)}`);
                        }
                    }
                }
            } else {
                throw error; // Re-throw if it's not a constraint issue
            }
        }
        
        // Check what was imported
        const supplierCount = await railwayPool.query('SELECT COUNT(*) FROM suppliers');
        const productCount = await railwayPool.query('SELECT COUNT(*) FROM products');
        const priceCount = await railwayPool.query('SELECT COUNT(*) FROM supplier_prices');
        
        console.log(`✅ Imported seed data successfully:`);
        console.log(`   - ${supplierCount.rows[0].count} suppliers`);
        console.log(`   - ${productCount.rows[0].count} products`);
        console.log(`   - ${priceCount.rows[0].count} supplier prices`);
        
        return true;
    } catch (error) {
        console.log('ℹ️  Failed to import seed data:', error.message);
        return false;
    }
}

async function migrateDataFromLocalDatabase() {
    console.log('🔄 Attempting local database migration...');
    
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

        // Try to import from complete seed file first (includes schema + data)
        console.log('🔄 Attempting to import from seed file...');
        const dataImported = await importSeedData();
        
        if (!dataImported) {
            console.log('📋 No seed data imported, setting up basic schema and trying local migration...');
            // Create schema first, then try local migration
            const schemaCreated = await setupDatabaseSchema();
            if (!schemaCreated) {
                console.error('❌ Failed to create database schema');
                process.exit(1);
            }
            
            // Try local database migration as fallback
            await migrateDataFromLocalDatabase();
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