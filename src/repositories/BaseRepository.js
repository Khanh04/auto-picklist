const { pool } = require('../database/config');

/**
 * Base repository class with common database operations
 * Supports user context for mandatory authentication
 */
class BaseRepository {
    constructor(userId = null) {
        this.pool = pool;
        this.userId = userId;
    }

    /**
     * Set user context for this repository instance
     * @param {number} userId - User ID to filter by
     */
    setUserContext(userId) {
        this.userId = userId;
    }

    /**
     * Get current user context
     * @returns {number|null} Current user ID
     */
    getUserContext() {
        return this.userId;
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

    /**
     * Execute a user-filtered query
     * Automatically adds user_id WHERE clause if user context is set
     * @param {string} tableName - Table name to filter
     * @param {string} baseQuery - Base SQL query without WHERE clause
     * @param {Array} params - Query parameters
     * @param {string} additionalWhere - Additional WHERE conditions
     * @returns {Promise<Object>} Query result
     */
    async queryWithUserFilter(tableName, baseQuery, params = [], additionalWhere = '') {
        if (!this.userId) {
            throw new Error('User context required for user-filtered queries. Call setUserContext(userId) first.');
        }

        let query = baseQuery;
        let queryParams = [...params];

        // Check if table has user_id column
        const hasUserColumn = await this.hasUserColumn(tableName);

        if (hasUserColumn) {
            // Add user filtering
            const whereClause = baseQuery.toLowerCase().includes('where') ? 'AND' : 'WHERE';
            query += ` ${whereClause} ${tableName}.user_id = $${queryParams.length + 1}`;
            queryParams.push(this.userId);

            // Add additional WHERE conditions if provided
            if (additionalWhere) {
                query += ` AND ${additionalWhere}`;
            }
        } else if (additionalWhere) {
            // Just add additional WHERE conditions
            const whereClause = baseQuery.toLowerCase().includes('where') ? 'AND' : 'WHERE';
            query += ` ${whereClause} ${additionalWhere}`;
        }

        return await this.query(query, queryParams);
    }

    /**
     * Check if table has user_id column
     * @param {string} tableName - Table name
     * @returns {Promise<boolean>} True if table has user_id column
     */
    async hasUserColumn(tableName) {
        const result = await this.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = $1
                AND column_name = 'user_id'
            )
        `, [tableName]);
        return result.rows[0].exists;
    }

    /**
     * Insert record with automatic user_id assignment
     * @param {string} tableName - Table name
     * @param {Object} data - Data to insert
     * @returns {Promise<Object>} Insert result
     */
    async insertWithUser(tableName, data) {
        if (!this.userId) {
            throw new Error('User context required for user-scoped inserts. Call setUserContext(userId) first.');
        }

        // Check if table has user_id column
        const hasUserColumn = await this.hasUserColumn(tableName);

        if (hasUserColumn) {
            data.user_id = this.userId;
        }

        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

        const query = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
            RETURNING *
        `;

        const result = await this.query(query, values);
        return result.rows[0];
    }

    /**
     * Update records with user filtering
     * @param {string} tableName - Table name
     * @param {Object} data - Data to update
     * @param {string} whereClause - WHERE conditions (without WHERE keyword)
     * @param {Array} whereParams - Parameters for WHERE clause
     * @returns {Promise<Object>} Update result
     */
    async updateWithUser(tableName, data, whereClause, whereParams = []) {
        if (!this.userId) {
            throw new Error('User context required for user-scoped updates. Call setUserContext(userId) first.');
        }

        const columns = Object.keys(data);
        const values = Object.values(data);
        const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

        let query = `UPDATE ${tableName} SET ${setClause}`;
        let queryParams = [...values];

        // Add WHERE clause
        if (whereClause) {
            query += ` WHERE ${whereClause}`;
            queryParams.push(...whereParams);
        }

        // Check if table has user_id column and add user filtering
        const hasUserColumn = await this.hasUserColumn(tableName);
        if (hasUserColumn) {
            const connector = whereClause ? 'AND' : 'WHERE';
            query += ` ${connector} user_id = $${queryParams.length + 1}`;
            queryParams.push(this.userId);
        }

        query += ' RETURNING *';

        const result = await this.query(query, queryParams);
        return result;
    }

    /**
     * Delete records with user filtering
     * @param {string} tableName - Table name
     * @param {string} whereClause - WHERE conditions (without WHERE keyword)
     * @param {Array} whereParams - Parameters for WHERE clause
     * @returns {Promise<Object>} Delete result
     */
    async deleteWithUser(tableName, whereClause, whereParams = []) {
        if (!this.userId) {
            throw new Error('User context required for user-scoped deletes. Call setUserContext(userId) first.');
        }

        let query = `DELETE FROM ${tableName}`;
        let queryParams = [...whereParams];

        // Add WHERE clause
        if (whereClause) {
            query += ` WHERE ${whereClause}`;
        }

        // Check if table has user_id column and add user filtering
        const hasUserColumn = await this.hasUserColumn(tableName);
        if (hasUserColumn) {
            const connector = whereClause ? 'AND' : 'WHERE';
            query += ` ${connector} user_id = $${queryParams.length + 1}`;
            queryParams.push(this.userId);
        }

        const result = await this.query(query, queryParams);
        return result;
    }
}

module.exports = BaseRepository;