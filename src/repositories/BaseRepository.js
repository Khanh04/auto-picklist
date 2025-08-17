const { pool } = require('../database/config');

/**
 * Base repository class with common database operations
 */
class BaseRepository {
    constructor() {
        this.pool = pool;
    }

    /**
     * Execute a query with error handling
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Query result
     */
    async query(query, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(query, params);
            return result;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Execute a transaction
     * @param {Function} callback - Transaction callback
     * @returns {Promise<any>} Transaction result
     */
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Transaction error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check if table exists
     * @param {string} tableName - Table name
     * @returns {Promise<boolean>} True if table exists
     */
    async tableExists(tableName) {
        const result = await this.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
            )
        `, [tableName]);
        return result.rows[0].exists;
    }
}

module.exports = BaseRepository;