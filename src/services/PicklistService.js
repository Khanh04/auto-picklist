const MatchingService = require('./MatchingService');
const PreferenceRepository = require('../repositories/PreferenceRepository');

class PicklistService {
    constructor() {
        this.matchingService = new MatchingService();
        this.preferenceRepository = new PreferenceRepository();
    }

    /**
     * Create a picklist from order items using database matching
     * @param {Array} orderItems - Array of {item, quantity}
     * @returns {Promise<Array>} Generated picklist
     */
    async createPicklistFromDatabase(orderItems) {
        const picklist = [];

        for (const orderItem of orderItems) {
            const matchResult = await this.matchingService.matchWithPreferences(orderItem.item);
            
            const picklistItem = {
                quantity: orderItem.quantity,
                item: orderItem.item,
                originalItem: orderItem.item,
                selectedSupplier: matchResult.supplier || 'No supplier found',
                unitPrice: matchResult.price || 'No price found',
                totalPrice: matchResult.price ? (matchResult.price * orderItem.quantity).toFixed(2) : 'N/A',
                matchedItemId: matchResult.productId,
                matchedDescription: matchResult.description,
                manualOverride: false,
                isPreference: matchResult.isPreference || false,
                frequency: matchResult.frequency || 0
            };

            picklist.push(picklistItem);
        }

        return picklist;
    }

    /**
     * Store user preferences from picklist selections
     * @param {Array} preferences - Array of {originalItem, matchedProductId}
     * @returns {Promise<Array>} Stored preferences
     */
    async storePreferences(preferences) {
        if (!preferences || !Array.isArray(preferences) || preferences.length === 0) {
            throw new Error('Preferences array is required');
        }

        // Initialize preferences table if needed
        await this.preferenceRepository.initializeTable();

        // Store preferences in batch
        const storedPreferences = await this.preferenceRepository.batchUpsert(preferences);
        
        return storedPreferences;
    }

    /**
     * Calculate picklist summary statistics
     * @param {Array} picklist - Picklist items
     * @returns {Object} Summary with totals and statistics
     */
    calculateSummary(picklist) {
        const summary = {
            totalItems: picklist.length,
            totalQuantity: 0,
            totalPrice: 0,
            supplierBreakdown: {},
            unmatchedItems: 0,
            preferenceMatches: 0
        };

        picklist.forEach(item => {
            summary.totalQuantity += parseInt(item.quantity) || 0;
            
            const price = parseFloat(item.totalPrice) || 0;
            summary.totalPrice += price;

            // Count by supplier
            const supplier = item.selectedSupplier;
            if (supplier !== 'No supplier found') {
                summary.supplierBreakdown[supplier] = (summary.supplierBreakdown[supplier] || 0) + price;
            } else {
                summary.unmatchedItems++;
            }

            // Count preference matches
            if (item.isPreference) {
                summary.preferenceMatches++;
            }
        });

        // Round total price
        summary.totalPrice = parseFloat(summary.totalPrice.toFixed(2));

        return summary;
    }

    /**
     * Validate picklist data
     * @param {Array} picklist - Picklist to validate
     * @returns {Object} Validation result with errors
     */
    validatePicklist(picklist) {
        const errors = [];
        const warnings = [];

        if (!Array.isArray(picklist)) {
            errors.push('Picklist must be an array');
            return { isValid: false, errors, warnings };
        }

        picklist.forEach((item, index) => {
            if (!item.item || typeof item.item !== 'string') {
                errors.push(`Item ${index + 1}: Missing or invalid item name`);
            }

            if (!item.quantity || isNaN(parseInt(item.quantity))) {
                errors.push(`Item ${index + 1}: Missing or invalid quantity`);
            }

            if (item.selectedSupplier === 'No supplier found') {
                warnings.push(`Item ${index + 1}: No supplier found for "${item.item}"`);
            }

            if (item.unitPrice === 'No price found') {
                warnings.push(`Item ${index + 1}: No price found for "${item.item}"`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Export picklist to different formats
     * @param {Array} picklist - Picklist data
     * @param {string} format - Export format ('csv', 'json')
     * @returns {string} Formatted data
     */
    exportPicklist(picklist, format = 'csv') {
        switch (format.toLowerCase()) {
            case 'csv':
                return this._exportToCsv(picklist);
            case 'json':
                return this._exportToJson(picklist);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export picklist to CSV format
     * @private
     */
    _exportToCsv(picklist) {
        const headers = ['Item', 'Quantity', 'Supplier', 'Unit Price', 'Total Price'];
        const csvRows = [headers.join(',')];

        picklist.forEach(item => {
            const row = [
                `"${item.item}"`,
                item.quantity,
                `"${item.selectedSupplier}"`,
                item.unitPrice,
                item.totalPrice
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Export picklist to JSON format
     * @private
     */
    _exportToJson(picklist) {
        const exportData = {
            generated: new Date().toISOString(),
            picklist: picklist.map(item => ({
                item: item.item,
                quantity: item.quantity,
                supplier: item.selectedSupplier,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
            })),
            summary: this.calculateSummary(picklist)
        };

        return JSON.stringify(exportData, null, 2);
    }
}

module.exports = PicklistService;