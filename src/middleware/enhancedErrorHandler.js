const { ERROR_TYPES, getErrorTypeByName } = require('../utils/errorTypes');
const { buildErrorResponse, sendErrorResponse } = require('../utils/errorResponse');
const { addErrorToContext } = require('./requestContext');

/**
 * Enhanced error handling middleware
 * Provides centralized error processing with classification and context tracking
 */

/**
 * Enhanced AppError class with error type integration
 */
class AppError extends Error {
    constructor(errorTypeOrMessage, statusCode = 500, details = {}, context = {}) {
        // Handle different constructor patterns
        if (typeof errorTypeOrMessage === 'object' && errorTypeOrMessage.code) {
            // Error type object provided
            const errorType = errorTypeOrMessage;
            super(errorType.message);
            this.code = errorType.code;
            this.name = errorType.name;
            this.statusCode = errorType.status;
            this.category = errorType.category;
            this.retryable = errorType.retryable;
            this.recoverable = errorType.recoverable;
        } else if (typeof errorTypeOrMessage === 'string') {
            // Check if it's an error type code
            const errorType = Object.values(ERROR_TYPES).find(type => type.code === errorTypeOrMessage);
            if (errorType) {
                super(errorType.message);
                this.code = errorType.code;
                this.name = errorType.name;
                this.statusCode = errorType.status;
                this.category = errorType.category;
                this.retryable = errorType.retryable;
                this.recoverable = errorType.recoverable;
            } else {
                // Regular error message
                super(errorTypeOrMessage);
                this.statusCode = statusCode;
                this.name = 'AppError';
            }
        }
        
        this.details = details;
        this.context = context;
        this.isOperational = true;
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }
    
    /**
     * Add additional context to the error
     * @param {Object} additionalContext - Additional context information
     */
    addContext(additionalContext) {
        this.context = { ...this.context, ...additionalContext };
        return this;
    }
    
    /**
     * Add details to the error
     * @param {Object} additionalDetails - Additional error details
     */
    addDetails(additionalDetails) {
        this.details = { ...this.details, ...additionalDetails };
        return this;
    }
    
    /**
     * Convert error to JSON for logging
     * @returns {Object} JSON representation of error
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            category: this.category,
            retryable: this.retryable,
            recoverable: this.recoverable,
            details: this.details,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Create error from error type
 * @param {Object} errorType - Error type from ERROR_TYPES
 * @param {string} customMessage - Custom error message (optional)
 * @param {Object} details - Additional error details (optional)
 * @param {Object} context - Error context (optional)
 * @returns {AppError} Enhanced app error
 */
function createError(errorType, customMessage = null, details = {}, context = {}) {
    const error = new AppError(errorType, null, details, context);
    if (customMessage) {
        error.message = customMessage;
    }
    return error;
}

/**
 * Create validation error with field details
 * @param {Array|string} fields - Validation error fields
 * @param {string} customMessage - Custom error message (optional)
 * @returns {AppError} Validation error
 */
function createValidationError(fields, customMessage = null) {
    const fieldArray = Array.isArray(fields) ? fields : [fields];
    return createError(
        ERROR_TYPES.VALIDATION_ERROR,
        customMessage || `Validation failed for: ${fieldArray.join(', ')}`,
        { fields: fieldArray }
    );
}

/**
 * Create not found error
 * @param {string} resource - Resource type
 * @param {string} identifier - Resource identifier
 * @returns {AppError} Not found error
 */
function createNotFoundError(resource, identifier) {
    return createError(
        ERROR_TYPES.NOT_FOUND,
        `${resource} not found`,
        { resource, identifier }
    );
}

/**
 * Create database error with proper classification
 * @param {Error} originalError - Original database error
 * @param {string} operation - Database operation that failed
 * @returns {AppError} Classified database error
 */
function createDatabaseError(originalError, operation) {
    const isConnectionError = originalError.code === 'ECONNREFUSED' || 
                             originalError.code === 'ENOTFOUND' ||
                             originalError.message?.includes('connection');
    
    const errorType = isConnectionError ? 
        ERROR_TYPES.DATABASE_CONNECTION : 
        ERROR_TYPES.DATABASE_ERROR;
    
    return createError(
        errorType,
        null,
        {
            originalError: originalError.message,
            operation,
            dbCode: originalError.code
        }
    );
}

/**
 * Classify unknown errors based on their properties
 * @param {Error} error - Unknown error object
 * @returns {Object} Error classification
 */
function classifyUnknownError(error) {
    // Database errors
    if (error.code && ['ECONNREFUSED', 'ENOTFOUND', '23505', '23503', '42P01'].includes(error.code)) {
        return ERROR_TYPES.DATABASE_ERROR;
    }
    
    // File system errors
    if (error.code && ['ENOENT', 'EACCES', 'EISDIR', 'EMFILE'].includes(error.code)) {
        return ERROR_TYPES.FILE_SYSTEM_ERROR;
    }
    
    // Validation errors
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
        return ERROR_TYPES.VALIDATION_ERROR;
    }
    
    // Security errors
    if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
        return ERROR_TYPES.AUTHORIZATION_ERROR;
    }
    
    // Rate limiting
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
        return ERROR_TYPES.RATE_LIMITED;
    }
    
    // Default to system error
    return {
        code: 'SYSTEM_999',
        name: 'UnclassifiedError',
        category: 'system',
        status: 500,
        message: 'An unclassified error occurred',
        recoverable: false,
        retryable: false
    };
}

/**
 * Enhanced global error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enhancedGlobalErrorHandler = (error, req, res, next) => {
    // Add error to request context for tracking
    if (req.context) {
        addErrorToContext(req, error, {
            endpoint: req.originalUrl,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
    }
    
    let processedError;
    
    // Handle different error types
    if (error instanceof AppError) {
        // Already enhanced error
        processedError = error;
    } else if (error.name && getErrorTypeByName(error.name)) {
        // Known error type
        const errorType = getErrorTypeByName(error.name);
        processedError = createError(errorType, error.message, {
            originalError: error.message,
            originalStack: error.stack
        });
    } else {
        // Unknown error - classify and enhance
        const classification = classifyUnknownError(error);
        processedError = createError(classification, error.message, {
            originalError: error.message,
            originalName: error.name,
            originalCode: error.code
        });
    }
    
    // Enhance error with request context
    if (req.context) {
        processedError.addContext({
            requestId: req.context.requestId,
            endpoint: req.originalUrl,
            method: req.method,
            userInfo: {
                ip: req.context.user?.ip,
                userAgent: req.context.user?.userAgent,
                userId: req.context.user?.userId
            }
        });
    }
    
    // Log error with appropriate level
    const logLevel = processedError.statusCode >= 500 ? 'error' : 'warn';
    const logData = {
        requestId: req.context?.requestId || 'unknown',
        error: processedError.toJSON(),
        endpoint: req.originalUrl,
        method: req.method,
        userIp: req.ip
    };
    
    if (logLevel === 'error') {
        console.error('Application Error:', logData);
    } else {
        console.warn('Application Warning:', logData);
    }
    
    // Send standardized error response
    const { response, statusCode } = buildErrorResponse({
        error: processedError,
        context: req.context || {}
    });
    
    // Set security headers for error responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    res.status(statusCode).json(response);
};

/**
 * Enhanced async handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const enhancedAsyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            // Ensure error context is preserved
            if (req.context && !error.context) {
                error.context = req.context;
            }
            next(error);
        });
    };
};

/**
 * Handle 404 not found errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enhancedNotFoundHandler = (req, res, next) => {
    const error = createNotFoundError('Route', req.originalUrl);
    next(error);
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise?.toString()
    });
    
    // Don't exit immediately in production
    if (process.env.NODE_ENV === 'production') {
        console.error('Unhandled rejection detected in production. Continuing...');
    } else {
        process.exit(1);
    }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', {
        name: error.name,
        message: error.message,
        stack: error.stack
    });
    
    // Graceful shutdown
    process.exit(1);
});

module.exports = {
    AppError,
    createError,
    createValidationError,
    createNotFoundError,
    createDatabaseError,
    classifyUnknownError,
    enhancedGlobalErrorHandler,
    enhancedAsyncHandler,
    enhancedNotFoundHandler
};