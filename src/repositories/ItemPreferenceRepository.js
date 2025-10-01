const BaseRepository = require('./BaseRepository');

/**
 * Repository for managing unified item preferences
 * Maps original_item directly to {product_id, supplier_id}
 */
class ItemPreferenceRepository extends BaseRepository {
    /**
     * Get preference for an item (single lookup)
     * @param {string} originalItem - Original item name
     * @returns {Promise<Object|null>} Complete preference with product and supplier info
     */
    async getPreference(originalItem) {
        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT
                ip.*,
                p.description as product_description,
                s.name as supplier_name
            FROM item_preferences ip
            JOIN products p ON ip.product_id = p.id
            JOIN suppliers s ON ip.supplier_id = s.id
            WHERE LOWER(ip.original_item) = LOWER($1)
            AND ip.user_id = $2
            ORDER BY ip.frequency DESC, ip.last_used DESC
            LIMIT 1
        `;

        const result = await this.query(query, [originalItem, this.userId]);
        return result.rows[0] || null;
    }

    /**
     * Store or update preference (product_id and supplier_id together)
     * @param {string} originalItem - Original item name
     * @param {number} productId - Product ID
     * @param {number} supplierId - Supplier ID
     * @returns {Promise<Object>} Created or updated preference
     */
    async upsert(originalItem, productId, supplierId) {
        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const query = `
            INSERT INTO item_preferences (user_id, original_item, product_id, supplier_id, frequency, last_used, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, original_item)
            DO UPDATE SET
                product_id = EXCLUDED.product_id,
                supplier_id = EXCLUDED.supplier_id,
                frequency = item_preferences.frequency + 1,
                last_used = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await this.query(query, [this.userId, originalItem, productId, supplierId]);
        return result.rows[0];
    }

    /**
     * Batch store item preferences
     * @param {Array} preferences - Array of {originalItem, productId, supplierId}
     * @returns {Promise<Array>} Created or updated preferences
     */
    async batchUpsert(preferences) {
        if (!preferences.length) return [];

        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        return await this.transaction(async (client) => {
            const results = [];

            for (const pref of preferences) {
                const query = `
                    INSERT INTO item_preferences (user_id, original_item, product_id, supplier_id, frequency, last_used, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, original_item)
                    DO UPDATE SET
                        product_id = EXCLUDED.product_id,
                        supplier_id = EXCLUDED.supplier_id,
                        frequency = item_preferences.frequency + 1,
                        last_used = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `;

                const result = await client.query(query, [
                    this.userId,
                    pref.originalItem,
                    pref.productId,
                    pref.supplierId
                ]);
                results.push(result.rows[0]);
            }

            return results;
        });
    }

    /**
     * Get all item preferences for a user with details
     * @returns {Promise<Array>} All preferences with product and supplier details
     */
    async getAllWithDetails() {
        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT
                ip.*,
                p.description as product_description,
                s.name as supplier_name
            FROM item_preferences ip
            JOIN products p ON ip.product_id = p.id
            JOIN suppliers s ON ip.supplier_id = s.id
            WHERE ip.user_id = $1
            ORDER BY ip.last_used DESC, ip.frequency DESC
        `;

        const result = await this.query(query, [this.userId]);
        return result.rows;
    }

    /**
     * Get preferences for multiple items efficiently
     * @param {Array} items - Array of item names
     * @returns {Promise<Map>} Map of item names to preferences
     */
    async getPreferencesForItems(items) {
        if (!items.length) return new Map();

        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const preferences = new Map();
        const placeholders = items.map((_, index) => `$${index + 2}`).join(',');

        const query = `
            SELECT
                ip.*,
                p.description as product_description,
                s.name as supplier_name
            FROM item_preferences ip
            JOIN products p ON ip.product_id = p.id
            JOIN suppliers s ON ip.supplier_id = s.id
            WHERE ip.user_id = $1
            AND LOWER(ip.original_item) IN (${placeholders})
            ORDER BY ip.frequency DESC, ip.last_used DESC
        `;

        const params = [this.userId, ...items.map(item => item.toLowerCase())];
        const result = await this.query(query, params);

        result.rows.forEach(pref => {
            preferences.set(pref.original_item.toLowerCase(), pref);
        });

        return preferences;
    }

    /**
     * Delete preference by ID
     * @param {number} preferenceId - Preference ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteById(preferenceId) {
        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const query = 'DELETE FROM item_preferences WHERE id = $1 AND user_id = $2';
        const result = await this.query(query, [preferenceId, this.userId]);
        return result.rowCount > 0;
    }

    /**
     * Delete preference by item name
     * @param {string} originalItem - Original item name
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteByItem(originalItem) {
        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const query = 'DELETE FROM item_preferences WHERE LOWER(original_item) = LOWER($1) AND user_id = $2';
        const result = await this.query(query, [originalItem, this.userId]);
        return result.rowCount > 0;
    }

    /**
     * Get preference count for an item
     * @param {string} originalItem - Original item name
     * @returns {Promise<number>} Number of times this preference was used
     */
    async getPreferenceCount(originalItem) {
        const preference = await this.getPreference(originalItem);
        return preference ? preference.frequency : 0;
    }

    /**
     * Calculate preference strength based on usage history
     * @param {Object} preference - Preference object
     * @returns {number} Strength score between 0.1 and 1.0
     */
    calculatePreferenceStrength(preference) {
        if (!preference) return 0;

        const frequency = preference.frequency;
        const daysSinceUsed = (Date.now() - new Date(preference.last_used).getTime()) / (1000 * 60 * 60 * 24);

        let strength = Math.min(frequency / 5, 1.0); // Max strength at 5 uses

        // Decay based on recency
        if (daysSinceUsed > 90) strength *= 0.8;      // 3+ months old
        else if (daysSinceUsed > 30) strength *= 0.9; // 1+ month old

        return Math.max(strength, 0.1); // Minimum strength 0.1
    }

    /**
     * Get preference statistics for reporting
     * @returns {Promise<Object>} Preference statistics
     */
    async getPreferenceStats() {
        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT
                COUNT(*) as total_preferences,
                COUNT(DISTINCT original_item) as unique_items,
                COUNT(DISTINCT product_id) as unique_products,
                COUNT(DISTINCT supplier_id) as unique_suppliers,
                AVG(frequency) as avg_frequency,
                MAX(frequency) as max_frequency,
                COUNT(CASE WHEN last_used >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_usage
            FROM item_preferences
            WHERE user_id = $1
        `;

        const result = await this.query(query, [this.userId]);
        return result.rows[0];
    }

    /**
     * Clean up old preferences that haven't been used recently
     * @param {number} daysOld - Days since last use to consider for cleanup
     * @returns {Promise<number>} Number of preferences cleaned up
     */
    async cleanupOldPreferences(daysOld = 365) {
        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const query = `
            DELETE FROM item_preferences
            WHERE user_id = $1
            AND last_used < CURRENT_DATE - INTERVAL '${daysOld} days'
            AND frequency <= 1
        `;

        const result = await this.query(query, [this.userId]);
        return result.rowCount;
    }

    /**
     * Check if a preference exists for an item
     * @param {string} originalItem - Original item name
     * @returns {Promise<boolean>} True if preference exists
     */
    async hasPreference(originalItem) {
        const preference = await this.getPreference(originalItem);
        return !!preference;
    }

    /**
     * Search preferences by item name pattern
     * @param {string} searchPattern - Search pattern (SQL LIKE pattern)
     * @returns {Promise<Array>} Matching preferences
     */
    async searchPreferences(searchPattern) {
        if (!this.userId) {
            throw new Error('User context required for item preferences. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT
                ip.*,
                p.description as product_description,
                s.name as supplier_name
            FROM item_preferences ip
            JOIN products p ON ip.product_id = p.id
            JOIN suppliers s ON ip.supplier_id = s.id
            WHERE ip.user_id = $1
            AND LOWER(ip.original_item) LIKE LOWER($2)
            ORDER BY ip.frequency DESC, ip.last_used DESC
        `;

        const result = await this.query(query, [this.userId, searchPattern]);
        return result.rows;
    }
}

module.exports = ItemPreferenceRepository;