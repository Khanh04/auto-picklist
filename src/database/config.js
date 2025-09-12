const { Pool } = require('pg');
const config = require('../config');

const dbConfig = {
    user: config.database.user,
    host: config.database.host,
    database: config.database.name,
    password: config.database.password,
    port: config.database.port,
    max: config.database.maxConnections,
    min: 0, // Minimum pool size
    idleTimeoutMillis: config.database.idleTimeoutMs,
    connectionTimeoutMillis: config.database.connectionTimeoutMs,
    acquireTimeoutMillis: config.database.acquireTimeoutMillis,
    // Handle Railway SSL requirements
    ssl: process.env.RAILWAY_ENVIRONMENT ? 
        // Railway provides secure internal network, no SSL needed
        false : 
        // For external PostgreSQL connections in production, use SSL
        config.isProduction() ? { rejectUnauthorized: false } : false
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors gracefully
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err.message);
    // Don't exit process on database errors - let the application handle it
    // process.exit(-1);
});

// Add connection logging in development
if (config.isDevelopment()) {
    pool.on('connect', (client) => {
        console.log('New client connected to database');
    });
    
    pool.on('remove', (client) => {
        console.log('Client removed from database pool');
    });
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database pool...');
    try {
        await pool.end();
        console.log('Database pool closed gracefully');
    } catch (err) {
        console.error('Error closing database pool:', err);
    }
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing database pool...');
    try {
        await pool.end();
        console.log('Database pool closed gracefully');
        process.exit(0);
    } catch (err) {
        console.error('Error closing database pool:', err);
        process.exit(1);
    }
});

module.exports = {
    pool,
    dbConfig
};