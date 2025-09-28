const BaseRepository = require('./BaseRepository');

class SupplierRepository extends BaseRepository {
    /**
     * Get all suppliers with product counts for a specific user
     * @param {number} userId - User ID to filter by
     * @returns {Promise<Array>} Suppliers with product counts
     */
    async getAllWithProductCounts(userId) {
        const query = `
            SELECT s.id, s.name, s.created_at,
                   COUNT(sp.product_id) as product_count
            FROM suppliers s
            LEFT JOIN supplier_prices sp ON s.id = sp.supplier_id AND sp.user_id = $1
            WHERE s.user_id = $2
            GROUP BY s.id, s.name, s.created_at
            ORDER BY s.name
        `;

        const result = await this.query(query, [userId, userId]);
        return result.rows;
    }

    /**
     * Get supplier by ID for the authenticated user
     * @param {number} supplierId - Supplier ID
     * @returns {Promise<Object|null>} Supplier or null if not found
     */
    async getById(supplierId) {
        if (!this.userId) {
            throw new Error('User context required for getById. Call setUserContext(userId) first.');
        }

        const query = 'SELECT * FROM suppliers WHERE id = $1 AND user_id = $2';
        const result = await this.query(query, [supplierId, this.userId]);
        return result.rows[0] || null;
    }

    /**
     * Get supplier items with prices for the authenticated user
     * @param {number} supplierId - Supplier ID
     * @returns {Promise<Array>} Supplier items
     */
    async getItemsBySupplierId(supplierId) {
        if (!this.userId) {
            throw new Error('User context required for getItemsBySupplierId. Call setUserContext(userId) first.');
        }

        const query = `
            SELECT p.id, p.description, sp.price, sp.id as supplier_price_id
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE sp.supplier_id = $1
                AND p.user_id = $2
                AND s.user_id = $2
                AND sp.user_id = $2
            ORDER BY p.description
        `;

        const result = await this.query(query, [supplierId, this.userId]);
        return result.rows;
    }

    /**
     * Create a new supplier for the authenticated user
     * @param {string} name - Supplier name
     * @returns {Promise<Object>} Created supplier
     */
    async create(name) {
        if (!this.userId) {
            throw new Error('User context required for create. Call setUserContext(userId) first.');
        }

        const query = `
            INSERT INTO suppliers (name, user_id, created_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await this.query(query, [name, this.userId]);
        return result.rows[0];
    }

    /**
     * Find supplier by name for the authenticated user
     * @param {string} name - Supplier name
     * @returns {Promise<Object|null>} Supplier or null if not found
     */
    async findByName(name) {
        if (!this.userId) {
            throw new Error('User context required for findByName. Call setUserContext(userId) first.');
        }

        const query = 'SELECT * FROM suppliers WHERE LOWER(name) = LOWER($1) AND user_id = $2';
        const result = await this.query(query, [name, this.userId]);
        return result.rows[0] || null;
    }

    /**
     * Update supplier price for a product for the authenticated user
     * @param {number} supplierPriceId - Supplier price ID
     * @param {number} newPrice - New price
     * @returns {Promise<Object>} Updated supplier price
     */
    async updatePrice(supplierPriceId, newPrice) {
        if (!this.userId) {
            throw new Error('User context required for updatePrice. Call setUserContext(userId) first.');
        }

        const query = `
            UPDATE supplier_prices
            SET price = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;

        const result = await this.query(query, [newPrice, supplierPriceId, this.userId]);
        return result.rows[0];
    }

    /**
     * Add product to supplier for the authenticated user
     * @param {number} productId - Product ID
     * @param {number} supplierId - Supplier ID
     * @param {number} price - Price
     * @returns {Promise<Object>} Created supplier price
     */
    async addProduct(productId, supplierId, price) {
        if (!this.userId) {
            throw new Error('User context required for addProduct. Call setUserContext(userId) first.');
        }

        const query = `
            INSERT INTO supplier_prices (product_id, supplier_id, price, user_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `;

        const result = await this.query(query, [productId, supplierId, price, this.userId]);
        return result.rows[0];
    }

    /**
     * Remove product from supplier for the authenticated user
     * @param {number} supplierPriceId - Supplier price ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async removeProduct(supplierPriceId) {
        if (!this.userId) {
            throw new Error('User context required for removeProduct. Call setUserContext(userId) first.');
        }

        const query = 'DELETE FROM supplier_prices WHERE id = $1 AND user_id = $2';
        const result = await this.query(query, [supplierPriceId, this.userId]);
        return result.rowCount > 0;
    }
}

module.exports = SupplierRepository;