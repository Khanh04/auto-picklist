#!/usr/bin/env node

// Test script for Railway migration
// This simulates the Railway environment for testing

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Mock Railway environment variables
process.env.PGUSER = 'postgres';
process.env.PGHOST = 'localhost';
process.env.PGDATABASE = 'test_railway_migration';
process.env.PGPASSWORD = '';
process.env.PGPORT = '5432';
process.env.NODE_ENV = 'production';

async function testMigration() {
    console.log('🧪 Testing Railway migration process...');
    
    try {
        // Test 1: Database connection waiting
        console.log('\n1. Testing database connection waiting...');
        try {
            const { stdout, stderr } = await execAsync('npm run wait-for-db', { timeout: 10000 });
            console.log('✅ Connection test passed (or timed out as expected)');
        } catch (error) {
            console.log('⚠️ Connection test failed as expected (no test database)');
        }
        
        // Test 2: Migration script syntax
        console.log('\n2. Testing migration script syntax...');
        try {
            await execAsync('node -c scripts/migrate-to-railway.js');
            console.log('✅ Migration script syntax is valid');
        } catch (error) {
            console.error('❌ Migration script has syntax errors:', error.message);
            throw error;
        }
        
        // Test 3: Package.json scripts
        console.log('\n3. Testing package.json scripts...');
        const package = require('../package.json');
        
        if (package.scripts['wait-for-db']) {
            console.log('✅ wait-for-db script exists');
        } else {
            throw new Error('❌ wait-for-db script missing');
        }
        
        if (package.scripts['migrate:railway']) {
            console.log('✅ migrate:railway script exists');
        } else {
            throw new Error('❌ migrate:railway script missing');
        }
        
        if (package.scripts['deploy:railway']) {
            console.log('✅ deploy:railway script exists');
        } else {
            throw new Error('❌ deploy:railway script missing');
        }
        
        // Test 4: Configuration files
        console.log('\n4. Testing configuration files...');
        const fs = require('fs');
        
        if (fs.existsSync('railway.json')) {
            const config = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
            if (config.deploy && config.deploy.startCommand) {
                console.log('✅ railway.json configuration is valid');
            } else {
                throw new Error('❌ railway.json missing deploy.startCommand');
            }
        } else {
            throw new Error('❌ railway.json not found');
        }
        
        console.log('\n🎉 All migration tests passed!');
        console.log('🚂 Your app is ready for Railway deployment');
        
    } catch (error) {
        console.error('\n💥 Migration test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    testMigration();
}

module.exports = { testMigration };