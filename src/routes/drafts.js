const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { enhancedAsyncHandler, createNotFoundError, createDatabaseError } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse } = require('../utils/errorResponse');
const { validateBody } = require('../middleware/validation');
const { pool } = require('../database/config');

// Clean up expired drafts every hour
setInterval(async () => {
    try {
        const result = await pool.query('SELECT cleanup_expired_draft_picklists()');
        const deletedCount = result.rows[0].cleanup_expired_draft_picklists;
        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} expired draft picklists`);
        }
    } catch (error) {
        console.error('Error cleaning up expired draft picklists:', error);
    }
}, 60 * 60 * 1000);

/**
 * Generate session ID from request headers
 */
function getSessionId(req) {
    // Use a combination of user agent and IP for session tracking
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    return crypto.createHash('sha256').update(`${userAgent}-${ip}-${req.user.id}`).digest('hex').substring(0, 32);
}

/**
 * POST /api/drafts
 * Save/create a draft picklist
 */
router.post('/',
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
        },
        sourceFileName: {
            required: false,
            type: 'string'
        },
        draftKey: {
            required: false,
            type: 'string'
        }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { picklist, title, sourceFileName, draftKey } = req.body;
        const sessionId = getSessionId(req);
        const finalDraftKey = draftKey || crypto.randomBytes(16).toString('hex');

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

        try {
            // Use INSERT ON CONFLICT to handle both create and update
            const result = await pool.query(`
                INSERT INTO draft_picklists (
                    user_id, session_id, draft_key, title, picklist_data, source_file_name, last_saved_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                ON CONFLICT (draft_key)
                DO UPDATE SET
                    title = EXCLUDED.title,
                    picklist_data = EXCLUDED.picklist_data,
                    source_file_name = EXCLUDED.source_file_name,
                    last_saved_at = CURRENT_TIMESTAMP
                RETURNING id, draft_key, created_at, last_saved_at
            `, [
                req.user.id,
                sessionId,
                finalDraftKey,
                title || 'Draft Picklist',
                JSON.stringify(cleanPicklist),
                sourceFileName
            ]);

            const draft = result.rows[0];

            sendSuccessResponse(req, res, {
                draftKey: draft.draft_key,
                message: draftKey ? 'Draft updated successfully' : 'Draft saved successfully',
                lastSavedAt: draft.last_saved_at.toISOString()
            });

        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw createDatabaseError('Draft key already exists');
            }
            throw error;
        }
    })
);

/**
 * GET /api/drafts
 * Get all user's non-expired drafts
 */
router.get('/',
    enhancedAsyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // Get drafts with count
        const result = await pool.query(`
            SELECT
                draft_key,
                title,
                source_file_name,
                created_at,
                last_saved_at,
                expires_at,
                jsonb_array_length(picklist_data) as item_count
            FROM draft_picklists
            WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
            ORDER BY last_saved_at DESC
            LIMIT $2 OFFSET $3
        `, [req.user.id, limit, offset]);

        // Get total count
        const countResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM draft_picklists
            WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
        `, [req.user.id]);

        const drafts = result.rows.map(draft => ({
            draftKey: draft.draft_key,
            title: draft.title,
            sourceFileName: draft.source_file_name,
            itemCount: parseInt(draft.item_count) || 0,
            createdAt: draft.created_at.toISOString(),
            lastSavedAt: draft.last_saved_at.toISOString(),
            expiresAt: draft.expires_at.toISOString()
        }));

        sendSuccessResponse(req, res, {
            drafts,
            total: parseInt(countResult.rows[0].total),
            limit,
            offset
        });
    })
);

/**
 * GET /api/drafts/:draftKey
 * Get specific draft
 */
router.get('/:draftKey',
    enhancedAsyncHandler(async (req, res) => {
        const { draftKey } = req.params;

        const result = await pool.query(`
            SELECT
                draft_key,
                title,
                picklist_data,
                source_file_name,
                created_at,
                last_saved_at,
                expires_at
            FROM draft_picklists
            WHERE draft_key = $1 AND user_id = $2 AND expires_at > CURRENT_TIMESTAMP
        `, [draftKey, req.user.id]);

        if (result.rows.length === 0) {
            throw createNotFoundError('Draft not found or expired');
        }

        const draft = result.rows[0];

        sendSuccessResponse(req, res, {
            draft: {
                draftKey: draft.draft_key,
                title: draft.title,
                picklist: draft.picklist_data,
                sourceFileName: draft.source_file_name,
                createdAt: draft.created_at.toISOString(),
                lastSavedAt: draft.last_saved_at.toISOString(),
                expiresAt: draft.expires_at.toISOString()
            }
        });
    })
);

/**
 * PUT /api/drafts/:draftKey
 * Update existing draft
 */
router.put('/:draftKey',
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
        const { draftKey } = req.params;
        const { picklist, title } = req.body;

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

        const result = await pool.query(`
            UPDATE draft_picklists
            SET
                picklist_data = $1,
                title = COALESCE($2, title),
                last_saved_at = CURRENT_TIMESTAMP
            WHERE draft_key = $3 AND user_id = $4 AND expires_at > CURRENT_TIMESTAMP
            RETURNING last_saved_at
        `, [JSON.stringify(cleanPicklist), title, draftKey, req.user.id]);

        if (result.rows.length === 0) {
            throw createNotFoundError('Draft not found or expired');
        }

        sendSuccessResponse(req, res, {
            message: 'Draft updated successfully',
            lastSavedAt: result.rows[0].last_saved_at.toISOString()
        });
    })
);

/**
 * DELETE /api/drafts/:draftKey
 * Delete draft
 */
router.delete('/:draftKey',
    enhancedAsyncHandler(async (req, res) => {
        const { draftKey } = req.params;

        const result = await pool.query(`
            DELETE FROM draft_picklists
            WHERE draft_key = $1 AND user_id = $2
            RETURNING id
        `, [draftKey, req.user.id]);

        if (result.rows.length === 0) {
            throw createNotFoundError('Draft not found');
        }

        sendSuccessResponse(req, res, {
            message: 'Draft deleted successfully'
        });
    })
);

/**
 * POST /api/drafts/:draftKey/promote
 * Convert draft to shared list
 */
router.post('/:draftKey/promote',
    validateBody({
        title: {
            required: false,
            type: 'string'
        }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { draftKey } = req.params;
        const { title } = req.body;

        // Start transaction
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get the draft
            const draftResult = await client.query(`
                SELECT picklist_data, title as draft_title, source_file_name
                FROM draft_picklists
                WHERE draft_key = $1 AND user_id = $2 AND expires_at > CURRENT_TIMESTAMP
            `, [draftKey, req.user.id]);

            if (draftResult.rows.length === 0) {
                throw createNotFoundError('Draft not found or expired');
            }

            const draft = draftResult.rows[0];
            const shareId = crypto.randomBytes(16).toString('hex');
            const finalTitle = title || draft.draft_title;

            // Create shared list
            const insertResult = await client.query(`
                INSERT INTO shopping_lists (share_id, title, picklist_data, user_id, created_by_user_id)
                VALUES ($1, $2, $3, $4, $4)
                RETURNING id, created_at, expires_at
            `, [shareId, finalTitle, draft.picklist_data, req.user.id]);

            const shoppingListId = insertResult.rows[0].id;
            const expiresAt = insertResult.rows[0].expires_at;

            // Initialize shopping list items
            const picklist = JSON.parse(draft.picklist_data);
            if (picklist.length > 0) {
                const itemInserts = picklist.map((item, index) => [
                    shoppingListId,
                    index,
                    parseInt(item.quantity) || 1
                ]);

                const valueStrings = itemInserts.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(',');
                const values = itemInserts.flat();

                await client.query(`
                    INSERT INTO shopping_list_items (shopping_list_id, item_index, requested_quantity)
                    VALUES ${valueStrings}
                `, values);
            }

            // Delete the draft
            await client.query(`
                DELETE FROM draft_picklists
                WHERE draft_key = $1 AND user_id = $2
            `, [draftKey, req.user.id]);

            await client.query('COMMIT');

            sendSuccessResponse(req, res, {
                shareId,
                shareUrl: `${req.protocol}://${req.get('host')}/shopping/${shareId}`,
                title: finalTitle,
                expiresAt: expiresAt.toISOString(),
                message: 'Draft promoted to shared list successfully'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    })
);

module.exports = router;