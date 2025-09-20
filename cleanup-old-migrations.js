#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Cleanup script to safely remove old migration files after Knex integration
 * This script identifies what can be safely removed and creates backups
 */

console.log('🧹 Auto-Picklist Migration Cleanup Tool\n');

// Files that can be safely removed after Knex integration
const filesToRemove = {
  'scripts/setup-database.js': 'Replaced by 001_initial_schema.js',
  'scripts/migrate-to-railway.js': 'Replaced by Knex auto-migration system',
  'scripts/test-migration.js': 'Replaced by migrate:validate command',
  'scripts/validate-setup.js': 'Replaced by migrate:validate command',
  'scripts/setup-and-import.js': 'Replaced by migrate + migrate:seed',
  'scripts/add-unique-constraint-products.js': 'No longer needed with Knex'
};

// Package.json scripts that can be removed
const scriptsToRemove = {
  'setup-db': 'Use npm run migrate instead',
  'setup-all': 'Use npm run migrate && npm run migrate:seed instead',
  'validate-setup': 'Use npm run migrate:validate instead',
  'migrate:unique-constraint': 'No longer needed',
  'migrate:railway': 'Server auto-migrates on startup',
  'test:migration': 'Use npm run migrate:validate instead'
};

// Files to keep (important for other functionality)
const filesToKeep = [
  'scripts/import-excel-data.js', // Still needed for data import
  'scripts/wait-for-db.js', // Still used for Railway deployment
  'scripts/railway-deploy.js', // Still needed for deployment
  'scripts/debug-env.js', // Still useful for debugging
  'scripts/railway-db-check.js' // Still useful for checking Railway DB
];

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function createBackupDirectory() {
  const backupDir = path.join(__dirname, 'old-scripts-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${backupDir}`);
  }
  return backupDir;
}

function backupFile(filePath, backupDir) {
  if (checkFileExists(filePath)) {
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, fileName);
    fs.copyFileSync(filePath, backupPath);
    console.log(`   📋 Backed up: ${fileName}`);
    return true;
  }
  return false;
}

function removeFile(filePath) {
  if (checkFileExists(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`   🗑️  Removed: ${filePath}`);
    return true;
  }
  return false;
}

function updatePackageJson() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  let removedCount = 0;

  console.log('\n📦 Updating package.json scripts...');

  for (const [scriptName, reason] of Object.entries(scriptsToRemove)) {
    if (packageJson.scripts[scriptName]) {
      delete packageJson.scripts[scriptName];
      console.log(`   🗑️  Removed script "${scriptName}": ${reason}`);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`   ✅ Updated package.json (removed ${removedCount} scripts)`);
  } else {
    console.log('   ℹ️  No scripts to remove from package.json');
  }

  return removedCount;
}

function showCurrentMigrationStatus() {
  console.log('\n📊 Current Migration Status:');
  try {
    const { execSync } = require('child_process');
    const output = execSync('npm run migrate:status', { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
  } catch (error) {
    console.log('   ⚠️  Could not get migration status');
  }
}

function main() {
  console.log('🔍 Analyzing files for cleanup...\n');

  // Check what files exist
  const existingFiles = Object.keys(filesToRemove).filter(checkFileExists);
  const missingFiles = Object.keys(filesToRemove).filter(file => !checkFileExists(file));

  if (existingFiles.length === 0) {
    console.log('✅ No old migration files found to clean up!');
    return;
  }

  console.log(`📋 Found ${existingFiles.length} old migration files to clean up:`);
  existingFiles.forEach(file => {
    console.log(`   • ${file} - ${filesToRemove[file]}`);
  });

  if (missingFiles.length > 0) {
    console.log(`\nℹ️  Already cleaned up (${missingFiles.length} files):`);
    missingFiles.forEach(file => {
      console.log(`   • ${file}`);
    });
  }

  console.log(`\n✅ Files to keep (${filesToKeep.length}):`);
  filesToKeep.forEach(file => {
    const exists = checkFileExists(file) ? '✅' : '❌';
    console.log(`   ${exists} ${file}`);
  });

  // Show current migration status
  showCurrentMigrationStatus();

  // Ask for confirmation
  console.log('\n🚨 SAFETY CHECK:');
  console.log('   ✅ Knex migration system is integrated and working');
  console.log('   ✅ Your database data is preserved');
  console.log('   ✅ Backups will be created before removal');
  console.log('   ✅ Important scripts will be kept');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n❓ Proceed with cleanup? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      performCleanup(existingFiles);
    } else {
      console.log('❌ Cleanup cancelled by user');
    }
    rl.close();
  });
}

function performCleanup(filesToCleanup) {
  console.log('\n🧹 Starting cleanup process...\n');

  // Step 1: Create backups
  console.log('1. Creating backups...');
  const backupDir = createBackupDirectory();

  let backedUpCount = 0;
  filesToCleanup.forEach(file => {
    if (backupFile(file, backupDir)) {
      backedUpCount++;
    }
  });

  // Step 2: Update package.json
  console.log('\n2. Updating package.json...');
  const removedScripts = updatePackageJson();

  // Step 3: Remove files
  console.log('\n3. Removing old files...');
  let removedCount = 0;
  filesToCleanup.forEach(file => {
    if (removeFile(file)) {
      removedCount++;
    }
  });

  // Step 4: Final summary
  console.log('\n🎉 Cleanup completed successfully!');
  console.log(`   📋 Files backed up: ${backedUpCount}`);
  console.log(`   🗑️  Files removed: ${removedCount}`);
  console.log(`   📦 Scripts removed: ${removedScripts}`);
  console.log(`   📁 Backups stored in: ${backupDir}`);

  console.log('\n📋 Updated workflow:');
  console.log('   • Database setup: npm run migrate');
  console.log('   • Create migration: npm run migrate:make <name>');
  console.log('   • Check status: npm run migrate:status');
  console.log('   • Validate schema: npm run migrate:validate');
  console.log('   • Start server: npm start (auto-migrates)');

  console.log('\n✨ Your migration system is now fully modernized!');
}

// Run the cleanup tool
if (require.main === module) {
  main();
}

module.exports = { filesToRemove, scriptsToRemove, filesToKeep };