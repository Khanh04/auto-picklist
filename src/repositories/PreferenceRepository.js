const BaseRepository = require('./BaseRepository');

class PreferenceRepository extends BaseRepository {
    /**
     * Get all preferences with product details for a specific user
     * @param {number} userId - User ID to filter by
     * @returns {Promise<Array>} Preferences with product information
     */
    async getAll(userId) {
        const query = `
            SELECT sp.id, sp.original_item, sp.frequency, sp.last_used, sp.created_at,
                   s.name as supplier_name, sp.preferred_supplier_id
            FROM supplier_preferences sp
            JOIN suppliers s ON sp.preferred_supplier_id = s.id
            WHERE sp.user_id = $1
            ORDER BY sp.last_used DESC, sp.frequency DESC
        `;

        const result = await this.query(query, [userId]);
        return result.rows;
    }

    /**
     * Get preference by original item name
     * @param {string} originalItem - Original item name
     * @returns {Promise<Object|null>} Preference or null if not found
     */
    async getByOriginalItem(originalItem) {
        const query = `
            SELECT mp.matched_product_id, mp.frequency, p.description
            FROM matching_preferences mp
            JOIN products p ON mp.matched_product_id = p.id
            WHERE LOWER(mp.original_item) = LOWER($1)
            ORDER BY mp.frequency DESC, mp.last_used DESC
            LIMIT 1
        `;
        
        const result = await this.query(query, [originalItem]);
        return result.rows[0] || null;
    }

    /**
     * Store or update preference
     * @param {string} originalItem - Original item name
     * @param {number} matchedProductId - Matched product ID
     * @returns {Promise<Object>} Created or updated preference
     */
    async upsert(originalItem, matchedProductId) {
        const query = `
            INSERT INTO matching_preferences (original_item, matched_product_id, frequency, last_used)
            VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
            ON CONFLICT (original_item, matched_product_id)
            DO UPDATE SET 
                frequency = matching_preferences.frequency + 1,
                last_used = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const result = await this.query(query, [originalItem, matchedProductId]);
        return result.rows[0];
    }

    /**
     * Store multiple preferences in batch
     * @param {Array} preferences - Array of {originalItem, matchedProductId}
     * @returns {Promise<Array>} Created or updated preferences
     */
    async batchUpsert(preferences) {
        if (!preferences.length) return [];

        return await this.transaction(async (client) => {
            const results = [];
            
            for (const pref of preferences) {
                const query = `
                    INSERT INTO matching_preferences (original_item, matched_product_id, frequency, last_used)
                    VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
                    ON CONFLICT (original_item, matched_product_id)
                    DO UPDATE SET 
                        frequency = matching_preferences.frequency + 1,
                        last_used = CURRENT_TIMESTAMP
                    RETURNING *
                `;
                
                const result = await client.query(query, [pref.originalItem, pref.matchedProductId]);
                results.push(result.rows[0]);
            }
            
            return results;
        });
    }

    /**
     * Delete preference by ID
     * @param {number} preferenceId - Preference ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteById(preferenceId) {
        const query = 'DELETE FROM matching_preferences WHERE id = $1';
        const result = await this.query(query, [preferenceId]);
        return result.rowCount > 0;
    }

    /**
     * Initialize preferences table
     * @returns {Promise<void>}
     */
    async initializeTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS matching_preferences (
                id SERIAL PRIMARY KEY,
                original_item TEXT NOT NULL,
                matched_product_id INTEGER NOT NULL,
                frequency INTEGER DEFAULT 1,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (matched_product_id) REFERENCES products(id),
                UNIQUE(original_item, matched_product_id)
            )
        `;
        
        await this.query(query);
        
        // Clean up old supplier columns if they exist
        try {
            await this.query('ALTER TABLE matching_preferences DROP COLUMN IF EXISTS preferred_supplier');
            await this.query('ALTER TABLE matching_preferences DROP COLUMN IF EXISTS preferred_price');
        } catch (error) {
            // Columns might not exist, that's OK
        }
    }
}

module.exports = PreferenceRepository;