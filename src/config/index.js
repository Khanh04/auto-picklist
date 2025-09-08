/**
 * Centralized configuration management
 */

const path = require('path');

const config = {
    // Environment
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Server configuration
    server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost'
    },

    // Database configuration
    database: {
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.PGPORT || process.env.DB_PORT) || 5432,
        name: process.env.PGDATABASE || process.env.DB_NAME || 'autopicklist',
        user: process.env.PGUSER || process.env.DB_USER || 'postgres',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
        idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000
    },

    // File upload configuration
    upload: {
        directory: process.env.UPLOADS_DIR || 'uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
        allowedTypes: {
            csv: ['text/csv', 'application/csv'],
            pdf: ['application/pdf'],
            excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        }
    },

    // Security configuration
    security: {
        sessionSecret: process.env.SESSION_SECRET || 'auto-picklist-secret-key',
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        corsOrigin: process.env.CORS_ORIGIN || '*'
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined'
    },

    // Feature flags
    features: {
        enableHealthCheck: process.env.ENABLE_HEALTH_CHECK !== 'false',
        enableMetrics: process.env.ENABLE_METRICS === 'true',
        enableCaching: process.env.ENABLE_CACHING === 'true',
        enableCompression: process.env.ENABLE_COMPRESSION !== 'false'
    },

    // Application-specific settings
    app: {
        name: 'Auto Picklist Generator',
        version: require('../../package.json').version,
        description: 'Modern React web application for automated picklist generation'
    },

    // Paths
    paths: {
        root: path.resolve(__dirname, '../..'),
        uploads: path.resolve(__dirname, '../../uploads'),
        public: path.resolve(__dirname, '../../public'),
        scripts: path.resolve(__dirname, '../../scripts')
    }
};

/**
 * Get configuration value by dot notation path
 * @param {string} path - Configuration path (e.g., 'database.host')
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} Configuration value
 */
function get(path, defaultValue = null) {
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return defaultValue;
        }
    }
    
    return current;
}

/**
 * Check if we're in development environment
 * @returns {boolean} True if in development
 */
function isDevelopment() {
    return config.NODE_ENV === 'development';
}

/**
 * Check if we're in production environment
 * @returns {boolean} True if in production
 */
function isProduction() {
    return config.NODE_ENV === 'production';
}

/**
 * Check if we're in test environment
 * @returns {boolean} True if in test
 */
function isTest() {
    return config.NODE_ENV === 'test';
}

/**
 * Validate required configuration values
 * @throws {Error} If required configuration is missing
 */
function validate() {
    const required = [
        'database.host',
        'database.user',
        'database.name'
    ];

    const missing = [];
    
    for (const path of required) {
        const value = get(path);
        if (value === null || value === undefined || value === '') {
            missing.push(path);
        }
    }

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Validate database password in production
    if (isProduction() && !get('database.password')) {
        console.warn('WARNING: No database password set in production environment');
    }

    // Validate session secret in production
    if (isProduction() && get('security.sessionSecret') === 'auto-picklist-secret-key') {
        console.warn('WARNING: Using default session secret in production environment');
    }
}

/**
 * Get database connection string
 * @returns {string} PostgreSQL connection string
 */
function getDatabaseUrl() {
    const db = config.database;
    const auth = db.password ? `${db.user}:${db.password}` : db.user;
    return `postgresql://${auth}@${db.host}:${db.port}/${db.name}`;
}

/**
 * Print configuration summary (safe for logging)
 * @returns {Object} Safe configuration object for logging
 */
function getSafeConfig() {
    return {
        environment: config.NODE_ENV,
        server: config.server,
        database: {
            host: config.database.host,
            port: config.database.port,
            name: config.database.name,
            user: config.database.user,
            passwordSet: !!config.database.password
        },
        features: config.features,
        app: config.app
    };
}

module.exports = {
    ...config,
    get,
    isDevelopment,
    isProduction,
    isTest,
    validate,
    getDatabaseUrl,
    getSafeConfig
};