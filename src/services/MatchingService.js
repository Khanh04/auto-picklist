const ProductRepository = require('../repositories/ProductRepository');
const PreferenceRepository = require('../repositories/PreferenceRepository');

class MatchingService {
    constructor() {
        this.productRepository = new ProductRepository();
        this.preferenceRepository = new PreferenceRepository();
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
                psp.supplier_name,
                psp.price,
                psp.description,
                psp.product_id,
                10 as match_score
            FROM product_supplier_prices psp
            WHERE LOWER(psp.description) LIKE $1
            ORDER BY psp.price ASC
            LIMIT 1
        `;
        
        const result = await client.query(query, [`%${normalizedItem.substring(0, 15)}%`]);
        
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
            categoryFilter = `AND (LOWER(psp.description) LIKE '%polish%' OR LOWER(psp.description) LIKE '%gel%' OR LOWER(psp.description) LIKE '%lacquer%')`;
        } else if (isToolRelated && !isPolishRelated) {
            categoryFilter = `AND (LOWER(psp.description) LIKE '%brush%' OR LOWER(psp.description) LIKE '%tool%' OR LOWER(psp.description) LIKE '%file%')`;
        }
        
        const query = `
            SELECT 
                psp.supplier_name,
                psp.price,
                psp.description,
                psp.product_id,
                5 as match_score
            FROM product_supplier_prices psp
            WHERE LOWER(psp.description) LIKE $1 ${categoryFilter}
            ORDER BY psp.price ASC
            LIMIT 1
        `;
        
        const result = await client.query(query, [`%${orderBrand}%`]);
        
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
                psp.supplier_name,
                psp.price,
                psp.description,
                psp.product_id,
                ts_rank(to_tsvector('english', psp.description), to_tsquery('english', $1)) as match_score
            FROM product_supplier_prices psp
            WHERE to_tsvector('english', psp.description) @@ to_tsquery('english', $1)
            ORDER BY match_score DESC, psp.price ASC
            LIMIT 1
        `;
        
        try {
            const result = await client.query(query, [tsQuery]);
            
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

        const wordConditions = importantWords.map((_, index) => `LOWER(psp.description) LIKE $${index + 1}`).join(' OR ');
        const wordParams = importantWords.map(word => `%${word}%`);
        
        const query = `
            SELECT 
                psp.supplier_name,
                psp.price,
                psp.description,
                psp.product_id,
                1 as match_score
            FROM product_supplier_prices psp
            WHERE ${wordConditions}
            ORDER BY psp.price ASC
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
            // Check for user preference first
            const preference = await this.preferenceRepository.getByOriginalItem(originalItem);
            
            if (preference) {
                // Get the cheapest supplier for this preferred product
                const suppliers = await this.productRepository.getSuppliersByProductId(preference.matched_product_id);
                
                if (suppliers.length > 0) {
                    const cheapestSupplier = suppliers[0]; // Already sorted by price ASC
                    return {
                        supplier: cheapestSupplier.supplier_name,
                        price: parseFloat(cheapestSupplier.price),
                        productId: preference.matched_product_id,
                        description: preference.description,
                        isPreference: true,
                        frequency: preference.frequency
                    };
                }
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