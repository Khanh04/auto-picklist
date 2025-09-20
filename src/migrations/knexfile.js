// Knex.js configuration for auto-picklist migrations
const path = require('path');

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || process.env.USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'autopicklist'
    },
    migrations: {
      directory: path.join(__dirname, 'versions'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || {
      host: process.env.PGHOST || process.env.DB_HOST,
      port: process.env.PGPORT || process.env.DB_PORT || 5432,
      user: process.env.PGUSER || process.env.DB_USER,
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
      database: process.env.PGDATABASE || process.env.DB_NAME
    },
    migrations: {
      directory: path.join(__dirname, 'versions'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    pool: {
      min: 1,
      max: 3  // Railway connection limit
    },
    // Railway-specific SSL configuration
    ssl: process.env.RAILWAY_ENVIRONMENT ? false : { rejectUnauthorized: false }
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || 5432,
      user: process.env.TEST_DB_USER || process.env.USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || '',
      database: process.env.TEST_DB_NAME || 'autopicklist_test'
    },
    migrations: {
      directory: path.join(__dirname, 'versions'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    },
    pool: {
      min: 1,
      max: 2
    }
  }
};