const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody } = require('../middleware/validation');

// Simple in-memory storage for current session's picklist
// In production, you might want to use Redis or database with session IDs
let currentSessionPicklist = null;

/**
 * POST /api/session/picklist
 * Save the current session's picklist
 */
router.post('/picklist',
    validateBody({
        picklist: { 
            required: true, 
            type: 'array',
            custom: (value) => {
                if (!Array.isArray(value) || value.length === 0) {
                    return 'must be a non-empty array';
                }
                return null;
            }
        }
    }),
    asyncHandler(async (req, res) => {
        const { picklist } = req.body;
        
        // Store the picklist in memory
        currentSessionPicklist = picklist;
        
        console.log(`Saved session picklist with ${picklist.length} items`);
        
        res.json({
            success: true,
            message: `Saved picklist with ${picklist.length} items`,
            itemCount: picklist.length
        });
    })
);

/**
 * GET /api/session/picklist
 * Get the current session's picklist
 */
router.get('/picklist', asyncHandler(async (req, res) => {
    if (currentSessionPicklist) {
        res.json({
            success: true,
            picklist: currentSessionPicklist,
            itemCount: currentSessionPicklist.length
        });
    } else {
        res.json({
            success: false,
            message: 'No saved picklist found'
        });
    }
}));

/**
 * DELETE /api/session/picklist
 * Clear the current session's picklist
 */
router.delete('/picklist', asyncHandler(async (req, res) => {
    currentSessionPicklist = null;
    
    res.json({
        success: true,
        message: 'Session picklist cleared'
    });
}));

module.exports = router;