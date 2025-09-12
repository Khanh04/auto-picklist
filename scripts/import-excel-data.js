const { ExcelImportService } = require('../src/services/ExcelImportService');
const fs = require('fs');

async function importExcelData() {
    try {
        // Read Excel file with better error handling
        const excelFile = process.env.EXCEL_FILE || 'GENERAL PRICE LIST.xlsx';
        
        // Check if file exists
        if (!fs.existsSync(excelFile)) {
            throw new Error(`❌ Excel file not found: ${excelFile}\n💡 Please ensure the file exists in the project root directory`);
        }
        
        const importService = new ExcelImportService();
        const result = await importService.importExcelFile(excelFile, {
            preserveData: true // Use additive import by default
        });
        
        if (!result.success) {
            throw new Error('Import failed');
        }
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        throw error;
    }
}

// Run import if called directly
if (require.main === module) {
    importExcelData()
        .then(() => {
            console.log('\n🎉 Excel data import completed!');
            console.log('💡 You can now start the web application: npm run web');
            process.exit(0);
        })
        .catch(error => {
            console.error('Import failed:', error);
            process.exit(1);
        });
}

module.exports = { importExcelData };