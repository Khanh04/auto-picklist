#!/usr/bin/env node

const MigrationManager = require('./MigrationManager');
const path = require('path');

/**
 * Integration script to migrate from old database setup to Knex migrations
 * This script handles existing databases that were created with the old scripts
 */
class DatabaseIntegrator {
  constructor() {
    this.migrationManager = new MigrationManager();
    this.knex = this.migrationManager.getKnex();
  }

  /**
   * Check if database has existing data
   */
  async checkExistingData() {
    try {
      // Check if core tables exist
      const hasSuppliers = await this.knex.schema.hasTable('suppliers');
      const hasProducts = await this.knex.schema.hasTable('products');
      const hasSupplierPrices = await this.knex.schema.hasTable('supplier_prices');

      if (!hasSuppliers || !hasProducts || !hasSupplierPrices) {
        return {
          hasExistingData: false,
          message: 'Core tables missing - this appears to be a fresh database'
        };
      }

      // Check for data
      const supplierCount = await this.knex('suppliers').count('id as count').first();
      const productCount = await this.knex('products').count('id as count').first();
      const priceCount = await this.knex('supplier_prices').count('id as count').first();

      const counts = {
        suppliers: parseInt(supplierCount.count),
        products: parseInt(productCount.count),
        prices: parseInt(priceCount.count)
      };

      return {
        hasExistingData: counts.suppliers > 0 || counts.products > 0 || counts.prices > 0,
        counts,
        message: `Found ${counts.suppliers} suppliers, ${counts.products} products, ${counts.prices} prices`
      };
    } catch (error) {
      return {
        hasExistingData: false,
        error: error.message,
        message: 'Could not check existing data - database may not be accessible'
      };
    }
  }

  /**
   * Check if Knex migration system is already set up
   */
  async checkMigrationSetup() {
    try {
      const hasMigrationTable = await this.knex.schema.hasTable('knex_migrations');

      if (!hasMigrationTable) {
        return {
          isSetup: false,
          message: 'Knex migration table does not exist'
        };
      }

      const migrations = await this.knex('knex_migrations').select('*').orderBy('id');

      return {
        isSetup: true,
        migrationCount: migrations.length,
        migrations: migrations.map(m => m.name),
        message: `Found ${migrations.length} completed migrations`
      };
    } catch (error) {
      return {
        isSetup: false,
        error: error.message,
        message: 'Could not check migration setup'
      };
    }
  }

  /**
   * Set up Knex migration tracking for existing database
   */
  async setupMigrationTracking() {
    try {
      console.log('🔧 Setting up Knex migration tracking...');

      // Create migration tracking tables if they don't exist
      const migrationTableExists = await this.knex.schema.hasTable('knex_migrations');
      if (!migrationTableExists) {
        await this.knex.schema.createTable('knex_migrations', table => {
          table.increments('id');
          table.string('name');
          table.integer('batch');
          table.timestamp('migration_time');
        });

        await this.knex.schema.createTable('knex_migrations_lock', table => {
          table.increments('index');
          table.integer('is_locked');
        });

        console.log('✅ Created Knex migration tracking tables');
      }

      // Check which migrations should be marked as completed
      const existingData = await this.checkExistingData();

      if (existingData.hasExistingData) {
        console.log('📊 Existing data found, marking baseline migrations as completed...');

        // Mark the core migrations as completed
        const baselineMigrations = [
          '001_initial_schema.js',
          '002_add_matching_preferences.js',
          '003_add_shopping_lists.js'
        ];

        // Check which migrations are already recorded
        const existingMigrations = await this.knex('knex_migrations').select('name');
        const existingNames = existingMigrations.map(m => m.name);

        let batch = 1;
        if (existingMigrations.length > 0) {
          const maxBatch = await this.knex('knex_migrations').max('batch as max_batch').first();
          batch = (maxBatch.max_batch || 0) + 1;
        }

        for (const migration of baselineMigrations) {
          if (!existingNames.includes(migration)) {
            // Check if the corresponding table/feature exists
            const shouldMark = await this.shouldMarkMigrationAsCompleted(migration);

            if (shouldMark) {
              await this.knex('knex_migrations').insert({
                name: migration,
                batch: batch,
                migration_time: new Date()
              });
              console.log(`   ✅ Marked ${migration} as completed`);
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to setup migration tracking:', error.message);
      throw error;
    }
  }

  /**
   * Check if a migration should be marked as completed based on existing schema
   */
  async shouldMarkMigrationAsCompleted(migrationName) {
    try {
      switch (migrationName) {
        case '001_initial_schema.js':
          return await this.knex.schema.hasTable('suppliers') &&
                 await this.knex.schema.hasTable('products') &&
                 await this.knex.schema.hasTable('supplier_prices');

        case '002_add_matching_preferences.js':
          return await this.knex.schema.hasTable('matching_preferences');

        case '003_add_shopping_lists.js':
          return await this.knex.schema.hasTable('shopping_lists') &&
                 await this.knex.schema.hasTable('shopping_list_items');

        default:
          return false;
      }
    } catch (error) {
      console.warn(`⚠️  Could not check migration ${migrationName}:`, error.message);
      return false;
    }
  }

  /**
   * Run the complete integration process
   */
  async integrate() {
    try {
      console.log('🚀 Starting database integration with Knex migrations...\n');

      // Step 1: Check existing data
      console.log('1. Checking existing database...');
      const existingData = await this.checkExistingData();
      console.log(`   ${existingData.message}`);

      if (existingData.error) {
        throw new Error(`Database check failed: ${existingData.error}`);
      }

      // Step 2: Check migration setup
      console.log('\n2. Checking migration setup...');
      const migrationSetup = await this.checkMigrationSetup();
      console.log(`   ${migrationSetup.message}`);

      // Step 3: Set up migration tracking if needed
      if (!migrationSetup.isSetup || migrationSetup.migrationCount === 0) {
        console.log('\n3. Setting up migration tracking...');
        await this.setupMigrationTracking();
      } else {
        console.log('\n3. Migration tracking already set up ✅');
      }

      // Step 4: Run any pending migrations
      console.log('\n4. Checking for pending migrations...');
      const needsMigration = await this.migrationManager.needsMigration();

      if (needsMigration) {
        console.log('   Running pending migrations...');
        await this.migrationManager.migrate();
      } else {
        console.log('   No pending migrations ✅');
      }

      // Step 5: Validate final state
      console.log('\n5. Validating final state...');
      const isValid = await this.migrationManager.validate();

      if (!isValid) {
        throw new Error('Final validation failed');
      }

      console.log('\n🎉 Database integration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   • Use "npm run migrate:status" to check migration state');
      console.log('   • Use "npm run migrate:make <name>" to create new migrations');
      console.log('   • Server startup will now automatically run migrations');

      return true;
    } catch (error) {
      console.error('\n❌ Integration failed:', error.message);
      throw error;
    } finally {
      await this.migrationManager.close();
    }
  }
}

// Run integration if called directly
if (require.main === module) {
  const integrator = new DatabaseIntegrator();

  integrator.integrate()
    .then(() => {
      console.log('\n✅ Integration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Integration failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseIntegrator;