const BaseRepository = require('./BaseRepository');

class SupplierRepository extends BaseRepository {
    /**
     * Get all suppliers with product counts
     * @returns {Promise<Array>} Suppliers with product counts
     */
    async getAllWithProductCounts() {
        const query = `
            SELECT s.id, s.name, s.created_at,
                   COUNT(sp.product_id) as product_count
            FROM suppliers s
            LEFT JOIN supplier_prices sp ON s.id = sp.supplier_id
            GROUP BY s.id, s.name, s.created_at
            ORDER BY s.name
        `;
        
        const result = await this.query(query);
        return result.rows;
    }

    /**
     * Get supplier by ID
     * @param {number} supplierId - Supplier ID
     * @returns {Promise<Object|null>} Supplier or null if not found
     */
    async getById(supplierId) {
        const query = 'SELECT * FROM suppliers WHERE id = $1';
        const result = await this.query(query, [supplierId]);
        return result.rows[0] || null;
    }

    /**
     * Get supplier items with prices
     * @param {number} supplierId - Supplier ID
     * @returns {Promise<Array>} Supplier items
     */
    async getItemsBySupplierId(supplierId) {
        const query = `
            SELECT p.id, p.description, sp.price, sp.id as supplier_price_id
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            WHERE sp.supplier_id = $1
            ORDER BY p.description
        `;
        
        const result = await this.query(query, [supplierId]);
        return result.rows;
    }

    /**
     * Create a new supplier
     * @param {string} name - Supplier name
     * @returns {Promise<Object>} Created supplier
     */
    async create(name) {
        const query = `
            INSERT INTO suppliers (name, created_at)
            VALUES ($1, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        
        const result = await this.query(query, [name]);
        return result.rows[0];
    }

    /**
     * Find supplier by name
     * @param {string} name - Supplier name
     * @returns {Promise<Object|null>} Supplier or null if not found
     */
    async findByName(name) {
        const query = 'SELECT * FROM suppliers WHERE LOWER(name) = LOWER($1)';
        const result = await this.query(query, [name]);
        return result.rows[0] || null;
    }

    /**
     * Update supplier price for a product
     * @param {number} supplierPriceId - Supplier price ID
     * @param {number} newPrice - New price
     * @returns {Promise<Object>} Updated supplier price
     */
    async updatePrice(supplierPriceId, newPrice) {
        const query = `
            UPDATE supplier_prices 
            SET price = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        
        const result = await this.query(query, [newPrice, supplierPriceId]);
        return result.rows[0];
    }

    /**
     * Add product to supplier
     * @param {number} productId - Product ID
     * @param {number} supplierId - Supplier ID
     * @param {number} price - Price
     * @returns {Promise<Object>} Created supplier price
     */
    async addProduct(productId, supplierId, price) {
        const query = `
            INSERT INTO supplier_prices (product_id, supplier_id, price, created_at, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        
        const result = await this.query(query, [productId, supplierId, price]);
        return result.rows[0];
    }

    /**
     * Remove product from supplier
     * @param {number} supplierPriceId - Supplier price ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async removeProduct(supplierPriceId) {
        const query = 'DELETE FROM supplier_prices WHERE id = $1';
        const result = await this.query(query, [supplierPriceId]);
        return result.rowCount > 0;
    }
}

module.exports = SupplierRepository;