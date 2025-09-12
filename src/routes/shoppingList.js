const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { enhancedAsyncHandler, createNotFoundError, createDatabaseError } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse } = require('../utils/errorResponse');
const { validateBody } = require('../middleware/validation');
const { pool } = require('../database/config');

// Clean up expired lists every hour
setInterval(async () => {
    try {
        const result = await pool.query('SELECT cleanup_expired_shopping_lists()');
        const deletedCount = result.rows[0].cleanup_expired_shopping_lists;
        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} expired shopping lists`);
        }
    } catch (error) {
        console.error('Error cleaning up expired shopping lists:', error);
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
    enhancedAsyncHandler(async (req, res) => {
        const { picklist, title } = req.body;
        
        // Generate a unique ID for the shared list
        const shareId = crypto.randomBytes(16).toString('hex');
        
        // Process and clean picklist data
        const cleanPicklist = picklist.map(item => ({
            originalItem: item.originalItem || item.item,
            matchedDescription: item.matchedDescription,
            matchedItemId: item.matchedItemId,
            quantity: item.quantity,
            selectedSupplier: item.selectedSupplier,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
        }));

        // Insert into database
        const insertResult = await pool.query(`
            INSERT INTO shopping_lists (share_id, title, picklist_data)
            VALUES ($1, $2, $3)
            RETURNING id, created_at, expires_at
        `, [shareId, title || 'Shopping List', JSON.stringify(cleanPicklist)]);

        const shoppingListId = insertResult.rows[0].id;
        const createdAt = insertResult.rows[0].created_at;
        const expiresAt = insertResult.rows[0].expires_at;

        // Initialize all items with their requested quantities
        const itemInserts = cleanPicklist.map((item, index) => [
            shoppingListId, 
            index, 
            parseInt(item.quantity) || 1  // requested_quantity from picklist
        ]);
        
        if (itemInserts.length > 0) {
            const valueStrings = itemInserts.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(',');
            const values = itemInserts.flat();
            
            await pool.query(`
                INSERT INTO shopping_list_items (shopping_list_id, item_index, requested_quantity)
                VALUES ${valueStrings}
            `, values);
        }

        sendSuccessResponse(req, res, {
            shareId,
            shareUrl: `${req.protocol}://${req.get('host')}/shopping/${shareId}`,
            expiresAt: expiresAt.toISOString()
        });
    })
);

/**
 * GET /api/shopping-list/share/:shareId
 * Get a shared shopping list
 */
router.get('/share/:shareId', enhancedAsyncHandler(async (req, res) => {
    const { shareId } = req.params;
    
    // Get shopping list data with item states
    const listResult = await pool.query(`
        SELECT sl.id, sl.share_id, sl.title, sl.picklist_data, sl.created_at, sl.expires_at
        FROM shopping_lists sl
        WHERE sl.share_id = $1 AND sl.expires_at > CURRENT_TIMESTAMP
    `, [shareId]);

    if (listResult.rows.length === 0) {
        throw createNotFoundError('Shopping list', shareId);
    }

    const shoppingList = listResult.rows[0];
    
    // Get item states
    const itemsResult = await pool.query(`
        SELECT item_index, purchased_quantity, requested_quantity, updated_at
        FROM shopping_list_items
        WHERE shopping_list_id = $1
        ORDER BY item_index
    `, [shoppingList.id]);

    // Create a map of item states
    const itemStates = new Map();
    itemsResult.rows.forEach(row => {
        itemStates.set(row.item_index, {
            updatedAt: row.updated_at,
            purchasedQuantity: row.purchased_quantity,
            requestedQuantity: row.requested_quantity
        });
    });

    // Merge picklist data with item states
    const picklistWithStates = shoppingList.picklist_data.map((item, index) => ({
        ...item,
        index,
        purchasedQuantity: itemStates.get(index)?.purchasedQuantity || 0,
        requestedQuantity: itemStates.get(index)?.requestedQuantity || parseInt(item.quantity) || 1,
        updatedAt: itemStates.get(index)?.updatedAt
    }));

    sendSuccessResponse(req, res, {
        id: shoppingList.share_id,
        picklist: picklistWithStates,
        title: shoppingList.title,
        createdAt: shoppingList.created_at.toISOString(),
        expiresAt: shoppingList.expires_at.toISOString()
    });
}));

/**
 * PUT /api/shopping-list/share/:shareId/item/:itemIndex
 * Update item check state
 */
router.put('/share/:shareId/item/:itemIndex',
    validateBody({
        purchasedQuantity: {
            required: true,
            type: 'number'
        }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { shareId, itemIndex } = req.params;
        const { purchasedQuantity } = req.body;
        
        // First get the shopping list ID
        const listResult = await pool.query(`
            SELECT id FROM shopping_lists 
            WHERE share_id = $1 AND expires_at > CURRENT_TIMESTAMP
        `, [shareId]);

        if (listResult.rows.length === 0) {
            throw createNotFoundError('Shopping list', shareId);
        }

        const shoppingListId = listResult.rows[0].id;
        const itemIndexInt = parseInt(itemIndex);

        // Update the item state with the provided purchased quantity
        const updateResult = await pool.query(`
            UPDATE shopping_list_items 
            SET purchased_quantity = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE shopping_list_id = $2 AND item_index = $3
            RETURNING purchased_quantity, requested_quantity, updated_at
        `, [purchasedQuantity, shoppingListId, itemIndexInt]);

        if (updateResult.rows.length === 0) {
            throw createNotFoundError('Shopping list item', itemIndex);
        }

        const updatedItem = updateResult.rows[0];

        sendSuccessResponse(req, res, {
            itemIndex: itemIndexInt,
            updatedAt: updatedItem.updated_at,
            purchasedQuantity: updatedItem.purchased_quantity,
            requestedQuantity: updatedItem.requested_quantity
        });
    })
);

/**
 * PUT /api/shopping-list/share/:shareId/picklist
 * Update the entire picklist for a shared shopping list
 */
router.put('/share/:shareId/picklist',
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
        const { shareId } = req.params;
        const { picklist } = req.body;
        
        // First get the shopping list ID
        const listResult = await pool.query(`
            SELECT id FROM shopping_lists 
            WHERE share_id = $1 AND expires_at > CURRENT_TIMESTAMP
        `, [shareId]);

        if (listResult.rows.length === 0) {
            throw createNotFoundError('Shopping list', shareId);
        }

        const shoppingListId = listResult.rows[0].id;

        // Clean and update picklist data
        const cleanPicklist = picklist.map(item => ({
            originalItem: item.originalItem || item.item,
            matchedDescription: item.matchedDescription,
            matchedItemId: item.matchedItemId,
            quantity: item.quantity,
            selectedSupplier: item.selectedSupplier,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
        }));

        // Update the picklist data in the database
        await pool.query(`
            UPDATE shopping_lists 
            SET picklist_data = $1
            WHERE id = $2
        `, [JSON.stringify(cleanPicklist), shoppingListId]);

        sendSuccessResponse(req, res, {
            itemCount: cleanPicklist.length
        }, {
            message: 'Picklist updated successfully'
        });
    })
);

/**
 * GET /api/shopping-list/stats
 * Get sharing statistics (optional, for admin purposes)
 */
router.get('/stats', enhancedAsyncHandler(async (req, res) => {
    const statsResult = await pool.query(`
        SELECT 
            COUNT(*) as total_lists,
            COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_lists,
            COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_lists
        FROM shopping_lists
    `);

    const itemStatsResult = await pool.query(`
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN purchased_quantity >= requested_quantity THEN 1 END) as checked_items
        FROM shopping_list_items sli
        JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
        WHERE sl.expires_at > CURRENT_TIMESTAMP
    `);

    const stats = statsResult.rows[0];
    const itemStats = itemStatsResult.rows[0];

    sendSuccessResponse(req, res, {
        stats: {
            totalLists: parseInt(stats.total_lists),
            activeLists: parseInt(stats.active_lists),
            expiredLists: parseInt(stats.expired_lists),
            totalItems: parseInt(itemStats.total_items),
            checkedItems: parseInt(itemStats.checked_items)
        }
    });
}));

module.exports = router;