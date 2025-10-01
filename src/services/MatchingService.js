const ProductRepository = require('../repositories/ProductRepository');
const ItemPreferenceRepository = require('../repositories/ItemPreferenceRepository');

class MatchingService {
    constructor(userId = null) {
        this.productRepository = new ProductRepository(userId);
        this.itemPreferenceRepository = new ItemPreferenceRepository(userId);
        this.userId = userId;
    }

    /**
     * Set user context for this service and all repositories
     * @param {number} userId - User ID to filter by
     */
    setUserContext(userId) {
        this.userId = userId;
        this.productRepository.setUserContext(userId);
        this.itemPreferenceRepository.setUserContext(userId);
    }

    /**
     * Normalize item names for better matching
     * @param {string} itemName - Original item name
     * @returns {string} Normalized item name
     */
    normalizeItemName(itemName) {
        return itemName
            .replace(/\[.*?\]/g, '')  // Remove bracketed text
            .replace(/\*.*?\*/g, '')  // Remove text between asterisks
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim()
            .toLowerCase();
    }

    /**
     * Find the best supplier with lowest price for a given item using advanced matching
     * @param {string} itemName - Name of the item to find
     * @returns {Promise<Object>} Object with supplier, price, productId, and description
     */
    async findBestSupplier(itemName) {
        if (!itemName || itemName.length < 3) {
            return { supplier: null, price: null, productId: null, description: null };
        }

        if (!this.userId) {
            throw new Error('User context required for product matching. Call setUserContext(userId) first.');
        }

        const { pool } = require('../database/config');
        const client = await pool.connect();

        try {
            const normalizedItem = this.normalizeItemName(itemName);
            const searchWords = normalizedItem.split(' ').filter(word => word.length > 2);

            if (searchWords.length === 0) {
                return { supplier: null, price: null, productId: null, description: null };
            }

            // Strategy 1: Exact substring match (highest priority)
            let result = await this._exactSubstringMatch(client, normalizedItem);
            if (result) return result;

            // Strategy 2: Brand/product name match with category check
            result = await this._brandCategoryMatch(client, itemName, normalizedItem);
            if (result) return result;

            // Strategy 3: Multiple word match using full-text search
            result = await this._fullTextMatch(client, searchWords);
            if (result) return result;

            // Strategy 4: Single important word match
            result = await this._importantWordMatch(client, searchWords);
            if (result) return result;

            // No match found
            return { supplier: null, price: null, productId: null, description: null };

        } catch (error) {
            console.error('Database query error:', error);
            return { supplier: null, price: null, productId: null, description: null };
        } finally {
            client.release();
        }
    }

    /**
     * Strategy 1: Exact substring match
     * @private
     */
    async _exactSubstringMatch(client, normalizedItem) {
        const query = `
            SELECT
                s.name as supplier_name,
                sp.price,
                p.description,
                p.id as product_id,
                10 as match_score
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE LOWER(p.description) LIKE $1
                AND p.user_id = $2
                AND s.user_id = $2
                AND sp.user_id = $2
            ORDER BY sp.price ASC
            LIMIT 1
        `;

        const result = await client.query(query, [`%${normalizedItem.substring(0, 15)}%`, this.userId]);

        if (result.rows.length > 0) {
            const match = result.rows[0];
            console.log(`Match found for "${normalizedItem}": ${match.supplier_name} at $${match.price}`);
            return {
                supplier: match.supplier_name,
                price: parseFloat(match.price),
                productId: match.product_id,
                description: match.description
            };
        }
        return null;
    }

    /**
     * Strategy 2: Brand/product name match with category check
     * @private
     */
    async _brandCategoryMatch(client, itemName, normalizedItem) {
        const orderBrand = normalizedItem.split(' ')[0];
        if (orderBrand.length <= 2) return null;

        // Get main product type from the order item to avoid cross-category matches
        const isPolishRelated = /polish|gel|lacquer|color|duo/i.test(itemName);
        const isToolRelated = /brush|tool|dotting|file|buffer/i.test(itemName);

        let categoryFilter = '';
        if (isPolishRelated && !isToolRelated) {
            categoryFilter = `AND (LOWER(p.description) LIKE '%polish%' OR LOWER(p.description) LIKE '%gel%' OR LOWER(p.description) LIKE '%lacquer%')`;
        } else if (isToolRelated && !isPolishRelated) {
            categoryFilter = `AND (LOWER(p.description) LIKE '%brush%' OR LOWER(p.description) LIKE '%tool%' OR LOWER(p.description) LIKE '%file%')`;
        }

        const query = `
            SELECT
                s.name as supplier_name,
                sp.price,
                p.description,
                p.id as product_id,
                5 as match_score
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE LOWER(p.description) LIKE $1 ${categoryFilter}
                AND p.user_id = $2
                AND s.user_id = $2
                AND sp.user_id = $2
            ORDER BY sp.price ASC
            LIMIT 1
        `;

        const result = await client.query(query, [`%${orderBrand}%`, this.userId]);

        if (result.rows.length > 0) {
            const match = result.rows[0];
            console.log(`Brand match found for "${itemName}": ${match.supplier_name} at $${match.price}`);
            return {
                supplier: match.supplier_name,
                price: parseFloat(match.price),
                productId: match.product_id,
                description: match.description
            };
        }
        return null;
    }

    /**
     * Strategy 3: Multiple word match using full-text search
     * @private
     */
    async _fullTextMatch(client, searchWords) {
        if (searchWords.length < 2) return null;

        const tsQuery = searchWords.join(' & ');
        const query = `
            SELECT
                s.name as supplier_name,
                sp.price,
                p.description,
                p.id as product_id,
                ts_rank(to_tsvector('english', p.description), to_tsquery('english', $1)) as match_score
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE to_tsvector('english', p.description) @@ to_tsquery('english', $1)
                AND p.user_id = $2
                AND s.user_id = $2
                AND sp.user_id = $2
            ORDER BY match_score DESC, sp.price ASC
            LIMIT 1
        `;

        try {
            const result = await client.query(query, [tsQuery, this.userId]);

            if (result.rows.length > 0) {
                const match = result.rows[0];
                console.log(`Full-text match found: ${match.supplier_name} at $${match.price}`);
                return {
                    supplier: match.supplier_name,
                    price: parseFloat(match.price),
                    productId: match.product_id,
                    description: match.description
                };
            }
        } catch (error) {
            // Full-text search might fail with complex queries, continue to next strategy
            console.log('Full-text search failed, trying alternative approach...');
        }
        return null;
    }

    /**
     * Strategy 4: Single important word match
     * @private
     */
    async _importantWordMatch(client, searchWords) {
        const importantWords = searchWords.filter(word =>
            word.length > 4 && !['nail', 'polish', 'color', 'glue', 'tool', 'brush', 'size'].includes(word)
        );

        if (importantWords.length === 0) return null;

        const wordConditions = importantWords.map((_, index) => `LOWER(p.description) LIKE $${index + 1}`).join(' OR ');
        const wordParams = [...importantWords.map(word => `%${word}%`), this.userId, this.userId, this.userId];

        const query = `
            SELECT
                s.name as supplier_name,
                sp.price,
                p.description,
                p.id as product_id,
                1 as match_score
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE (${wordConditions})
                AND p.user_id = $${wordParams.length - 2}
                AND s.user_id = $${wordParams.length - 1}
                AND sp.user_id = $${wordParams.length}
            ORDER BY sp.price ASC
            LIMIT 1
        `;

        const result = await client.query(query, wordParams);

        if (result.rows.length > 0) {
            const match = result.rows[0];
            console.log(`Word match found: ${match.supplier_name} at $${match.price}`);
            return {
                supplier: match.supplier_name,
                price: parseFloat(match.price),
                productId: match.product_id,
                description: match.description
            };
        }
        return null;
    }

    /**
     * Match an item against user preferences first, then fallback to automatic matching
     * @param {string} originalItem - Original item name
     * @returns {Promise<Object>} Matching result with preference flag
     */
    async matchWithPreferences(originalItem) {
        try {
            // Check for unified preference first (includes both product and supplier)
            const unifiedPreference = await this.itemPreferenceRepository.getPreference(originalItem);

            if (unifiedPreference) {
                // Unified preference includes both product_id and supplier_id
                return {
                    supplier: unifiedPreference.supplier_name,
                    price: null, // Will be filled in by the system that uses this
                    productId: unifiedPreference.product_id,
                    description: unifiedPreference.product_description,
                    isPreference: true,
                    frequency: unifiedPreference.frequency,
                    // Additional unified preference data
                    supplierId: unifiedPreference.supplier_id,
                    isUnifiedPreference: true
                };
            }

            // Fallback to automatic matching
            const automaticMatch = await this.findBestSupplier(originalItem);
            return {
                ...automaticMatch,
                isPreference: false
            };

        } catch (error) {
            console.error('Error in matchWithPreferences:', error);
            return { supplier: null, price: null, productId: null, description: null, isPreference: false };
        }
    }
}

module.exports = MatchingService;