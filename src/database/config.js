const { Pool } = require('pg');
const config = require('../config');

const dbConfig = {
    user: config.database.user,
    host: config.database.host,
    database: config.database.name,
    password: config.database.password,
    port: config.database.port,
    max: config.database.maxConnections,
    idleTimeoutMillis: config.database.idleTimeoutMs,
    connectionTimeoutMillis: config.database.connectionTimeoutMs,
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