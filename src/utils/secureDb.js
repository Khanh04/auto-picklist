const { pool } = require('../database/config');
const { sanitizeInput, SQL_INJECTION_PATTERNS } = require('../middleware/secureValidation');

/**
 * Secure database utility with built-in protection against SQL injection
 */

/**
 * Validate SQL query for potential injection attempts
 * @param {string} query - SQL query to validate
 * @param {Array} params - Query parameters
 * @throws {Error} If query appears to contain injection attempts
 */
function validateQuery(query, params = []) {
    // Check if query uses parameterized syntax
    const parameterizedPattern = /\$\d+/g;
    const parameterMatches = query.match(parameterizedPattern) || [];
    
    // Ensure all dynamic content uses parameters
    if (parameterMatches.length !== params.length) {
        console.warn('Query parameter count mismatch. Expected:', parameterMatches.length, 'Got:', params.length);
    }

    // Check for obvious SQL injection patterns in the base query
    // (Parameters will be sanitized separately)
    const suspiciousPatterns = [
        /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|EXEC|EXECUTE|SCRIPT)/i,
        /'[^']*'[^']*'/, // Multiple quotes that might indicate string concatenation
        /--.*SELECT|--.*INSERT|--.*UPDATE|--.*DELETE/i, // Comments with SQL
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(query)) {
            throw new Error('Potentially unsafe query detected');
        }
    }
}

/**
 * Sanitize and validate query parameters
 * @param {Array} params - Query parameters to sanitize
 * @returns {Array} Sanitized parameters
 */
function sanitizeQueryParams(params) {
    return params.map(param => {
        if (typeof param === 'string') {
            // Basic sanitization - remove obvious SQL injection attempts
            return sanitizeInput(param, {
                allowHTML: false,
                preventSQLInjection: true,
                maxLength: 10000
            });
        }
        return param;
    });
}

/**
 * Execute a parameterized query with security validation
 * @param {string} query - SQL query with parameterized placeholders ($1, $2, etc.)
 * @param {Array} params - Parameters for the query
 * @param {Object} client - Optional database client (uses pool by default)
 * @returns {Promise<Object>} Query result
 */
async function secureQuery(query, params = [], client = null) {
    // Validate the query structure
    validateQuery(query, params);
    
    // Sanitize parameters
    const sanitizedParams = sanitizeQueryParams(params);
    
    // Use provided client or get one from pool
    const dbClient = client || await pool.connect();
    
    try {
        // Log query in development (without sensitive data)
        if (process.env.NODE_ENV === 'development') {
            console.log('Executing query:', query.substring(0, 100) + '...');
            console.log('Parameter count:', sanitizedParams.length);
        }
        
        const result = await dbClient.query(query, sanitizedParams);
        return result;
    } catch (error) {
        console.error('Database query error:', error.message);
        console.error('Query:', query.substring(0, 200));
        throw error;
    } finally {
        // Only release if we created the client
        if (!client) {
            dbClient.release();
        }
    }
}

/**
 * Execute multiple queries in a transaction with security validation
 * @param {Array} queries - Array of {query, params} objects
 * @param {Function} callback - Optional callback function to execute between queries
 * @returns {Promise<Array>} Array of query results
 */
async function secureTransaction(queries, callback = null) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const results = [];
        
        for (let i = 0; i < queries.length; i++) {
            const { query, params } = queries[i];
            const result = await secureQuery(query, params, client);
            results.push(result);
            
            // Execute callback between queries if provided
            if (callback && typeof callback === 'function') {
                await callback(result, i, client);
            }
        }
        
        await client.query('COMMIT');
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Build a safe WHERE clause from conditions
 * @param {Object} conditions - Object with field: value pairs
 * @param {number} startParam - Starting parameter number (default: 1)
 * @returns {Object} {whereClause, params, nextParam}
 */
function buildSafeWhereClause(conditions, startParam = 1) {
    const whereConditions = [];
    const params = [];
    let paramCounter = startParam;
    
    for (const [field, value] of Object.entries(conditions)) {
        // Validate field name (only allow alphanumeric and underscore)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
            throw new Error(`Invalid field name: ${field}`);
        }
        
        if (value === null || value === undefined) {
            whereConditions.push(`${field} IS NULL`);
        } else if (Array.isArray(value)) {
            // Handle IN clause
            const placeholders = value.map(() => `$${paramCounter++}`).join(', ');
            whereConditions.push(`${field} IN (${placeholders})`);
            params.push(...value);
        } else {
            whereConditions.push(`${field} = $${paramCounter++}`);
            params.push(value);
        }
    }
    
    const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';
    
    return {
        whereClause,
        params,
        nextParam: paramCounter
    };
}

/**
 * Build a safe ORDER BY clause
 * @param {Array|string} orderBy - Field names or array of {field, direction} objects
 * @returns {string} ORDER BY clause
 */
function buildSafeOrderBy(orderBy) {
    if (!orderBy) return '';
    
    if (typeof orderBy === 'string') {
        // Validate single field
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(orderBy)) {
            throw new Error(`Invalid order by field: ${orderBy}`);
        }
        return `ORDER BY ${orderBy}`;
    }
    
    if (Array.isArray(orderBy)) {
        const orderClauses = orderBy.map(item => {
            if (typeof item === 'string') {
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item)) {
                    throw new Error(`Invalid order by field: ${item}`);
                }
                return item;
            }
            
            if (typeof item === 'object' && item.field) {
                if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item.field)) {
                    throw new Error(`Invalid order by field: ${item.field}`);
                }
                const direction = item.direction && item.direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
                return `${item.field} ${direction}`;
            }
            
            throw new Error('Invalid order by specification');
        });
        
        return `ORDER BY ${orderClauses.join(', ')}`;
    }
    
    throw new Error('Invalid order by format');
}

/**
 * Build a safe LIMIT clause
 * @param {number} limit - Maximum number of rows
 * @param {number} offset - Number of rows to skip
 * @returns {string} LIMIT clause
 */
function buildSafeLimit(limit, offset = 0) {
    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);
    
    if (isNaN(parsedLimit) || parsedLimit < 0 || parsedLimit > 10000) {
        throw new Error('Invalid limit value');
    }
    
    if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new Error('Invalid offset value');
    }
    
    return `LIMIT ${parsedLimit}${parsedOffset > 0 ? ` OFFSET ${parsedOffset}` : ''}`;
}

/**
 * Safe SELECT query builder
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Query result
 */
async function safeSelect(options) {
    const {
        table,
        fields = ['*'],
        conditions = {},
        orderBy = null,
        limit = null,
        offset = 0,
        client = null
    } = options;
    
    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
        throw new Error(`Invalid table name: ${table}`);
    }
    
    // Validate field names
    const fieldList = Array.isArray(fields) ? fields : [fields];
    const validatedFields = fieldList.map(field => {
        if (field === '*') return '*';
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(field)) {
            throw new Error(`Invalid field name: ${field}`);
        }
        return field;
    });
    
    // Build query components
    const fieldsClause = validatedFields.join(', ');
    const { whereClause, params } = buildSafeWhereClause(conditions);
    const orderByClause = buildSafeOrderBy(orderBy);
    const limitClause = limit ? buildSafeLimit(limit, offset) : '';
    
    const query = `SELECT ${fieldsClause} FROM ${table} ${whereClause} ${orderByClause} ${limitClause}`.trim();
    
    return await secureQuery(query, params, client);
}

module.exports = {
    secureQuery,
    secureTransaction,
    buildSafeWhereClause,
    buildSafeOrderBy,
    buildSafeLimit,
    safeSelect,
    validateQuery,
    sanitizeQueryParams
};