const express = require('express');
const router = express.Router();
const { enhancedAsyncHandler } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse } = require('../utils/errorResponse');
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
    enhancedAsyncHandler(async (req, res) => {
        const { picklist } = req.body;
        
        // Store the picklist in memory
        currentSessionPicklist = picklist;
        
        console.log(`Saved session picklist with ${picklist.length} items`);
        
        sendSuccessResponse(req, res, {
            itemCount: picklist.length
        }, {
            message: `Saved picklist with ${picklist.length} items`
        });
    })
);

/**
 * GET /api/session/picklist
 * Get the current session's picklist
 */
router.get('/picklist', enhancedAsyncHandler(async (req, res) => {
    if (currentSessionPicklist) {
        sendSuccessResponse(req, res, {
            picklist: currentSessionPicklist,
            itemCount: currentSessionPicklist.length
        });
    } else {
        sendSuccessResponse(req, res, {
            picklist: null
        }, {
            message: 'No saved picklist found'
        });
    }
}));

/**
 * DELETE /api/session/picklist
 * Clear the current session's picklist
 */
router.delete('/picklist', enhancedAsyncHandler(async (req, res) => {
    currentSessionPicklist = null;
    
    sendSuccessResponse(req, res, {}, {
        message: 'Session picklist cleared'
    });
}));

module.exports = router;