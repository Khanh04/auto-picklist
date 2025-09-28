const express = require('express');
const router = express.Router();

const PicklistService = require('../services/PicklistService');
const SupplierPreferenceRepository = require('../repositories/SupplierPreferenceRepository');
const { enhancedAsyncHandler, createValidationError } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse } = require('../utils/errorResponse');
const { validateBody } = require('../middleware/validation');

/**
 * POST /api/supplier-preferences/intelligent-picklist
 * Generate intelligent picklist with user-first supplier selection
 */
router.post('/intelligent-picklist',
    validateBody({
        orderItems: { required: true, type: 'array' }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { orderItems } = req.body;

        if (!Array.isArray(orderItems) || orderItems.length === 0) {
            throw createValidationError(['orderItems'], 'Order items array is required and cannot be empty');
        }

        // Validate order items structure
        for (let i = 0; i < orderItems.length; i++) {
            const item = orderItems[i];
            if (!item.item || !item.quantity) {
                throw createValidationError(['orderItems'], `Item at index ${i} must have 'item' and 'quantity' properties`);
            }
        }

        // Create user-context service instance
        const picklistService = new PicklistService(req.user.id);

        // Use the enhanced intelligent picklist generation
        const picklist = await picklistService.createIntelligentPicklist(orderItems);
        const summary = picklistService.calculateSummary(picklist);
        const validation = picklistService.validatePicklist(picklist);

        sendSuccessResponse(req, res, {
            picklist,
            summary,
            validation,
            userPreferenceCount: summary.userPreferredItems,
            systemOptimizedCount: summary.systemOptimizedItems,
            averageConfidence: summary.averageConfidence
        }, {
            message: `Intelligent picklist generated with ${summary.userPreferredItems} user preferences and ${summary.systemOptimizedItems} system optimized items`
        });
    })
);

/**
 * POST /api/supplier-preferences/update-selection
 * Update supplier selection and learn user preference
 */
router.post('/update-selection',
    validateBody({
        originalItem: { required: true, type: 'string' },
        newSupplierId: { required: true, type: 'number' },
        matchedProductId: { type: 'number' }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { originalItem, newSupplierId, matchedProductId } = req.body;

        // Create user-context service instance
        const picklistService = new PicklistService(req.user.id);

        const result = await picklistService.updateSupplierSelection(
            originalItem,
            newSupplierId,
            matchedProductId
        );

        sendSuccessResponse(req, res, result, {
            message: `Supplier preference learned: "${originalItem}" → "${result.newSupplier}"`
        });
    })
);

/**
 * POST /api/supplier-preferences/store-batch
 * Store multiple supplier preferences from shopping list
 */
router.post('/store-batch',
    validateBody({
        preferences: { required: true, type: 'array' }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { preferences } = req.body;

        if (!Array.isArray(preferences) || preferences.length === 0) {
            throw createValidationError(['preferences'], 'Preferences array is required and cannot be empty');
        }

        // Validate preferences structure
        for (let i = 0; i < preferences.length; i++) {
            const pref = preferences[i];
            if (!pref.originalItem || !pref.supplierId) {
                throw createValidationError(['preferences'], `Preference at index ${i} must have 'originalItem' and 'supplierId' properties`);
            }
        }

        // Create user-context service instance
        const picklistService = new PicklistService(req.user.id);

        const storedPreferences = await picklistService.storeSupplierPreferences(preferences);

        sendSuccessResponse(req, res, {
            storedPreferences,
            count: storedPreferences.length
        }, {
            message: `Successfully stored ${storedPreferences.length} supplier preferences`
        });
    })
);

/**
 * GET /api/supplier-preferences/:originalItem
 * Get supplier preference for a specific item
 */
router.get('/:originalItem',
    enhancedAsyncHandler(async (req, res) => {
        const { originalItem } = req.params;
        const { matchedProductId } = req.query;

        // Create user-context repository instance
        const supplierPreferenceRepository = new SupplierPreferenceRepository(req.user.id);

        const preference = await supplierPreferenceRepository.getPreference(
            originalItem,
            matchedProductId ? parseInt(matchedProductId) : null
        );

        if (!preference) {
            sendSuccessResponse(req, res, { preference: null }, {
                message: `No supplier preference found for "${originalItem}"`
            });
        } else {
            const preferenceStrength = supplierPreferenceRepository.calculatePreferenceStrength(preference);

            sendSuccessResponse(req, res, {
                preference: {
                    ...preference,
                    preferenceStrength
                }
            }, {
                message: `Supplier preference found: "${originalItem}" → "${preference.supplier_name}" (${preference.frequency} times)`
            });
        }
    })
);

/**
 * GET /api/supplier-preferences/summary/items
 * Get preferences summary for multiple items
 */
router.post('/summary/items',
    validateBody({
        items: { required: true, type: 'array' }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            throw createValidationError(['items'], 'Items array is required and cannot be empty');
        }

        // Create user-context service instance
        const picklistService = new PicklistService(req.user.id);

        // Use the UserFirstMatchingService method via PicklistService
        const summary = await picklistService.userFirstMatchingService.getPreferencesSummary(items);

        sendSuccessResponse(req, res, summary, {
            message: `Preferences summary: ${summary.itemsWithPreferences}/${summary.totalItems} items (${summary.preferencePercentage}%) have user preferences`
        });
    })
);

/**
 * GET /api/supplier-preferences/all
 * Get all supplier preferences with details
 */
router.get('/all',
    enhancedAsyncHandler(async (req, res) => {
        // Create user-context repository instance
        const supplierPreferenceRepository = new SupplierPreferenceRepository(req.user.id);

        const allPreferences = await supplierPreferenceRepository.getAllWithDetails();

        // Add preference strength to each preference
        const enhancedPreferences = allPreferences.map(preference => ({
            ...preference,
            preferenceStrength: supplierPreferenceRepository.calculatePreferenceStrength(preference)
        }));

        sendSuccessResponse(req, res, {
            preferences: enhancedPreferences,
            count: enhancedPreferences.length
        });
    })
);

/**
 * GET /api/supplier-preferences/stats
 * Get preference statistics for reporting
 */
router.get('/stats',
    enhancedAsyncHandler(async (req, res) => {
        // Create user-context repository instance
        const supplierPreferenceRepository = new SupplierPreferenceRepository(req.user.id);

        const stats = await supplierPreferenceRepository.getPreferenceStats();

        sendSuccessResponse(req, res, {
            statistics: {
                totalPreferences: parseInt(stats.total_preferences),
                uniqueItems: parseInt(stats.unique_items),
                uniqueSuppliers: parseInt(stats.unique_suppliers),
                averageFrequency: parseFloat(stats.avg_frequency).toFixed(2),
                maxFrequency: parseInt(stats.max_frequency),
                recentUsage: parseInt(stats.recent_usage)
            }
        });
    })
);

/**
 * DELETE /api/supplier-preferences/:preferenceId
 * Delete a specific supplier preference
 */
router.delete('/:preferenceId',
    enhancedAsyncHandler(async (req, res) => {
        const { preferenceId } = req.params;

        if (!preferenceId || isNaN(parseInt(preferenceId))) {
            throw createValidationError(['preferenceId'], 'Valid preference ID is required');
        }

        // Create user-context repository instance
        const supplierPreferenceRepository = new SupplierPreferenceRepository(req.user.id);

        const deleted = await supplierPreferenceRepository.deleteById(parseInt(preferenceId));

        if (!deleted) {
            sendSuccessResponse(req, res, { deleted: false }, {
                message: `Preference with ID ${preferenceId} not found`
            });
        } else {
            sendSuccessResponse(req, res, { deleted: true }, {
                message: `Preference with ID ${preferenceId} deleted successfully`
            });
        }
    })
);

/**
 * POST /api/supplier-preferences/cleanup
 * Clean up old preferences that haven't been used recently
 */
router.post('/cleanup',
    validateBody({
        daysOld: { type: 'number' }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { daysOld = 365 } = req.body;

        if (daysOld < 30) {
            throw createValidationError(['daysOld'], 'Cleanup period must be at least 30 days');
        }

        // Create user-context repository instance
        const supplierPreferenceRepository = new SupplierPreferenceRepository(req.user.id);

        const cleanedCount = await supplierPreferenceRepository.cleanupOldPreferences(daysOld);

        sendSuccessResponse(req, res, {
            cleanedCount,
            daysOld
        }, {
            message: `Cleaned up ${cleanedCount} old preferences (older than ${daysOld} days)`
        });
    })
);

module.exports = router;