const { parseOrderItemsFromEbayCSV, parseCSVLine } = require('../modules/ebayParser');
const PicklistService = require('./PicklistService');
const fs = require('fs');
const path = require('path');

/**
 * Service for handling multiple CSV files and generating combined summaries
 */
class MultiCsvService {
    constructor() {
        this.picklistService = new PicklistService();
    }

    /**
     * Process multiple CSV files and generate combined picklist with summary
     * @param {Array} files - Array of file objects with path and originalname
     * @param {boolean} useDatabase - Whether to use database matching
     * @returns {Promise<Object>} Combined results with summary
     */
    async processMultipleCSVs(files, useDatabase = true) {
        if (!files || !Array.isArray(files) || files.length === 0) {
            throw new Error('No CSV files provided');
        }

        if (files.length > 10) {
            throw new Error('Maximum 10 CSV files allowed at once');
        }

        const results = {
            success: true,
            files: [],
            combinedPicklist: [],
            individualSummaries: [],
            overallSummary: {},
            analytics: {},
            errors: []
        };

        let allOrderItems = [];
        let totalFilesProcessed = 0;

        // Process each CSV file
        for (const file of files) {
            try {
                console.log(`Processing CSV file: ${file.originalname}`);
                
                // Parse CSV file
                const orderItems = await this.parseCSVFile(file.path);
                
                if (orderItems.length === 0) {
                    results.errors.push(`No valid items found in ${file.originalname}`);
                    continue;
                }

                // Generate individual picklist for this file
                let individualPicklist;
                if (useDatabase) {
                    individualPicklist = await this.picklistService.createPicklistFromDatabase(orderItems);
                } else {
                    throw new Error('Legacy Excel mode not supported for multi-CSV import');
                }

                // Calculate individual summary
                const individualSummary = this.picklistService.calculateSummary(individualPicklist);
                
                // Store file results
                const fileResult = {
                    filename: file.originalname,
                    itemCount: orderItems.length,
                    picklistItems: individualPicklist.length,
                    summary: individualSummary,
                    picklist: individualPicklist
                };

                results.files.push(fileResult);
                results.individualSummaries.push({
                    filename: file.originalname,
                    ...individualSummary
                });

                // Add to combined data
                allOrderItems = allOrderItems.concat(orderItems.map(item => ({
                    ...item,
                    sourceFile: file.originalname
                })));

                totalFilesProcessed++;

            } catch (error) {
                console.error(`Error processing ${file.originalname}:`, error.message);
                results.errors.push(`Error in ${file.originalname}: ${error.message}`);
            }
        }

        if (totalFilesProcessed === 0) {
            throw new Error('No CSV files were successfully processed');
        }

        // Generate combined picklist
        console.log(`Generating combined picklist from ${allOrderItems.length} total items`);
        
        // Consolidate duplicate items across files
        const consolidatedItems = this.consolidateOrderItems(allOrderItems);
        
        if (useDatabase) {
            results.combinedPicklist = await this.picklistService.createPicklistFromDatabase(consolidatedItems);
        }

        // Generate overall summary and analytics
        results.overallSummary = this.picklistService.calculateSummary(results.combinedPicklist);
        results.analytics = this.generateAnalytics(results);

        // Add metadata
        results.metadata = {
            filesProcessed: totalFilesProcessed,
            totalFiles: files.length,
            totalUniqueItems: consolidatedItems.length,
            totalOriginalItems: allOrderItems.length,
            processingDate: new Date().toISOString()
        };

        return results;
    }

    /**
     * Parse a single CSV file with enhanced detection
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Array>} Array of order items
     */
    async parseCSVFile(filePath) {
        try {
            // Try the existing eBay parser first
            return await parseOrderItemsFromEbayCSV(filePath);
        } catch (error) {
            console.log(`eBay parser failed, trying generic CSV parser: ${error.message}`);
            
            // Fallback to generic CSV parser
            return await this.parseGenericCSV(filePath);
        }
    }

    /**
     * Generic CSV parser for non-eBay CSV files
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Array>} Array of order items
     */
    async parseGenericCSV(filePath) {
        try {
            const csvContent = fs.readFileSync(filePath, 'utf8');
            const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
            
            if (lines.length < 2) {
                throw new Error('CSV file appears to be empty or malformed');
            }
            
            const header = lines[0].toLowerCase();
            const columns = parseCSVLine(header);
            
            // Find relevant columns with more flexible matching
            const quantityIndex = columns.findIndex(col => 
                /quantity|qty|amount|count|pieces|pcs/i.test(col)
            );
            
            const itemIndex = columns.findIndex(col => 
                /title|item|product|name|description|sku|part/i.test(col)
            );
            
            if (quantityIndex === -1 || itemIndex === -1) {
                throw new Error('Could not find required columns. Expected columns like: quantity/qty and title/item/product');
            }
            
            const orderItems = [];
            
            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue;
                
                const values = parseCSVLine(line);
                
                if (values.length > Math.max(quantityIndex, itemIndex)) {
                    const quantityStr = values[quantityIndex]?.replace(/[^\d.-]/g, '') || '0';
                    const quantity = parseInt(quantityStr) || 1; // Default to 1 if parsing fails
                    const item = values[itemIndex]?.replace(/^"|"$/g, '').trim() || '';
                    
                    if (quantity > 0 && item && item.length > 2) {
                        orderItems.push({ quantity, item });
                    }
                }
            }
            
            if (orderItems.length === 0) {
                throw new Error('No valid order items found in CSV');
            }
            
            console.log(`📊 Parsed ${orderItems.length} items from generic CSV`);
            return orderItems;
            
        } catch (error) {
            console.error('Error parsing generic CSV:', error.message);
            throw error;
        }
    }

    /**
     * Consolidate duplicate items across multiple files
     * @param {Array} allOrderItems - All order items with sourceFile property
     * @returns {Array} Consolidated order items
     */
    consolidateOrderItems(allOrderItems) {
        const itemMap = new Map();
        
        for (const orderItem of allOrderItems) {
            const normalizedItem = this.normalizeItemName(orderItem.item);
            
            if (itemMap.has(normalizedItem)) {
                // Combine quantities and track source files
                const existing = itemMap.get(normalizedItem);
                existing.quantity += orderItem.quantity;
                existing.sourceFiles = existing.sourceFiles || [existing.sourceFile];
                if (!existing.sourceFiles.includes(orderItem.sourceFile)) {
                    existing.sourceFiles.push(orderItem.sourceFile);
                }
            } else {
                itemMap.set(normalizedItem, {
                    ...orderItem,
                    originalItems: [orderItem.item], // Track all original item names
                    sourceFiles: [orderItem.sourceFile]
                });
            }
        }
        
        return Array.from(itemMap.values());
    }

    /**
     * Normalize item names for better consolidation
     * @param {string} itemName - Original item name
     * @returns {string} Normalized item name
     */
    normalizeItemName(itemName) {
        return itemName
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s-]/g, '')
            .trim();
    }

    /**
     * Generate analytics from multi-CSV processing results
     * @param {Object} results - Processing results
     * @returns {Object} Analytics data
     */
    generateAnalytics(results) {
        const analytics = {
            fileAnalysis: {},
            itemAnalysis: {},
            priceAnalysis: {},
            supplierAnalysis: {}
        };

        // File Analysis
        analytics.fileAnalysis = {
            totalFiles: results.files.length,
            successfulFiles: results.files.length,
            failedFiles: results.errors.length,
            averageItemsPerFile: results.files.length > 0 
                ? Math.round(results.files.reduce((sum, f) => sum + f.itemCount, 0) / results.files.length)
                : 0,
            filesWithMostItems: results.files
                .sort((a, b) => b.itemCount - a.itemCount)
                .slice(0, 3)
                .map(f => ({ filename: f.filename, itemCount: f.itemCount }))
        };

        // Item Analysis
        const allItems = results.combinedPicklist || [];
        const duplicatesAcrossFiles = allItems.filter(item => 
            item.sourceFiles && item.sourceFiles.length > 1
        );

        analytics.itemAnalysis = {
            totalUniqueItems: allItems.length,
            duplicatesAcrossFiles: duplicatesAcrossFiles.length,
            itemsWithSuppliers: allItems.filter(item => 
                item.selectedSupplier && item.selectedSupplier !== 'back order'
            ).length,
            itemsWithoutSuppliers: allItems.filter(item => 
                !item.selectedSupplier || item.selectedSupplier === 'back order'
            ).length,
            averageQuantityPerItem: allItems.length > 0
                ? Math.round(allItems.reduce((sum, item) => sum + (item.quantity || 0), 0) / allItems.length)
                : 0
        };

        // Price Analysis
        const itemsWithPrices = allItems.filter(item => 
            item.unitPrice && typeof item.unitPrice === 'number'
        );

        if (itemsWithPrices.length > 0) {
            const prices = itemsWithPrices.map(item => item.unitPrice);
            analytics.priceAnalysis = {
                totalItems: itemsWithPrices.length,
                averagePrice: (prices.reduce((sum, price) => sum + price, 0) / prices.length).toFixed(2),
                minPrice: Math.min(...prices).toFixed(2),
                maxPrice: Math.max(...prices).toFixed(2),
                priceRanges: this.calculatePriceRanges(prices)
            };
        }

        // Supplier Analysis
        const supplierCounts = {};
        const supplierTotals = {};

        allItems.forEach(item => {
            if (item.selectedSupplier && item.selectedSupplier !== 'back order') {
                supplierCounts[item.selectedSupplier] = (supplierCounts[item.selectedSupplier] || 0) + 1;
                
                const totalPrice = parseFloat(item.totalPrice) || 0;
                supplierTotals[item.selectedSupplier] = (supplierTotals[item.selectedSupplier] || 0) + totalPrice;
            }
        });

        analytics.supplierAnalysis = {
            totalSuppliers: Object.keys(supplierCounts).length,
            topSuppliersByCount: Object.entries(supplierCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([supplier, count]) => ({ supplier, itemCount: count })),
            topSuppliersByValue: Object.entries(supplierTotals)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([supplier, total]) => ({ 
                    supplier, 
                    totalValue: total.toFixed(2),
                    itemCount: supplierCounts[supplier]
                }))
        };

        return analytics;
    }

    /**
     * Calculate price ranges for analytics
     * @param {Array<number>} prices - Array of prices
     * @returns {Object} Price range distribution
     */
    calculatePriceRanges(prices) {
        const ranges = {
            'Under $5': 0,
            '$5-$20': 0,
            '$20-$50': 0,
            '$50-$100': 0,
            'Over $100': 0
        };

        prices.forEach(price => {
            if (price < 5) ranges['Under $5']++;
            else if (price <= 20) ranges['$5-$20']++;
            else if (price <= 50) ranges['$20-$50']++;
            else if (price <= 100) ranges['$50-$100']++;
            else ranges['Over $100']++;
        });

        return ranges;
    }

    /**
     * Export combined results to different formats
     * @param {Object} results - Multi-CSV processing results
     * @param {string} format - Export format ('csv', 'json', 'summary')
     * @returns {string} Formatted export data
     */
    exportCombinedResults(results, format = 'csv') {
        switch (format.toLowerCase()) {
            case 'csv':
                return this.picklistService.exportPicklist(results.combinedPicklist, 'csv');
                
            case 'json':
                return JSON.stringify({
                    metadata: results.metadata,
                    combinedPicklist: results.combinedPicklist,
                    overallSummary: results.overallSummary,
                    analytics: results.analytics,
                    individualSummaries: results.individualSummaries
                }, null, 2);
                
            case 'summary':
                return this.generateSummaryReport(results);
                
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Generate a human-readable summary report
     * @param {Object} results - Multi-CSV processing results
     * @returns {string} Summary report
     */
    generateSummaryReport(results) {
        const { metadata, overallSummary, analytics, individualSummaries } = results;
        
        let report = `MULTI-CSV IMPORT SUMMARY REPORT\n`;
        report += `Generated: ${new Date(metadata.processingDate).toLocaleString()}\n`;
        report += `${'='.repeat(50)}\n\n`;
        
        // File Summary
        report += `FILES PROCESSED:\n`;
        report += `• Total Files: ${metadata.totalFiles}\n`;
        report += `• Successfully Processed: ${metadata.filesProcessed}\n`;
        report += `• Total Original Items: ${metadata.totalOriginalItems}\n`;
        report += `• Unique Items After Consolidation: ${metadata.totalUniqueItems}\n\n`;
        
        // Overall Summary
        report += `OVERALL PICKLIST SUMMARY:\n`;
        report += `• Total Items: ${overallSummary.totalItems}\n`;
        report += `• Total Quantity: ${overallSummary.totalQuantity}\n`;
        report += `• Total Estimated Cost: $${overallSummary.totalPrice}\n`;
        report += `• Items with Suppliers: ${overallSummary.totalItems - overallSummary.unmatchedItems}\n`;
        report += `• Unmatched Items: ${overallSummary.unmatchedItems}\n\n`;
        
        // Top Suppliers
        if (analytics.supplierAnalysis?.topSuppliersByValue?.length > 0) {
            report += `TOP SUPPLIERS BY VALUE:\n`;
            analytics.supplierAnalysis.topSuppliersByValue.forEach((supplier, index) => {
                report += `${index + 1}. ${supplier.supplier}: $${supplier.totalValue} (${supplier.itemCount} items)\n`;
            });
            report += `\n`;
        }
        
        // Individual File Summaries
        if (individualSummaries.length > 0) {
            report += `INDIVIDUAL FILE SUMMARIES:\n`;
            individualSummaries.forEach(summary => {
                report += `• ${summary.filename}: ${summary.totalItems} items, $${summary.totalPrice}\n`;
            });
        }
        
        return report;
    }
}

module.exports = MultiCsvService;