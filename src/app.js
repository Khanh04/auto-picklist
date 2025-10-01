const fs = require('fs');
const { parseOrderItemsFromPDF } = require('./modules/pdfParser');
const { parseOrderItemsFromEbayCSV, findEbayCSV } = require('./modules/ebayParser');
const { loadPriceList } = require('./modules/priceListLoader');
const { getDatabaseStats, testConnection } = require('./modules/databaseLoader');
const { createPicklist, convertToCSV } = require('./modules/picklistGenerator');
const { generatePDF, calculateSummary } = require('./modules/pdfGenerator');
const PicklistService = require('./services/PicklistService');

/**
 * Main application class for automated picklist generation
 */
class AutoPicklistApp {
    constructor(config = {}) {
        this.config = {
            inputType: config.inputType || 'auto', // 'pdf', 'ebay', or 'auto'
            pdfInputPath: config.pdfInputPath || 'H order.pdf',
            ebayInputPath: config.ebayInputPath || null, // Will auto-detect if null
            useDatabase: config.useDatabase !== false, // Default to true, use database
            excelInputPath: config.excelInputPath || 'GENERAL PRICE LIST.xlsx', // Fallback for legacy mode
            csvOutputPath: config.csvOutputPath || 'final_picklist.csv',
            pdfOutputPath: config.pdfOutputPath || 'final_picklist.pdf',
            userId: config.userId || null, // User context for preferences
            ...config
        };

        // Initialize modern picklist service
        this.picklistService = new PicklistService(this.config.userId);
    }

    /**
     * Main function to process picklist generation
     */
    async run() {
        try {
            console.log('Starting automated picklist generation...');

            // Load order items (auto-detect input type or use specified)
            let orderItems;
            let inputSource;
            
            if (this.config.inputType === 'ebay' || (this.config.inputType === 'auto' && this.config.ebayInputPath)) {
                // Use eBay CSV
                const ebayPath = this.config.ebayInputPath || findEbayCSV();
                if (!ebayPath) {
                    throw new Error('No eBay CSV file found or specified');
                }
                orderItems = await parseOrderItemsFromEbayCSV(ebayPath);
                inputSource = `eBay CSV (${ebayPath})`;
            } else if (this.config.inputType === 'pdf' || (this.config.inputType === 'auto' && fs.existsSync(this.config.pdfInputPath))) {
                // Use PDF
                orderItems = await parseOrderItemsFromPDF(this.config.pdfInputPath);
                inputSource = `PDF (${this.config.pdfInputPath})`;
            } else {
                // Try to auto-detect
                const ebayPath = findEbayCSV();
                if (ebayPath) {
                    orderItems = await parseOrderItemsFromEbayCSV(ebayPath);
                    inputSource = `eBay CSV (${ebayPath})`;
                } else if (fs.existsSync(this.config.pdfInputPath)) {
                    orderItems = await parseOrderItemsFromPDF(this.config.pdfInputPath);
                    inputSource = `PDF (${this.config.pdfInputPath})`;
                } else {
                    throw new Error('No valid input file found (PDF or eBay CSV)');
                }
            }
            
            if (!orderItems || orderItems.length === 0) {
                throw new Error('No order items found in input file');
            }
            console.log(`Loaded ${orderItems.length} order items from ${inputSource}`);

            // Load price data (database or Excel)
            let picklist;
            if (this.config.useDatabase) {
                // Test database connection first
                const dbConnected = await testConnection();
                if (!dbConnected) {
                    throw new Error('Database connection failed. Make sure PostgreSQL is running and database is set up.');
                }
                
                const stats = await getDatabaseStats();
                console.log(`Using PostgreSQL database (${stats.products} products, ${stats.suppliers} suppliers, ${stats.prices} prices)`);
                
                // Create picklist using intelligent matching service
                console.log('Matching items and finding best suppliers with user preferences...');
                picklist = await this.picklistService.createIntelligentPicklist(orderItems);
            } else {
                // Use Excel file (legacy mode)
                const priceData = loadPriceList(this.config.excelInputPath);
                if (!priceData) {
                    throw new Error('Failed to load price list from Excel file');
                }
                console.log(`Loaded price list with ${priceData.length} entries (Excel mode)`);
                
                // Create picklist
                console.log('Matching items and finding best suppliers...');
                picklist = createPicklist(orderItems, priceData);
            }

            // Save outputs
            const csvContent = convertToCSV(picklist);
            fs.writeFileSync(this.config.csvOutputPath, csvContent);
            generatePDF(picklist, this.config.pdfOutputPath);

            // Display summary
            const summary = calculateSummary(picklist);
            this.displaySummary(summary, orderItems.length);

            const response = {
                success: true,
                picklist,
                picklistData: picklist, // Include for frontend preview
                summary,
                files: {
                    csv: this.config.csvOutputPath,
                    pdf: this.config.pdfOutputPath
                }
            };
            
            console.log(`Returning picklist with ${picklist.length} items`);
            return response;

        } catch (error) {
            console.error('❌ Error generating picklist:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }


    /**
     * Display generation summary
     * @param {Object} summary - Summary statistics
     * @param {number} totalOrderItems - Total number of order items
     */
    displaySummary(summary, totalOrderItems) {
        console.log('\n' + '='.repeat(50));
        console.log('✅ PICKLIST GENERATED SUCCESSFULLY!');
        console.log('='.repeat(50));
        console.log(`Order items processed: ${totalOrderItems}`);
        console.log(`Total estimated cost: $${summary.totalCost.toFixed(2)}`);
        console.log(`Items with suppliers: ${summary.itemsWithSuppliers}/${summary.totalItems}`);
        console.log(`Files created:`);
        console.log(`   • ${this.config.csvOutputPath}`);
        console.log(`   • ${this.config.pdfOutputPath}`);
        console.log('='.repeat(50));
    }

    /**
     * Parse PDF file and return order items
     * @param {string} filePath - Path to PDF file
     * @returns {Promise<Array>} Array of order items
     */
    async parsePDF(filePath) {
        return await parseOrderItemsFromPDF(filePath);
    }

    /**
     * Parse CSV file and return order items
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Array>} Array of order items
     */
    async parseCSV(filePath) {
        return await parseOrderItemsFromEbayCSV(filePath);
    }

    /**
     * Process PDF file using legacy Excel matching
     * @param {string} filePath - Path to PDF file
     * @returns {Promise<Object>} Result object with picklist
     */
    async processPDF(filePath) {
        const orderItems = await parseOrderItemsFromPDF(filePath);
        const priceData = loadPriceList(this.config.excelInputPath);
        const picklist = createPicklist(orderItems, priceData);
        
        return {
            success: true,
            picklist,
            picklistData: picklist,
            summary: calculateSummary(picklist)
        };
    }

    /**
     * Process CSV file using legacy Excel matching
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Object>} Result object with picklist
     */
    async processCSV(filePath) {
        const orderItems = await parseOrderItemsFromEbayCSV(filePath);
        const priceData = loadPriceList(this.config.excelInputPath);
        const picklist = createPicklist(orderItems, priceData);
        
        return {
            success: true,
            picklist,
            picklistData: picklist,
            summary: calculateSummary(picklist)
        };
    }

    /**
     * Get configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     * @param {Object} newConfig - New configuration values
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// Export for use as a module
module.exports = AutoPicklistApp;

// If running directly, execute the app
if (require.main === module) {
    const app = new AutoPicklistApp();
    app.run().then(result => {
        if (!result.success) {
            process.exit(1);
        }
    });
}