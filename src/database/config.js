const { Pool } = require('pg');

const dbConfig = {
    user: process.env.DB_USER || process.env.USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'autopicklist',
    password: process.env.DB_PASSWORD || '', // No password for local development
    port: process.env.DB_PORT || 5432,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000, // How long to try connecting before timing out
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

module.exports = {
    pool,
    dbConfig
};