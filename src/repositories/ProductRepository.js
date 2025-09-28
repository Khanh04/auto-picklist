const BaseRepository = require('./BaseRepository');
const { secureQuery, safeSelect } = require('../utils/secureDb');

class ProductRepository extends BaseRepository {
    /**
     * Get all products with best prices for the authenticated user
     * @returns {Promise<Array>} Products with best supplier and price
     */
    async getAllWithBestPrices() {
        if (!this.userId) {
            throw new Error('User context required for getAllWithBestPrices. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT DISTINCT p.id, p.description,
                   s.name as supplier_name,
                   sp.price,
                   ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY sp.price ASC) as price_rank
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE p.user_id = $1
                AND s.user_id = $1
                AND sp.user_id = $1
            ORDER BY p.description
        `;

        const result = await this.query(query, [this.userId]);

        // Group by product and get the best price for each
        const itemsMap = new Map();
        result.rows.forEach(row => {
            if (!itemsMap.has(row.id) || row.price_rank === 1) {
                itemsMap.set(row.id, {
                    id: row.id,
                    description: row.description,
                    bestSupplier: row.supplier_name,
                    bestPrice: row.price
                });
            }
        });

        return Array.from(itemsMap.values());
    }

    /**
     * Get suppliers for a specific product for the authenticated user
     * @param {number} productId - Product ID
     * @returns {Promise<Array>} Suppliers with prices for the product
     */
    async getSuppliersByProductId(productId) {
        if (!this.userId) {
            throw new Error('User context required for getSuppliersByProductId. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT s.id as supplier_id, s.name as supplier_name,
                   sp.price, sp.id as supplier_price_id
            FROM supplier_prices sp
            JOIN suppliers s ON sp.supplier_id = s.id
            JOIN products p ON sp.product_id = p.id
            WHERE sp.product_id = $1
                AND p.user_id = $2
                AND s.user_id = $2
                AND sp.user_id = $2
            ORDER BY sp.price ASC
        `;

        const result = await this.query(query, [productId, this.userId]);
        return result.rows;
    }

    /**
     * Create a new product for the authenticated user
     * @param {string} description - Product description
     * @returns {Promise<Object>} Created product
     */
    async create(description) {
        if (!this.userId) {
            throw new Error('User context required for create. Call setUserContext(userId) first.');
        }

        const query = `
            INSERT INTO products (description, normalized_description, user_id, created_at, updated_at)
            VALUES ($1, LOWER($1), $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await this.query(query, [description, this.userId]);
        return result.rows[0];
    }

    /**
     * Find product by description for the authenticated user
     * @param {string} description - Product description
     * @returns {Promise<Object|null>} Product or null if not found
     */
    async findByDescription(description) {
        if (!this.userId) {
            throw new Error('User context required for findByDescription. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT * FROM products
            WHERE LOWER(description) = LOWER($1)
                AND user_id = $2
            LIMIT 1
        `;

        const result = await this.query(query, [description, this.userId]);
        return result.rows[0] || null;
    }

    /**
     * Search products using PostgreSQL full-text search for the authenticated user
     * @param {string} searchTerm - Search term
     * @param {number} limit - Maximum results
     * @returns {Promise<Array>} Matching products
     */
    async search(searchTerm, limit = 10) {
        if (!this.userId) {
            throw new Error('User context required for search. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT p.*,
                   ts_rank(to_tsvector('english', p.description), to_tsquery('english', $1)) as rank
            FROM products p
            WHERE to_tsvector('english', p.description) @@ to_tsquery('english', $1)
                AND p.user_id = $3
            ORDER BY rank DESC, p.description
            LIMIT $2
        `;

        try {
            const result = await this.query(query, [searchTerm, limit, this.userId]);
            return result.rows;
        } catch (error) {
            // Fallback to LIKE search if full-text search fails
            const fallbackQuery = `
                SELECT * FROM products
                WHERE LOWER(description) LIKE LOWER($1)
                    AND user_id = $3
                ORDER BY description
                LIMIT $2
            `;
            const result = await this.query(fallbackQuery, [`%${searchTerm}%`, limit, this.userId]);
            return result.rows;
        }
    }
}

module.exports = ProductRepository;