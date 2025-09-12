const crypto = require('crypto');

/**
 * Request context tracking middleware
 * Adds unique identifiers and context information to requests
 */

/**
 * Generate unique request ID
 * @returns {string} Unique request identifier
 */
function generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `req_${timestamp}_${random}`;
}

/**
 * Extract user information from request
 * @param {Object} req - Express request object
 * @returns {Object} User context information
 */
function extractUserContext(req) {
    return {
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.sessionID || req.session?.id || null,
        userId: req.user?.id || req.session?.userId || null,
        username: req.user?.username || req.session?.username || null
    };
}

/**
 * Extract request metadata
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
function extractRequestMetadata(req) {
    return {
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        query: req.query,
        headers: {
            contentType: req.get('Content-Type'),
            acceptLanguage: req.get('Accept-Language'),
            referer: req.get('Referer'),
            origin: req.get('Origin')
        },
        timestamp: new Date().toISOString(),
        protocol: req.protocol,
        secure: req.secure,
        xhr: req.xhr
    };
}

/**
 * Request context middleware
 * Adds context information to all requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestContext = (req, res, next) => {
    // Generate unique request ID
    const requestId = generateRequestId();
    
    // Create request context
    const context = {
        requestId,
        user: extractUserContext(req),
        request: extractRequestMetadata(req),
        startTime: Date.now(),
        errors: [], // Track errors for this request
        warnings: [] // Track warnings for this request
    };
    
    // Attach context to request object
    req.context = context;
    
    // Add request ID to response headers for debugging
    res.setHeader('X-Request-ID', requestId);
    
    // Track response information
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(body) {
        req.context.endTime = Date.now();
        req.context.responseTime = req.context.endTime - req.context.startTime;
        req.context.statusCode = res.statusCode;
        req.context.responseSize = Buffer.byteLength(body || '', 'utf8');
        
        return originalSend.call(this, body);
    };
    
    res.json = function(body) {
        req.context.endTime = Date.now();
        req.context.responseTime = req.context.endTime - req.context.startTime;
        req.context.statusCode = res.statusCode;
        req.context.responseSize = Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
        
        return originalJson.call(this, body);
    };
    
    // Log request start in development
    if (process.env.NODE_ENV === 'development') {
        console.log(`[${requestId}] ${req.method} ${req.originalUrl} - Start`);
    }
    
    next();
};

/**
 * Add error to request context
 * @param {Object} req - Express request object
 * @param {Error} error - Error object
 * @param {Object} additionalContext - Additional error context
 */
function addErrorToContext(req, error, additionalContext = {}) {
    if (!req.context) {
        return;
    }
    
    const errorEntry = {
        timestamp: new Date().toISOString(),
        message: error.message,
        name: error.name,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
        ...additionalContext
    };
    
    req.context.errors.push(errorEntry);
}

/**
 * Add warning to request context
 * @param {Object} req - Express request object
 * @param {string} message - Warning message
 * @param {Object} additionalContext - Additional warning context
 */
function addWarningToContext(req, message, additionalContext = {}) {
    if (!req.context) {
        return;
    }
    
    const warningEntry = {
        timestamp: new Date().toISOString(),
        message,
        ...additionalContext
    };
    
    req.context.warnings.push(warningEntry);
}

/**
 * Get request context summary for logging
 * @param {Object} req - Express request object
 * @returns {Object} Context summary
 */
function getContextSummary(req) {
    if (!req.context) {
        return {};
    }
    
    const context = req.context;
    
    return {
        requestId: context.requestId,
        method: context.request.method,
        url: context.request.url,
        statusCode: context.statusCode,
        responseTime: context.responseTime,
        userIp: context.user.ip,
        userAgent: context.user.userAgent,
        userId: context.user.userId,
        errorCount: context.errors.length,
        warningCount: context.warnings.length,
        timestamp: context.request.timestamp
    };
}

/**
 * Request completion logging middleware
 * Logs request completion with context information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestLogger = (req, res, next) => {
    // Override res.end to log completion
    const originalEnd = res.end;
    
    res.end = function(...args) {
        const context = req.context;
        
        if (context) {
            context.endTime = Date.now();
            context.responseTime = context.endTime - context.startTime;
            context.statusCode = res.statusCode;
            
            // Log request completion
            const summary = getContextSummary(req);
            const logLevel = res.statusCode >= 500 ? 'ERROR' : 
                            res.statusCode >= 400 ? 'WARN' : 'INFO';
            
            console.log(`[${summary.requestId}] ${logLevel} - ${summary.method} ${summary.url} - ${summary.statusCode} - ${summary.responseTime}ms`);
            
            // Log errors if any
            if (context.errors.length > 0) {
                console.error(`[${summary.requestId}] Errors:`, context.errors);
            }
            
            // Log warnings if any
            if (context.warnings.length > 0) {
                console.warn(`[${summary.requestId}] Warnings:`, context.warnings);
            }
        }
        
        return originalEnd.apply(this, args);
    };
    
    next();
};

module.exports = {
    requestContext,
    requestLogger,
    addErrorToContext,
    addWarningToContext,
    getContextSummary,
    generateRequestId
};