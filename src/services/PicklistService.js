const MatchingService = require('./MatchingService');
const UserFirstMatchingService = require('./UserFirstMatchingService');
const PreferenceRepository = require('../repositories/PreferenceRepository');
const SupplierPreferenceRepository = require('../repositories/SupplierPreferenceRepository');

class PicklistService {
    constructor(userId = null) {
        this.matchingService = new MatchingService(userId);
        this.userFirstMatchingService = new UserFirstMatchingService(userId);
        this.preferenceRepository = new PreferenceRepository(userId);
        this.supplierPreferenceRepository = new SupplierPreferenceRepository(userId);
        this.userId = userId;
    }

    /**
     * Set user context for all services and repositories
     * @param {number} userId - User ID
     */
    setUserContext(userId) {
        this.userId = userId;
        this.matchingService.setUserContext && this.matchingService.setUserContext(userId);
        this.userFirstMatchingService.setUserContext(userId);
        this.preferenceRepository.setUserContext && this.preferenceRepository.setUserContext(userId);
        this.supplierPreferenceRepository.setUserContext(userId);
    }

    /**
     * Create a picklist from order items using database matching (legacy method)
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
                selectedSupplier: matchResult.supplier || 'back order',
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
     * Create intelligent picklist with backend supplier selection (user-first approach)
     * @param {Array} orderItems - Array of {item, quantity}
     * @returns {Promise<Array>} Complete picklist with suppliers selected
     */
    async createIntelligentPicklist(orderItems) {
        console.log(`🎯 Creating intelligent picklist for ${orderItems.length} items`);

        // Use the new UserFirstMatchingService for complete backend processing
        const picklist = await this.userFirstMatchingService.createIntelligentPicklist(orderItems);

        console.log(`✅ Intelligent picklist completed with ${picklist.length} items`);
        return picklist;
    }

    /**
     * Store user preferences from picklist selections (legacy method)
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
     * Store supplier preferences from user selections
     * @param {Array} supplierPreferences - Array of {originalItem, supplierId, matchedProductId}
     * @returns {Promise<Array>} Stored supplier preferences
     */
    async storeSupplierPreferences(supplierPreferences) {
        if (!supplierPreferences || !Array.isArray(supplierPreferences) || supplierPreferences.length === 0) {
            throw new Error('Supplier preferences array is required');
        }

        console.log(`📝 Storing ${supplierPreferences.length} supplier preferences`);

        // Store supplier preferences in batch
        const storedPreferences = await this.supplierPreferenceRepository.batchUpsert(supplierPreferences);

        console.log(`✅ Stored ${storedPreferences.length} supplier preferences`);
        return storedPreferences;
    }

    /**
     * Update a single supplier selection and learn from user change
     * @param {string} originalItem - Original item name
     * @param {number} newSupplierId - New supplier ID
     * @param {number} matchedProductId - Optional matched product ID
     * @returns {Promise<Object>} Updated details
     */
    async updateSupplierSelection(originalItem, newSupplierId, matchedProductId = null) {
        return await this.userFirstMatchingService.updateSupplierSelection(
            originalItem,
            newSupplierId,
            matchedProductId
        );
    }

    /**
     * Calculate enhanced picklist summary statistics
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
            preferenceMatches: 0,
            userPreferredItems: 0,
            systemOptimizedItems: 0,
            averageConfidence: 0
        };

        let totalConfidence = 0;
        let confidenceCount = 0;

        picklist.forEach(item => {
            summary.totalQuantity += parseInt(item.quantity) || 0;

            const price = parseFloat(item.totalPrice) || 0;
            summary.totalPrice += price;

            // Count by supplier
            const supplier = item.selectedSupplier;
            if (supplier !== 'back order') {
                summary.supplierBreakdown[supplier] = (summary.supplierBreakdown[supplier] || 0) + price;
            } else {
                summary.unmatchedItems++;
            }

            // Count legacy preference matches
            if (item.isPreference) {
                summary.preferenceMatches++;
            }

            // Count enhanced supplier decision types
            if (item.supplierDecision) {
                if (item.supplierDecision.isUserPreferred) {
                    summary.userPreferredItems++;
                } else {
                    summary.systemOptimizedItems++;
                }

                // Calculate average confidence
                if (item.supplierDecision.confidence) {
                    const confidenceScore = item.supplierDecision.confidence === 'high' ? 1.0 :
                                           item.supplierDecision.confidence === 'medium' ? 0.7 : 0.4;
                    totalConfidence += confidenceScore;
                    confidenceCount++;
                }
            }
        });

        // Calculate average confidence
        summary.averageConfidence = confidenceCount > 0 ?
            parseFloat((totalConfidence / confidenceCount).toFixed(2)) : 0;

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

            if (item.selectedSupplier === 'back order') {
                warnings.push(`Item ${index + 1}: back order for "${item.item}"`);
            }

            if (item.unitPrice === 'No price found' || item.unitPrice === 'Error') {
                warnings.push(`Item ${index + 1}: No price found for "${item.item}"`);
            }

            // Enhanced validation for supplier decision metadata
            if (item.supplierDecision && item.supplierDecision.confidence === 'low') {
                warnings.push(`Item ${index + 1}: Low confidence match for "${item.item}"`);
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