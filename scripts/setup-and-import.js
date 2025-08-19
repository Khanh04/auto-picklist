const { setupDatabase } = require('./setup-database');
const { importExcelData } = require('./import-excel-data');

/**
 * Combined script to setup database and import data
 */
async function setupAndImport() {
    try {
        console.log('🚀 Starting complete database setup and data import...\n');
        
        // Step 1: Setup database schema
        console.log('📋 STEP 1: Setting up database schema');
        await setupDatabase();
        console.log('✅ Database schema setup completed\n');
        
        // Step 2: Import Excel data
        console.log('📋 STEP 2: Importing Excel data');
        await importExcelData();
        console.log('✅ Data import completed\n');
        
        console.log('🎉 Complete setup finished successfully!');
        console.log('💡 You can now start the application: npm run web');
        
    } catch (error) {
        console.error('\n❌ Setup and import failed:', error.message);
        
        // Provide helpful guidance based on the error
        if (error.message.includes('Excel file not found')) {
            console.log('\n💡 Next steps:');
            console.log('   1. Place your Excel file in the project root directory');
            console.log('   2. Name it "GENERAL PRICE LIST.xlsx" or set EXCEL_FILE environment variable');
            console.log('   3. Run this script again');
        } else if (error.message.includes('database')) {
            console.log('\n💡 Database connection issues:');
            console.log('   1. Make sure PostgreSQL is running');
            console.log('   2. Check your database credentials in .env file');
            console.log('   3. Ensure you have permission to create databases');
        }
        
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    setupAndImport();
}

module.exports = { setupAndImport };