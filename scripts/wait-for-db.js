const { Pool } = require('pg');

async function waitForDatabase(maxAttempts = 60) {
    const pool = new Pool({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
    });

    console.log('⏳ Waiting for database connection...');
    console.log(`🔗 Connecting to: ${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`);

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