#!/usr/bin/env node

const MigrationManager = require('./MigrationManager');
const path = require('path');

/**
 * CLI for managing database migrations
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  const migrationManager = new MigrationManager();

  try {
    switch (command) {
      case 'migrate':
      case 'up':
      case 'latest':
        await migrationManager.migrate();
        break;

      case 'rollback':
      case 'down':
        await migrationManager.rollback();
        break;

      case 'status':
      case 'current':
        const status = await migrationManager.status();
        console.log('\n📊 Migration Status:');
        const currentVersion = typeof status.currentVersion === 'string' ?
          status.currentVersion :
          (status.currentVersion?.name || status.currentVersion?.file || 'None');
        console.log(`   Current version: ${currentVersion}`);
        console.log(`   Completed: ${status.completedMigrations.length} migrations`);
        console.log(`   Pending: ${status.pendingMigrations.length} migrations`);

        if (status.pendingMigrations.length > 0) {
          console.log('\n⚠️  Pending migrations:');
          status.pendingMigrations.forEach(migration => {
            const migrationName = typeof migration === 'string' ? migration : migration.file || migration.name || 'Unknown';
            console.log(`   • ${migrationName}`);
          });
        }
        break;

      case 'validate':
        const isValid = await migrationManager.validate();
        if (!isValid) {
          console.log('❌ Database schema validation failed');
          process.exit(1);
        }
        break;

      case 'make':
      case 'generate':
        const name = args[0] || args.find(arg => arg.startsWith('--name='))?.split('=')[1];
        if (!name) {
          console.error('❌ Migration name is required. Usage: npm run migrate:make <name>');
          process.exit(1);
        }
        await migrationManager.makeMigration(name);
        break;

      case 'seed':
        await migrationManager.seed();
        break;

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await migrationManager.close();
  }
}

function printHelp() {
  console.log(`
🚀 Auto-Picklist Migration CLI

Usage:
  npm run migrate <command>

Commands:
  migrate, up, latest    Run all pending migrations
  rollback, down         Rollback the last batch of migrations
  status, current        Show migration status
  validate              Validate database schema
  make <name>           Create a new migration file
  seed                  Run database seeds
  help                  Show this help message

Examples:
  npm run migrate                           # Run all pending migrations
  npm run migrate:status                    # Check migration status
  npm run migrate:make add_user_table       # Create new migration
  npm run migrate:rollback                  # Rollback last batch
  npm run migrate:seed                      # Run seeds

Environment:
  Set NODE_ENV=production for production migrations
  Set NODE_ENV=test for test database migrations
`);
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = main;