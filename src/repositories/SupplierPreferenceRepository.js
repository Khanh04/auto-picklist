const BaseRepository = require('./BaseRepository');

/**
 * Repository for managing supplier preferences
 * Handles user's learned supplier selections for specific items
 */
class SupplierPreferenceRepository extends BaseRepository {
    /**
     * Get supplier preference for an item
     * @param {string} originalItem - Original item name
     * @param {number} matchedProductId - Optional product ID
     * @returns {Promise<Object|null>} Preference with supplier details
     */
    async getPreference(originalItem, matchedProductId = null) {
        const query = `
            SELECT sp.*, s.name as supplier_name, s.id as supplier_id
            FROM supplier_preferences sp
            JOIN suppliers s ON sp.preferred_supplier_id = s.id
            WHERE LOWER(sp.original_item) = LOWER($1)
            ${matchedProductId ? 'AND sp.matched_product_id = $2' : 'AND sp.matched_product_id IS NULL'}
            ORDER BY sp.frequency DESC, sp.last_used DESC
            LIMIT 1
        `;

        const params = matchedProductId ? [originalItem, matchedProductId] : [originalItem];
        const result = await this.query(query, params);
        return result.rows[0] || null;
    }

    /**
     * Store or update supplier preference
     * @param {string} originalItem - Original item name
     * @param {number} supplierId - Preferred supplier ID
     * @param {number} matchedProductId - Optional matched product ID
     * @returns {Promise<Object>} Created or updated preference
     */
    async upsert(originalItem, supplierId, matchedProductId = null) {
        const query = `
            INSERT INTO supplier_preferences (original_item, matched_product_id, preferred_supplier_id, frequency, last_used, updated_at)
            VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (original_item, matched_product_id, preferred_supplier_id)
            DO UPDATE SET
                frequency = supplier_preferences.frequency + 1,
                last_used = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await this.query(query, [originalItem, matchedProductId, supplierId]);
        return result.rows[0];
    }

    /**
     * Batch store supplier preferences from shopping list
     * @param {Array} preferences - Array of {originalItem, supplierId, matchedProductId}
     * @returns {Promise<Array>} Created or updated preferences
     */
    async batchUpsert(preferences) {
        if (!preferences.length) return [];

        return await this.transaction(async (client) => {
            const results = [];

            for (const pref of preferences) {
                const query = `
                    INSERT INTO supplier_preferences (original_item, matched_product_id, preferred_supplier_id, frequency, last_used, updated_at)
                    VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (original_item, matched_product_id, preferred_supplier_id)
                    DO UPDATE SET
                        frequency = supplier_preferences.frequency + 1,
                        last_used = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `;

                const result = await client.query(query, [
                    pref.originalItem,
                    pref.matchedProductId,
                    pref.supplierId
                ]);
                results.push(result.rows[0]);
            }

            return results;
        });
    }

    /**
     * Get all supplier preferences with details
     * @returns {Promise<Array>} All preferences with supplier and product details
     */
    async getAllWithDetails() {
        const query = `
            SELECT sp.*,
                   s.name as supplier_name,
                   p.description as product_description
            FROM supplier_preferences sp
            JOIN suppliers s ON sp.preferred_supplier_id = s.id
            LEFT JOIN products p ON sp.matched_product_id = p.id
            ORDER BY sp.last_used DESC, sp.frequency DESC
        `;

        const result = await this.query(query);
        return result.rows;
    }

    /**
     * Get preferences for multiple items efficiently
     * @param {Array} items - Array of {originalItem, matchedProductId}
     * @returns {Promise<Map>} Map of item keys to preferences
     */
    async getPreferencesForItems(items) {
        if (!items.length) return new Map();

        const preferences = new Map();

        for (const item of items) {
            const preference = await this.getPreference(item.originalItem, item.matchedProductId);
            if (preference) {
                const key = `${item.originalItem}_${item.matchedProductId || 'null'}`;
                preferences.set(key, preference);
            }
        }

        return preferences;
    }

    /**
     * Delete preference by ID
     * @param {number} preferenceId - Preference ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteById(preferenceId) {
        const query = 'DELETE FROM supplier_preferences WHERE id = $1';
        const result = await this.query(query, [preferenceId]);
        return result.rowCount > 0;
    }

    /**
     * Get preference count for an item
     * @param {string} originalItem - Original item name
     * @param {number} matchedProductId - Optional product ID
     * @returns {Promise<number>} Number of times this preference was used
     */
    async getPreferenceCount(originalItem, matchedProductId = null) {
        const preference = await this.getPreference(originalItem, matchedProductId);
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
        const query = `
            SELECT
                COUNT(*) as total_preferences,
                COUNT(DISTINCT original_item) as unique_items,
                COUNT(DISTINCT preferred_supplier_id) as unique_suppliers,
                AVG(frequency) as avg_frequency,
                MAX(frequency) as max_frequency,
                COUNT(CASE WHEN last_used >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_usage
            FROM supplier_preferences
        `;

        const result = await this.query(query);
        return result.rows[0];
    }

    /**
     * Clean up old preferences that haven't been used recently
     * @param {number} daysOld - Days since last use to consider for cleanup
     * @returns {Promise<number>} Number of preferences cleaned up
     */
    async cleanupOldPreferences(daysOld = 365) {
        const query = `
            DELETE FROM supplier_preferences
            WHERE last_used < CURRENT_DATE - INTERVAL '${daysOld} days'
            AND frequency <= 1
        `;

        const result = await this.query(query);
        return result.rowCount;
    }
}

module.exports = SupplierPreferenceRepository;