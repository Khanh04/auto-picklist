const express = require('express');
const router = express.Router();

const ItemPreferenceRepository = require('../repositories/ItemPreferenceRepository');
const { enhancedAsyncHandler, createNotFoundError } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse } = require('../utils/errorResponse');
const { validateBody, validateParams } = require('../middleware/validation');






/**
 * POST /api/preferences/unified
 * Store unified preferences (item -> product_id + supplier_id)
 */
router.post('/unified',
    validateBody({
        preferences: {
            required: true,
            type: 'array',
            custom: (value) => {
                if (!Array.isArray(value) || value.length === 0) {
                    return 'must be a non-empty array';
                }

                for (const pref of value) {
                    if (!pref.originalItem || typeof pref.originalItem !== 'string') {
                        return 'each preference must have a valid originalItem';
                    }
                    if (!pref.productId || !Number.isInteger(pref.productId)) {
                        return 'each preference must have a valid productId';
                    }
                    if (!pref.supplierId || !Number.isInteger(pref.supplierId)) {
                        return 'each preference must have a valid supplierId';
                    }
                }
                return null;
            }
        }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { preferences } = req.body;

        // Initialize repository with user context
        const itemPreferenceRepository = new ItemPreferenceRepository();
        itemPreferenceRepository.setUserContext(req.user.id);

        console.log(`Storing ${preferences.length} unified preferences for user:`, req.user.id);

        // Store unified preferences
        const storedPreferences = await itemPreferenceRepository.batchUpsert(preferences);

        sendSuccessResponse(req, res, { preferences: storedPreferences }, {
            message: `Stored ${storedPreferences.length} unified preferences (item → product_id + supplier_id)`
        });
    })
);

/**
 * GET /api/preferences/unified/:originalItem
 * Get unified preference for a specific original item
 */
router.get('/unified/:originalItem', enhancedAsyncHandler(async (req, res) => {
    const { originalItem } = req.params;

    // Initialize repository with user context
    const itemPreferenceRepository = new ItemPreferenceRepository();
    itemPreferenceRepository.setUserContext(req.user.id);

    const preference = await itemPreferenceRepository.getPreference(originalItem);

    if (preference) {
        sendSuccessResponse(req, res, {
            preference: {
                productId: preference.product_id,
                supplierId: preference.supplier_id,
                productDescription: preference.product_description,
                supplierName: preference.supplier_name,
                frequency: preference.frequency,
                lastUsed: preference.last_used
            }
        });
    } else {
        sendSuccessResponse(req, res, { preference: null }, {
            message: 'No unified preference found'
        });
    }
}));

/**
 * GET /api/preferences/unified
 * Get all unified preferences for the current user
 */
router.get('/unified', enhancedAsyncHandler(async (req, res) => {
    // Initialize repository with user context
    const itemPreferenceRepository = new ItemPreferenceRepository();
    itemPreferenceRepository.setUserContext(req.user.id);

    console.log('Fetching unified preferences for user:', req.user.id);
    const preferences = await itemPreferenceRepository.getAllWithDetails();

    sendSuccessResponse(req, res, { preferences }, {
        count: preferences.length,
        message: 'Unified preferences retrieved successfully'
    });
}));

/**
 * DELETE /api/preferences/unified/:id
 * Delete a unified preference by ID
 */
router.delete('/unified/:id',
    validateParams({
        id: { required: true, type: 'integer' }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { id } = req.params;

        // Initialize repository with user context
        const itemPreferenceRepository = new ItemPreferenceRepository();
        itemPreferenceRepository.setUserContext(req.user.id);

        const deleted = await itemPreferenceRepository.deleteById(parseInt(id));

        if (deleted) {
            sendSuccessResponse(req, res, { deleted: true }, {
                message: 'Unified preference deleted successfully'
            });
        } else {
            throw createNotFoundError('RESOURCE_001', 'Unified preference not found');
        }
    })
);

module.exports = router;