#!/usr/bin/env node

const { setupDatabase } = require('./setup-database');

async function initProductionDatabase() {
    console.log('🚀 Initializing production database...');
    
    try {
        // Setup database schema
        await setupDatabase();
        
        console.log('✅ Production database initialized successfully!');
        console.log('📝 Next steps:');
        console.log('   1. Import your supplier data: npm run import-data');
        console.log('   2. Start the application: npm start');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to initialize production database:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initProductionDatabase();
}

module.exports = { initProductionDatabase };