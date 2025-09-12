/**
 * Centralized error type definitions and classifications
 * Provides consistent error handling across the application
 */

/**
 * Error categories for classification
 */
const ERROR_CATEGORIES = {
    BUSINESS: 'business',
    SYSTEM: 'system',
    SECURITY: 'security',
    EXTERNAL: 'external'
};

/**
 * HTTP status code mappings
 */
const HTTP_STATUS = {
    // Success
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    
    // Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    
    // Server Errors
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
};

/**
 * Comprehensive error type definitions
 */
const ERROR_TYPES = {
    // Business Logic Errors (4xx)
    VALIDATION_ERROR: {
        code: 'VALIDATION_001',
        name: 'ValidationError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'Input validation failed',
        recoverable: true,
        retryable: false
    },
    
    REQUIRED_FIELD: {
        code: 'VALIDATION_002',
        name: 'RequiredFieldError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'Required field is missing',
        recoverable: true,
        retryable: false
    },
    
    INVALID_FORMAT: {
        code: 'VALIDATION_003',
        name: 'InvalidFormatError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'Invalid data format provided',
        recoverable: true,
        retryable: false
    },
    
    NOT_FOUND: {
        code: 'RESOURCE_001',
        name: 'NotFoundError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.NOT_FOUND,
        message: 'Requested resource not found',
        recoverable: true,
        retryable: false
    },
    
    DUPLICATE_RESOURCE: {
        code: 'RESOURCE_002',
        name: 'DuplicateResourceError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.CONFLICT,
        message: 'Resource already exists',
        recoverable: true,
        retryable: false
    },
    
    RESOURCE_CONFLICT: {
        code: 'RESOURCE_003',
        name: 'ResourceConflictError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.CONFLICT,
        message: 'Resource state conflict',
        recoverable: true,
        retryable: false
    },
    
    RATE_LIMITED: {
        code: 'RATE_001',
        name: 'RateLimitError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded',
        recoverable: true,
        retryable: true
    },
    
    // System Errors (5xx)
    DATABASE_ERROR: {
        code: 'SYSTEM_001',
        name: 'DatabaseError',
        category: ERROR_CATEGORIES.SYSTEM,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
        recoverable: false,
        retryable: true
    },
    
    DATABASE_CONNECTION: {
        code: 'SYSTEM_002',
        name: 'DatabaseConnectionError',
        category: ERROR_CATEGORIES.SYSTEM,
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Database connection unavailable',
        recoverable: false,
        retryable: true
    },
    
    FILE_SYSTEM_ERROR: {
        code: 'SYSTEM_003',
        name: 'FileSystemError',
        category: ERROR_CATEGORIES.SYSTEM,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'File system operation failed',
        recoverable: false,
        retryable: true
    },
    
    CONFIGURATION_ERROR: {
        code: 'SYSTEM_004',
        name: 'ConfigurationError',
        category: ERROR_CATEGORIES.SYSTEM,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: 'System configuration error',
        recoverable: false,
        retryable: false
    },
    
    SERVICE_UNAVAILABLE: {
        code: 'SYSTEM_005',
        name: 'ServiceUnavailableError',
        category: ERROR_CATEGORIES.SYSTEM,
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable',
        recoverable: false,
        retryable: true
    },
    
    // Security Errors (4xx/5xx)
    AUTHENTICATION_ERROR: {
        code: 'SECURITY_001',
        name: 'AuthenticationError',
        category: ERROR_CATEGORIES.SECURITY,
        status: HTTP_STATUS.UNAUTHORIZED,
        message: 'Authentication failed',
        recoverable: true,
        retryable: false
    },
    
    AUTHORIZATION_ERROR: {
        code: 'SECURITY_002',
        name: 'AuthorizationError',
        category: ERROR_CATEGORIES.SECURITY,
        status: HTTP_STATUS.FORBIDDEN,
        message: 'Access denied',
        recoverable: false,
        retryable: false
    },
    
    SECURITY_VIOLATION: {
        code: 'SECURITY_003',
        name: 'SecurityViolationError',
        category: ERROR_CATEGORIES.SECURITY,
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'Security policy violation',
        recoverable: false,
        retryable: false
    },
    
    MALICIOUS_INPUT: {
        code: 'SECURITY_004',
        name: 'MaliciousInputError',
        category: ERROR_CATEGORIES.SECURITY,
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'Potentially malicious input detected',
        recoverable: false,
        retryable: false
    },
    
    // External Service Errors
    EXTERNAL_API_ERROR: {
        code: 'EXTERNAL_001',
        name: 'ExternalAPIError',
        category: ERROR_CATEGORIES.EXTERNAL,
        status: HTTP_STATUS.BAD_GATEWAY,
        message: 'External service error',
        recoverable: false,
        retryable: true
    },
    
    EXTERNAL_TIMEOUT: {
        code: 'EXTERNAL_002',
        name: 'ExternalTimeoutError',
        category: ERROR_CATEGORIES.EXTERNAL,
        status: HTTP_STATUS.GATEWAY_TIMEOUT,
        message: 'External service timeout',
        recoverable: false,
        retryable: true
    },
    
    // File Processing Errors
    FILE_UPLOAD_ERROR: {
        code: 'FILE_001',
        name: 'FileUploadError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'File upload failed',
        recoverable: true,
        retryable: false
    },
    
    FILE_PROCESSING_ERROR: {
        code: 'FILE_002',
        name: 'FileProcessingError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: 'File processing failed',
        recoverable: true,
        retryable: false
    },
    
    FILE_TYPE_ERROR: {
        code: 'FILE_003',
        name: 'FileTypeError',
        category: ERROR_CATEGORIES.BUSINESS,
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'Unsupported file type',
        recoverable: true,
        retryable: false
    }
};

/**
 * Error recovery suggestions
 */
const RECOVERY_SUGGESTIONS = {
    [ERROR_TYPES.VALIDATION_ERROR.code]: 'Please check your input and try again',
    [ERROR_TYPES.REQUIRED_FIELD.code]: 'Please provide all required fields',
    [ERROR_TYPES.INVALID_FORMAT.code]: 'Please check the format of your input',
    [ERROR_TYPES.NOT_FOUND.code]: 'Please verify the resource identifier and try again',
    [ERROR_TYPES.DUPLICATE_RESOURCE.code]: 'Resource already exists, please use a different identifier',
    [ERROR_TYPES.RATE_LIMITED.code]: 'Please wait before making another request',
    [ERROR_TYPES.DATABASE_ERROR.code]: 'Please try again later or contact support',
    [ERROR_TYPES.DATABASE_CONNECTION.code]: 'Database is temporarily unavailable, please try again later',
    [ERROR_TYPES.FILE_UPLOAD_ERROR.code]: 'Please check file size and format, then try again',
    [ERROR_TYPES.FILE_PROCESSING_ERROR.code]: 'Please check file content and format',
    [ERROR_TYPES.FILE_TYPE_ERROR.code]: 'Please upload a supported file type',
    [ERROR_TYPES.AUTHENTICATION_ERROR.code]: 'Please check your credentials and try again',
    [ERROR_TYPES.AUTHORIZATION_ERROR.code]: 'You do not have permission to perform this action',
    [ERROR_TYPES.SECURITY_VIOLATION.code]: 'Request blocked for security reasons'
};

/**
 * Documentation links for error types
 */
const DOCUMENTATION_LINKS = {
    [ERROR_TYPES.VALIDATION_ERROR.code]: '/docs/validation',
    [ERROR_TYPES.FILE_UPLOAD_ERROR.code]: '/docs/file-upload',
    [ERROR_TYPES.RATE_LIMITED.code]: '/docs/rate-limits',
    [ERROR_TYPES.AUTHENTICATION_ERROR.code]: '/docs/authentication',
    [ERROR_TYPES.AUTHORIZATION_ERROR.code]: '/docs/permissions'
};

/**
 * Get error type by code
 * @param {string} code - Error code
 * @returns {Object|null} Error type definition
 */
function getErrorTypeByCode(code) {
    return Object.values(ERROR_TYPES).find(type => type.code === code) || null;
}

/**
 * Get error type by name
 * @param {string} name - Error name
 * @returns {Object|null} Error type definition
 */
function getErrorTypeByName(name) {
    return Object.values(ERROR_TYPES).find(type => type.name === name) || null;
}

/**
 * Get errors by category
 * @param {string} category - Error category
 * @returns {Array} Array of error types in the category
 */
function getErrorsByCategory(category) {
    return Object.values(ERROR_TYPES).filter(type => type.category === category);
}

/**
 * Check if error is retryable
 * @param {string} code - Error code
 * @returns {boolean} True if error is retryable
 */
function isRetryable(code) {
    const errorType = getErrorTypeByCode(code);
    return errorType ? errorType.retryable : false;
}

/**
 * Check if error is recoverable by user action
 * @param {string} code - Error code
 * @returns {boolean} True if error is recoverable
 */
function isRecoverable(code) {
    const errorType = getErrorTypeByCode(code);
    return errorType ? errorType.recoverable : false;
}

module.exports = {
    ERROR_CATEGORIES,
    HTTP_STATUS,
    ERROR_TYPES,
    RECOVERY_SUGGESTIONS,
    DOCUMENTATION_LINKS,
    getErrorTypeByCode,
    getErrorTypeByName,
    getErrorsByCategory,
    isRetryable,
    isRecoverable
};