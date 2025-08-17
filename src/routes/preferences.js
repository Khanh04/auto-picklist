const express = require('express');
const router = express.Router();

const PreferenceRepository = require('../repositories/PreferenceRepository');
const PicklistService = require('../services/PicklistService');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody, validateParams } = require('../middleware/validation');

const preferenceRepository = new PreferenceRepository();
const picklistService = new PicklistService();

/**
 * GET /api/preferences
 * Get all user preferences
 */
router.get('/', asyncHandler(async (req, res) => {
    const preferences = await preferenceRepository.getAll();
    
    res.json({
        success: true,
        preferences
    });
}));

/**
 * GET /api/preferences/:originalItem
 * Get preference for a specific original item
 */
router.get('/:originalItem', asyncHandler(async (req, res) => {
    const { originalItem } = req.params;
    
    const preference = await preferenceRepository.getByOriginalItem(originalItem);
    
    if (preference) {
        res.json({
            success: true,
            preference: {
                productId: preference.matched_product_id,
                description: preference.description,
                frequency: preference.frequency
            }
        });
    } else {
        res.json({
            success: false,
            message: 'No preference found'
        });
    }
}));

/**
 * POST /api/preferences
 * Store user matching preferences
 */
router.post('/',
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
                    if (!pref.matchedProductId || !Number.isInteger(pref.matchedProductId)) {
                        return 'each preference must have a valid matchedProductId';
                    }
                }
                return null;
            }
        }
    }),
    asyncHandler(async (req, res) => {
        const { preferences } = req.body;
        
        const storedPreferences = await picklistService.storePreferences(preferences);
        
        res.json({
            success: true,
            message: `Stored ${storedPreferences.length} matching preferences`,
            preferences: storedPreferences
        });
    })
);

/**
 * DELETE /api/preferences/:preferenceId
 * Delete a specific preference
 */
router.delete('/:preferenceId',
    validateParams({ preferenceId: { type: 'id' } }),
    asyncHandler(async (req, res) => {
        const { preferenceId } = req.params;
        
        const deleted = await preferenceRepository.deleteById(preferenceId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Preference not found'
            });
        }

        res.json({
            success: true,
            message: 'Preference deleted successfully'
        });
    })
);

/**
 * POST /api/preferences/batch-delete
 * Delete multiple preferences
 */
router.post('/batch-delete',
    validateBody({
        preferenceIds: { 
            required: true, 
            type: 'array',
            custom: (value) => {
                if (!Array.isArray(value) || value.length === 0) {
                    return 'must be a non-empty array';
                }
                
                for (const id of value) {
                    if (!Number.isInteger(id) || id <= 0) {
                        return 'all IDs must be positive integers';
                    }
                }
                return null;
            }
        }
    }),
    asyncHandler(async (req, res) => {
        const { preferenceIds } = req.body;
        
        let deletedCount = 0;
        for (const id of preferenceIds) {
            const deleted = await preferenceRepository.deleteById(id);
            if (deleted) deletedCount++;
        }
        
        res.json({
            success: true,
            message: `Deleted ${deletedCount} preferences`,
            deletedCount,
            requestedCount: preferenceIds.length
        });
    })
);

module.exports = router;