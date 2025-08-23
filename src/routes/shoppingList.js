const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { asyncHandler } = require('../middleware/errorHandler');
const { validateBody } = require('../middleware/validation');

// In-memory storage for demo purposes
// In production, you'd use a database like Redis or PostgreSQL
const sharedLists = new Map();

// Clean up expired lists every hour
const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of sharedLists.entries()) {
        if (now - data.createdAt > EXPIRY_TIME) {
            sharedLists.delete(id);
        }
    }
}, 60 * 60 * 1000);

/**
 * POST /api/shopping-list/share
 * Create a shareable shopping list
 */
router.post('/share',
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
        },
        title: {
            required: false,
            type: 'string'
        }
    }),
    asyncHandler(async (req, res) => {
        const { picklist, title } = req.body;
        
        // Generate a unique ID for the shared list
        const shareId = crypto.randomBytes(16).toString('hex');
        
        // Calculate summary statistics
        const totalItems = picklist.length;
        const totalCost = picklist
            .filter(item => !isNaN(parseFloat(item.totalPrice)))
            .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
        const itemsWithSuppliers = picklist.filter(item => 
            item.selectedSupplier && item.selectedSupplier !== 'No supplier found'
        ).length;

        // Store the shared list
        const sharedData = {
            id: shareId,
            picklist: picklist.map(item => ({
                originalItem: item.originalItem || item.item,
                matchedDescription: item.matchedDescription,
                quantity: item.quantity,
                selectedSupplier: item.selectedSupplier,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice
            })),
            title: title || 'Shopping List',
            summary: {
                totalItems,
                totalCost: parseFloat(totalCost.toFixed(2)),
                itemsWithSuppliers
            },
            createdAt: Date.now()
        };
        
        sharedLists.set(shareId, sharedData);
        
        res.json({
            success: true,
            shareId,
            shareUrl: `${req.protocol}://${req.get('host')}/shopping/${shareId}`,
            expiresAt: new Date(Date.now() + EXPIRY_TIME).toISOString()
        });
    })
);

/**
 * GET /api/shopping-list/share/:shareId
 * Get a shared shopping list
 */
router.get('/share/:shareId', asyncHandler(async (req, res) => {
    const { shareId } = req.params;
    
    const sharedData = sharedLists.get(shareId);
    
    if (!sharedData) {
        return res.status(404).json({
            success: false,
            error: 'Shopping list not found or expired'
        });
    }
    
    // Check if expired
    if (Date.now() - sharedData.createdAt > EXPIRY_TIME) {
        sharedLists.delete(shareId);
        return res.status(410).json({
            success: false,
            error: 'Shopping list has expired'
        });
    }
    
    res.json({
        success: true,
        data: {
            id: sharedData.id,
            picklist: sharedData.picklist,
            title: sharedData.title,
            summary: sharedData.summary,
            createdAt: new Date(sharedData.createdAt).toISOString()
        }
    });
}));

/**
 * GET /api/shopping-list/stats
 * Get sharing statistics (optional, for admin purposes)
 */
router.get('/stats', asyncHandler(async (req, res) => {
    const totalShared = sharedLists.size;
    const now = Date.now();
    const activeShared = Array.from(sharedLists.values())
        .filter(data => now - data.createdAt <= EXPIRY_TIME).length;
    
    res.json({
        success: true,
        stats: {
            totalShared,
            activeShared,
            expiredCleanup: totalShared - activeShared
        }
    });
}));

module.exports = router;