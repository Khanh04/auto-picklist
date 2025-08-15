const { pool } = require('../database/config');

/**
 * Normalize item names for better matching
 * @param {string} itemName - Original item name
 * @returns {string} Normalized item name
 */
function normalizeItemName(itemName) {
    return itemName
        .replace(/\[.*?\]/g, '')  // Remove bracketed text
        .replace(/\*.*?\*/g, '')  // Remove text between asterisks
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim()
        .toLowerCase();
}

/**
 * Find the best supplier with lowest price for a given item using PostgreSQL
 * @param {string} itemName - Name of the item to find
 * @returns {Promise<Object>} Object with supplier and price, or null values if not found
 */
async function findBestSupplier(itemName) {
    if (!itemName || itemName.length < 3) {
        return { supplier: null, price: null };
    }

    const client = await pool.connect();
    
    try {
        const normalizedItem = normalizeItemName(itemName);
        const searchWords = normalizedItem.split(' ').filter(word => word.length > 2);
        
        if (searchWords.length === 0) {
            return { supplier: null, price: null };
        }

        // Strategy 1: Exact substring match (highest priority)
        let query = `
            SELECT 
                psp.supplier_name,
                psp.price,
                psp.description,
                10 as match_score
            FROM product_supplier_prices psp
            WHERE LOWER(psp.description) LIKE $1
            ORDER BY psp.price ASC
            LIMIT 1
        `;
        
        let result = await client.query(query, [`%${normalizedItem.substring(0, 15)}%`]);
        
        if (result.rows.length > 0) {
            const match = result.rows[0];
            console.log(`Match found for "${itemName}": ${match.supplier_name} at $${match.price}`);
            return { supplier: match.supplier_name, price: parseFloat(match.price) };
        }

        // Strategy 2: Brand/product name match
        const orderBrand = normalizedItem.split(' ')[0];
        if (orderBrand.length > 2) {
            query = `
                SELECT 
                    psp.supplier_name,
                    psp.price,
                    psp.description,
                    5 as match_score
                FROM product_supplier_prices psp
                WHERE LOWER(psp.description) LIKE $1
                ORDER BY psp.price ASC
                LIMIT 1
            `;
            
            result = await client.query(query, [`%${orderBrand}%`]);
            
            if (result.rows.length > 0) {
                const match = result.rows[0];
                console.log(`Brand match found for "${itemName}": ${match.supplier_name} at $${match.price}`);
                return { supplier: match.supplier_name, price: parseFloat(match.price) };
            }
        }

        // Strategy 3: Multiple word match using full-text search
        if (searchWords.length >= 2) {
            const tsQuery = searchWords.join(' & ');
            query = `
                SELECT 
                    psp.supplier_name,
                    psp.price,
                    psp.description,
                    ts_rank(to_tsvector('english', psp.description), to_tsquery('english', $1)) as match_score
                FROM product_supplier_prices psp
                WHERE to_tsvector('english', psp.description) @@ to_tsquery('english', $1)
                ORDER BY match_score DESC, psp.price ASC
                LIMIT 1
            `;
            
            try {
                result = await client.query(query, [tsQuery]);
                
                if (result.rows.length > 0) {
                    const match = result.rows[0];
                    console.log(`Full-text match found for "${itemName}": ${match.supplier_name} at $${match.price}`);
                    return { supplier: match.supplier_name, price: parseFloat(match.price) };
                }
            } catch (error) {
                // Full-text search might fail with complex queries, continue to next strategy
                console.log('Full-text search failed, trying alternative approach...');
            }
        }

        // Strategy 4: Single important word match (lower score)
        const importantWords = searchWords.filter(word => 
            word.length > 4 && !['nail', 'polish', 'color', 'glue'].includes(word)
        );
        
        if (importantWords.length > 0) {
            const wordConditions = importantWords.map((_, index) => `LOWER(psp.description) LIKE $${index + 1}`).join(' OR ');
            const wordParams = importantWords.map(word => `%${word}%`);
            
            query = `
                SELECT 
                    psp.supplier_name,
                    psp.price,
                    psp.description,
                    1 as match_score
                FROM product_supplier_prices psp
                WHERE ${wordConditions}
                ORDER BY psp.price ASC
                LIMIT 1
            `;
            
            result = await client.query(query, wordParams);
            
            if (result.rows.length > 0) {
                const match = result.rows[0];
                console.log(`Word match found for "${itemName}": ${match.supplier_name} at $${match.price}`);
                return { supplier: match.supplier_name, price: parseFloat(match.price) };
            }
        }

        // No match found
        return { supplier: null, price: null };

    } catch (error) {
        console.error('Database query error:', error);
        return { supplier: null, price: null };
    } finally {
        client.release();
    }
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
async function getDatabaseStats() {
    const client = await pool.connect();
    
    try {
        const supplierCountResult = await client.query('SELECT COUNT(*) FROM suppliers');
        const productCountResult = await client.query('SELECT COUNT(*) FROM products');
        const priceCountResult = await client.query('SELECT COUNT(*) FROM supplier_prices');
        
        return {
            suppliers: parseInt(supplierCountResult.rows[0].count),
            products: parseInt(productCountResult.rows[0].count),
            prices: parseInt(priceCountResult.rows[0].count)
        };
    } catch (error) {
        console.error('Error getting database stats:', error);
        return { suppliers: 0, products: 0, prices: 0 };
    } finally {
        client.release();
    }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
}

module.exports = {
    findBestSupplier,
    getDatabaseStats,
    testConnection,
    normalizeItemName
};