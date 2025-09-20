const knex = require('knex');
const path = require('path');

/**
 * Migration Manager for auto-picklist
 * Handles automatic database migrations using Knex.js
 */
class MigrationManager {
  constructor() {
    const environment = process.env.NODE_ENV || 'development';
    const knexConfig = require('./knexfile.js')[environment];
    this.knex = knex(knexConfig);
    this.environment = environment;
  }

  /**
   * Run all pending migrations
   * @param {Object} options - Migration options
   * @returns {Promise<Array>} Applied migrations
   */
  async migrate(options = {}) {
    try {
      console.log(`🔄 Running database migrations (${this.environment})...`);

      const [batchNo, log] = await this.knex.migrate.latest({
        directory: path.join(__dirname, 'versions')
      });

      if (log.length === 0) {
        console.log('✅ Database is already up to date');
      } else {
        console.log(`✅ Batch ${batchNo} applied ${log.length} migrations:`);
        log.forEach(migration => {
          console.log(`   • ${migration}`);
        });
      }

      return log;
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Rollback the last batch of migrations
   * @param {Object} options - Rollback options
   * @returns {Promise<Array>} Rolled back migrations
   */
  async rollback(options = {}) {
    try {
      console.log('🔄 Rolling back last migration batch...');

      const [batchNo, log] = await this.knex.migrate.rollback({
        directory: path.join(__dirname, 'versions')
      });

      if (log.length === 0) {
        console.log('✅ Already at the base migration');
      } else {
        console.log(`✅ Batch ${batchNo} rolled back ${log.length} migrations:`);
        log.forEach(migration => {
          console.log(`   • ${migration}`);
        });
      }

      return log;
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Get current migration status
   * @returns {Promise<Object>} Migration status information
   */
  async status() {
    try {
      const [completed, pending] = await this.knex.migrate.list({
        directory: path.join(__dirname, 'versions')
      });

      return {
        currentVersion: completed.length > 0 ? completed[completed.length - 1] : null,
        completedMigrations: completed || [],
        pendingMigrations: pending || []
      };
    } catch (error) {
      console.error('❌ Failed to get migration status:', error.message);
      throw error;
    }
  }

  /**
   * Check if database needs migration
   * @returns {Promise<boolean>} True if migrations are pending
   */
  async needsMigration() {
    try {
      const status = await this.status();
      return status.pendingMigrations.length > 0;
    } catch (error) {
      // If we can't check status, assume migration is needed
      console.warn('⚠️  Could not check migration status, assuming migration needed');
      return true;
    }
  }

  /**
   * Validate database schema matches migrations
   * @returns {Promise<boolean>} True if schema is valid
   */
  async validate() {
    try {
      const status = await this.status();

      if (status.pendingMigrations.length > 0) {
        console.log(`⚠️  ${status.pendingMigrations.length} pending migrations found`);
        return false;
      }

      // Check if core tables exist
      const coreTable = await this.knex.schema.hasTable('products');
      if (!coreTable) {
        console.log('⚠️  Core tables missing');
        return false;
      }

      console.log('✅ Database schema is valid');
      return true;
    } catch (error) {
      console.error('❌ Schema validation failed:', error.message);
      return false;
    }
  }

  /**
   * Make a new migration file
   * @param {string} name - Migration name
   * @returns {Promise<string>} Created migration file path
   */
  async makeMigration(name) {
    try {
      const migrationName = await this.knex.migrate.make(name, {
        directory: path.join(__dirname, 'versions')
      });

      console.log(`✅ Created migration: ${migrationName}`);
      return migrationName;
    } catch (error) {
      console.error('❌ Failed to create migration:', error.message);
      throw error;
    }
  }

  /**
   * Run database seeds
   * @returns {Promise<Array>} Executed seed files
   */
  async seed() {
    try {
      console.log('🌱 Running database seeds...');

      const log = await this.knex.seed.run({
        directory: path.join(__dirname, 'seeds')
      });

      console.log(`✅ Executed ${log.length} seed files:`);
      log.forEach(seed => {
        console.log(`   • ${seed}`);
      });

      return log;
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.knex.destroy();
  }

  /**
   * Get the Knex instance for advanced operations
   * @returns {Object} Knex instance
   */
  getKnex() {
    return this.knex;
  }
}

module.exports = MigrationManager;