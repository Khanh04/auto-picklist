const { Pool } = require('pg');

// Connect to PostgreSQL server (without specific database) to create database
const serverPool = new Pool({
    user: process.env.DB_USER || process.env.USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || '', // No password for local development
    port: process.env.DB_PORT || 5432,
    database: 'postgres' // Connect to default postgres database
});

console.log(`🔌 Connecting as user: ${process.env.DB_USER || process.env.USER || 'postgres'}`);

async function setupDatabase() {
    const dbName = process.env.DB_NAME || 'autopicklist';
    
    try {
        console.log('🔧 Setting up PostgreSQL database...');

        // Check if database exists
        const dbCheckResult = await serverPool.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
        );

        if (dbCheckResult.rows.length === 0) {
            // Create database
            console.log(`📦 Creating database: ${dbName}`);
            await serverPool.query(`CREATE DATABASE ${dbName}`);
        } else {
            console.log(`✅ Database ${dbName} already exists`);
        }

        // Close server connection
        await serverPool.end();

        // Connect to the new database to create tables
        const dbPool = new Pool({
            user: process.env.DB_USER || process.env.USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: dbName,
            password: process.env.DB_PASSWORD || '', // No password for local development
            port: process.env.DB_PORT || 5432,
        });

        console.log('🏗️  Creating database schema...');

        // Create suppliers table
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create products table
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                normalized_description TEXT, -- For faster searching
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create supplier_prices table (junction table)
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS supplier_prices (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(product_id, supplier_id)
            )
        `);

        // Create indexes for better performance
        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_products_description 
            ON products USING GIN(to_tsvector('english', description))
        `);
        
        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_products_normalized 
            ON products(normalized_description)
        `);
        
        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_supplier_prices_product 
            ON supplier_prices(product_id)
        `);
        
        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier 
            ON supplier_prices(supplier_id)
        `);

        // Create a view for easier querying
        await dbPool.query(`
            CREATE OR REPLACE VIEW product_supplier_prices AS
            SELECT 
                p.id as product_id,
                p.description,
                p.normalized_description,
                s.id as supplier_id,
                s.name as supplier_name,
                sp.price,
                sp.updated_at
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
        `);

        console.log('✅ Database schema created successfully!');
        console.log('📊 Tables created:');
        console.log('   - suppliers (supplier information)');
        console.log('   - products (product descriptions)');
        console.log('   - supplier_prices (pricing data)');
        console.log('   - product_supplier_prices (view for queries)');

        await dbPool.end();

    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    setupDatabase()
        .then(() => {
            console.log('🎉 Database setup completed!');
            console.log('💡 Next steps:');
            console.log('   1. Run: npm run import-data');
            console.log('   2. Start the application: npm run web');
            process.exit(0);
        })
        .catch(error => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupDatabase };