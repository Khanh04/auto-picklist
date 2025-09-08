const { Pool } = require('pg');

async function waitForDatabase(maxAttempts = 60) {
    // Check for Railway database URL first, then individual variables
    const databaseUrl = process.env.DATABASE_URL;
    
    let config;
    if (databaseUrl) {
        config = {
            connectionString: databaseUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 5000,
        };
        console.log('⏳ Waiting for database connection...');
        console.log('🔗 Using DATABASE_URL connection string');
    } else {
        // Fallback to individual environment variables
        config = {
            user: process.env.PGUSER || process.env.DB_USER,
            host: process.env.PGHOST || process.env.DB_HOST,
            database: process.env.PGDATABASE || process.env.DB_NAME,
            password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
            port: process.env.PGPORT || process.env.DB_PORT || 5432,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 5000,
        };
        console.log('⏳ Waiting for database connection...');
        console.log(`🔗 Connecting to: ${config.host}:${config.port}/${config.database}`);
    }
    
    const pool = new Pool(config);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await pool.query('SELECT NOW()');
            console.log('✅ Database connection established');
            await pool.end();
            return true;
        } catch (error) {
            console.log(`⏳ Database not ready (attempt ${attempt}/${maxAttempts}): ${error.message}`);
            
            if (attempt === maxAttempts) {
                console.error('❌ Database connection timeout');
                await pool.end();
                throw new Error(`Failed to connect to database after ${maxAttempts} attempts`);
            }
            
            // Wait 2 seconds before next attempt
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

if (require.main === module) {
    waitForDatabase()
        .then(() => {
            console.log('✅ Database is ready');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Database connection failed:', error.message);
            process.exit(1);
        });
}

module.exports = { waitForDatabase };