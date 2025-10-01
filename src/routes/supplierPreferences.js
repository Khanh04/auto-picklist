const express = require('express');
const router = express.Router();

const PicklistService = require('../services/PicklistService');
const ItemPreferenceRepository = require('../repositories/ItemPreferenceRepository');
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
 * GET /api/supplier-preferences/:originalItem
 * Get unified preference for a specific item (migrated to unified system)
 */
router.get('/:originalItem',
    enhancedAsyncHandler(async (req, res) => {
        const { originalItem } = req.params;

        // Create user-context repository instance for unified preferences
        const itemPreferenceRepository = new ItemPreferenceRepository();
        itemPreferenceRepository.setUserContext(req.user.id);

        const preference = await itemPreferenceRepository.getPreference(originalItem);

        if (!preference) {
            sendSuccessResponse(req, res, { preference: null }, {
                message: `No unified preference found for "${originalItem}"`
            });
        } else {
            const preferenceStrength = itemPreferenceRepository.calculatePreferenceStrength(preference);

            sendSuccessResponse(req, res, {
                preference: {
                    original_item: preference.original_item,
                    product_id: preference.product_id,
                    supplier_id: preference.supplier_id,
                    supplier_name: preference.supplier_name,
                    product_description: preference.product_description,
                    frequency: preference.frequency,
                    last_used: preference.last_used,
                    preferenceStrength
                }
            }, {
                message: `Unified preference found: "${originalItem}" → "${preference.supplier_name}" (${preference.frequency} times)`
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
 * Get all unified preferences with details (migrated to unified system)
 */
router.get('/all',
    enhancedAsyncHandler(async (req, res) => {
        // Create user-context repository instance for unified preferences
        const itemPreferenceRepository = new ItemPreferenceRepository();
        itemPreferenceRepository.setUserContext(req.user.id);

        const allPreferences = await itemPreferenceRepository.getAllWithDetails();

        // Add preference strength to each preference
        const enhancedPreferences = allPreferences.map(preference => ({
            ...preference,
            preferenceStrength: itemPreferenceRepository.calculatePreferenceStrength(preference)
        }));

        sendSuccessResponse(req, res, {
            preferences: enhancedPreferences,
            count: enhancedPreferences.length
        });
    })
);

/**
 * GET /api/supplier-preferences/stats
 * Get unified preference statistics for reporting (migrated to unified system)
 */
router.get('/stats',
    enhancedAsyncHandler(async (req, res) => {
        // Create user-context repository instance for unified preferences
        const itemPreferenceRepository = new ItemPreferenceRepository();
        itemPreferenceRepository.setUserContext(req.user.id);

        const stats = await itemPreferenceRepository.getPreferenceStats();

        sendSuccessResponse(req, res, {
            statistics: {
                totalPreferences: parseInt(stats.total_preferences),
                uniqueItems: parseInt(stats.unique_items),
                uniqueProducts: parseInt(stats.unique_products),
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
 * Delete a specific unified preference (migrated to unified system)
 */
router.delete('/:preferenceId',
    enhancedAsyncHandler(async (req, res) => {
        const { preferenceId } = req.params;

        if (!preferenceId || isNaN(parseInt(preferenceId))) {
            throw createValidationError(['preferenceId'], 'Valid preference ID is required');
        }

        // Create user-context repository instance for unified preferences
        const itemPreferenceRepository = new ItemPreferenceRepository();
        itemPreferenceRepository.setUserContext(req.user.id);

        const deleted = await itemPreferenceRepository.deleteById(parseInt(preferenceId));

        if (!deleted) {
            sendSuccessResponse(req, res, { deleted: false }, {
                message: `Unified preference with ID ${preferenceId} not found`
            });
        } else {
            sendSuccessResponse(req, res, { deleted: true }, {
                message: `Unified preference with ID ${preferenceId} deleted successfully`
            });
        }
    })
);

/**
 * POST /api/supplier-preferences/cleanup
 * Clean up old unified preferences that haven't been used recently (migrated to unified system)
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

        // Create user-context repository instance for unified preferences
        const itemPreferenceRepository = new ItemPreferenceRepository();
        itemPreferenceRepository.setUserContext(req.user.id);

        const cleanedCount = await itemPreferenceRepository.cleanupOldPreferences(daysOld);

        sendSuccessResponse(req, res, {
            cleanedCount,
            daysOld
        }, {
            message: `Cleaned up ${cleanedCount} old unified preferences (older than ${daysOld} days)`
        });
    })
);

module.exports = router;