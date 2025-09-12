const { 
    ERROR_TYPES, 
    RECOVERY_SUGGESTIONS, 
    DOCUMENTATION_LINKS,
    getErrorTypeByCode,
    getErrorTypeByName 
} = require('./errorTypes');

/**
 * Centralized error response builder
 * Provides consistent error response format across the application
 */

/**
 * Build standardized error response
 * @param {Object} options - Error response options
 * @param {Error|string} options.error - Error object or error type code
 * @param {string} options.message - Custom error message (optional)
 * @param {Object} options.details - Additional error details (optional)
 * @param {Object} options.context - Request context (optional)
 * @param {boolean} options.includeStack - Include stack trace (optional, defaults to development mode)
 * @returns {Object} Standardized error response
 */
function buildErrorResponse(options = {}) {
    const {
        error,
        message: customMessage,
        details = {},
        context = {},
        includeStack = process.env.NODE_ENV === 'development'
    } = options;
    
    let errorType, errorCode, errorMessage, statusCode;
    
    // Determine error type and details
    if (typeof error === 'string') {
        // Error type code provided
        errorType = getErrorTypeByCode(error);
        if (!errorType) {
            // Fallback for unknown error codes
            errorType = ERROR_TYPES.SYSTEM_ERROR || {
                code: 'UNKNOWN_001',
                name: 'UnknownError',
                status: 500,
                message: 'An unknown error occurred'
            };
        }
        errorCode = errorType.code;
        errorMessage = customMessage || errorType.message;
        statusCode = errorType.status;
    } else if (error && error.name) {
        // Error object provided
        errorType = getErrorTypeByName(error.name);
        if (errorType) {
            errorCode = errorType.code;
            errorMessage = customMessage || error.message || errorType.message;
            statusCode = error.statusCode || errorType.status;
        } else {
            // Unknown error type, classify by properties
            errorCode = error.code || 'UNKNOWN_001';
            errorMessage = customMessage || error.message || 'An error occurred';
            statusCode = error.statusCode || 500;
            errorType = {
                code: errorCode,
                name: error.name || 'UnknownError',
                status: statusCode
            };
        }
    } else {
        // Fallback for invalid input
        errorType = ERROR_TYPES.SYSTEM_ERROR || {
            code: 'UNKNOWN_001',
            name: 'UnknownError',
            status: 500,
            message: 'An unknown error occurred'
        };
        errorCode = errorType.code;
        errorMessage = customMessage || 'An error occurred';
        statusCode = 500;
    }
    
    // Build base error response
    const errorResponse = {
        success: false,
        error: {
            code: errorCode,
            message: errorMessage,
            type: errorType.name,
            timestamp: new Date().toISOString(),
            ...(context.requestId && { requestId: context.requestId }),
            ...(context.request?.url && { path: context.request.url })
        }
    };
    
    // Add details if provided
    if (Object.keys(details).length > 0) {
        errorResponse.error.details = details;
    }
    
    // Add stack trace in development
    if (includeStack && error && error.stack) {
        errorResponse.error.stack = error.stack;
    }
    
    // Add recovery suggestions and documentation
    const suggestion = RECOVERY_SUGGESTIONS[errorCode];
    const documentation = DOCUMENTATION_LINKS[errorCode];
    
    if (suggestion || documentation) {
        errorResponse.meta = {};
        if (suggestion) errorResponse.meta.suggestion = suggestion;
        if (documentation) errorResponse.meta.documentation = documentation;
    }
    
    // Add debug information in development
    if (process.env.NODE_ENV === 'development' && context) {
        errorResponse.debug = {
            userAgent: context.user?.userAgent,
            ip: context.user?.ip,
            method: context.request?.method,
            responseTime: context.responseTime
        };
    }
    
    return {
        response: errorResponse,
        statusCode
    };
}

/**
 * Build success response
 * @param {Object} data - Response data
 * @param {Object} meta - Optional metadata
 * @param {Object} context - Request context (optional)
 * @returns {Object} Standardized success response
 */
function buildSuccessResponse(data, meta = {}, context = {}) {
    const response = {
        success: true,
        data,
        timestamp: new Date().toISOString()
    };
    
    // Add request ID if available
    if (context.requestId) {
        response.requestId = context.requestId;
    }
    
    // Add metadata if provided
    if (Object.keys(meta).length > 0) {
        response.meta = meta;
    }
    
    return response;
}

/**
 * Build validation error response
 * @param {Array|Object} validationErrors - Validation error details
 * @param {Object} context - Request context (optional)
 * @returns {Object} Validation error response
 */
function buildValidationErrorResponse(validationErrors, context = {}) {
    const errors = Array.isArray(validationErrors) ? validationErrors : [validationErrors];
    
    return buildErrorResponse({
        error: ERROR_TYPES.VALIDATION_ERROR.code,
        details: {
            validationErrors: errors,
            fieldCount: errors.length
        },
        context
    });
}

/**
 * Build not found error response
 * @param {string} resource - Resource type that was not found
 * @param {string} identifier - Resource identifier
 * @param {Object} context - Request context (optional)
 * @returns {Object} Not found error response
 */
function buildNotFoundResponse(resource, identifier, context = {}) {
    return buildErrorResponse({
        error: ERROR_TYPES.NOT_FOUND.code,
        message: `${resource} not found`,
        details: {
            resource,
            identifier
        },
        context
    });
}

/**
 * Build rate limit error response
 * @param {number} retryAfter - Seconds to wait before retry
 * @param {Object} context - Request context (optional)
 * @returns {Object} Rate limit error response
 */
function buildRateLimitResponse(retryAfter, context = {}) {
    return buildErrorResponse({
        error: ERROR_TYPES.RATE_LIMITED.code,
        details: {
            retryAfter,
            retryAfterMs: retryAfter * 1000
        },
        context
    });
}

/**
 * Build database error response
 * @param {Error} dbError - Database error object
 * @param {Object} context - Request context (optional)
 * @returns {Object} Database error response
 */
function buildDatabaseErrorResponse(dbError, context = {}) {
    const isConnectionError = dbError.code === 'ECONNREFUSED' || 
                             dbError.code === 'ENOTFOUND' ||
                             dbError.message?.includes('connection');
    
    const errorType = isConnectionError ? 
        ERROR_TYPES.DATABASE_CONNECTION.code : 
        ERROR_TYPES.DATABASE_ERROR.code;
    
    return buildErrorResponse({
        error: errorType,
        details: {
            dbCode: dbError.code,
            dbMessage: dbError.message
        },
        context,
        includeStack: false // Don't expose database stack traces
    });
}

/**
 * Build file processing error response
 * @param {string} operation - File operation that failed
 * @param {string} filename - File name
 * @param {Error} fileError - File error object
 * @param {Object} context - Request context (optional)
 * @returns {Object} File processing error response
 */
function buildFileErrorResponse(operation, filename, fileError, context = {}) {
    return buildErrorResponse({
        error: ERROR_TYPES.FILE_PROCESSING_ERROR.code,
        message: `File ${operation} failed`,
        details: {
            operation,
            filename,
            reason: fileError.message
        },
        context
    });
}

/**
 * Express middleware to send error response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string|Error} error - Error to send
 * @param {Object} options - Additional options
 */
function sendErrorResponse(req, res, error, options = {}) {
    const { response, statusCode } = buildErrorResponse({
        error,
        ...options,
        context: req.context || {}
    });
    
    res.status(statusCode).json(response);
}

/**
 * Express middleware to send success response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} data - Success data
 * @param {Object} meta - Optional metadata
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccessResponse(req, res, data, meta = {}, statusCode = 200) {
    const response = buildSuccessResponse(data, meta, req.context || {});
    res.status(statusCode).json(response);
}

module.exports = {
    buildErrorResponse,
    buildSuccessResponse,
    buildValidationErrorResponse,
    buildNotFoundResponse,
    buildRateLimitResponse,
    buildDatabaseErrorResponse,
    buildFileErrorResponse,
    sendErrorResponse,
    sendSuccessResponse
};