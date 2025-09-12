const validator = require('validator');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const { AppError } = require('./errorHandler');

// Create DOMPurify instance for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Enhanced security validation middleware
 */

/**
 * SQL injection detection patterns
 */
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    /(--|\#|\/\*|\*\/|;|'|"|`)/,
    /(\bOR\b|\bAND\b).*(=|<|>|!=)/i,
    /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/i,
    /(xp_cmdshell|sp_executesql)/i
];

/**
 * XSS detection patterns
 */
const XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi
];

/**
 * Comprehensive input sanitization
 * @param {any} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {any} Sanitized input
 */
function sanitizeInput(input, options = {}) {
    const {
        allowHTML = false,
        maxLength = 10000,
        trimWhitespace = true,
        preventSQLInjection = true,
        preventXSS = true
    } = options;

    if (input === null || input === undefined) {
        return input;
    }

    if (typeof input === 'object') {
        if (Array.isArray(input)) {
            return input.map(item => sanitizeInput(item, options));
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizeInput(value, options);
        }
        return sanitized;
    }

    if (typeof input !== 'string') {
        return input;
    }

    let sanitized = input;

    // Trim whitespace
    if (trimWhitespace) {
        sanitized = sanitized.trim();
    }

    // Length validation
    if (sanitized.length > maxLength) {
        throw new AppError(`Input too long. Maximum ${maxLength} characters allowed.`, 400);
    }

    // SQL injection prevention
    if (preventSQLInjection) {
        for (const pattern of SQL_INJECTION_PATTERNS) {
            if (pattern.test(sanitized)) {
                throw new AppError('Invalid characters detected in input.', 400);
            }
        }
    }

    // XSS prevention
    if (preventXSS) {
        for (const pattern of XSS_PATTERNS) {
            if (pattern.test(sanitized)) {
                throw new AppError('Invalid script content detected in input.', 400);
            }
        }

        // Use DOMPurify for HTML sanitization
        if (allowHTML) {
            sanitized = purify.sanitize(sanitized, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
                ALLOWED_ATTR: []
            });
        } else {
            // Strip all HTML
            sanitized = purify.sanitize(sanitized, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        }
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');

    // Normalize Unicode
    sanitized = sanitized.normalize('NFC');

    return sanitized;
}

/**
 * Enhanced validation middleware with security checks
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware function
 */
const secureValidateBody = (schema) => {
    return (req, res, next) => {
        const errors = [];

        try {
            // First, sanitize all inputs
            req.body = sanitizeInput(req.body, { allowHTML: false });

            for (const [field, rules] of Object.entries(schema)) {
                const value = req.body[field];

                // Required check
                if (rules.required && (value === undefined || value === null || value === '')) {
                    errors.push(`${field} is required`);
                    continue;
                }

                // Skip further validation if field is not provided and not required
                if (value === undefined || value === null || value === '') {
                    continue;
                }

                // Type validation with enhanced security
                if (rules.type) {
                    switch (rules.type) {
                        case 'string':
                            if (typeof value !== 'string') {
                                errors.push(`${field} must be a string`);
                            }
                            break;
                        case 'number':
                            if (!validator.isNumeric(String(value))) {
                                errors.push(`${field} must be a valid number`);
                            }
                            break;
                        case 'integer':
                            if (!validator.isInt(String(value))) {
                                errors.push(`${field} must be a valid integer`);
                            }
                            break;
                        case 'email':
                            if (!validator.isEmail(value)) {
                                errors.push(`${field} must be a valid email address`);
                            }
                            break;
                        case 'url':
                            if (!validator.isURL(value, { protocols: ['http', 'https'] })) {
                                errors.push(`${field} must be a valid URL`);
                            }
                            break;
                        case 'alphanumeric':
                            if (!validator.isAlphanumeric(value)) {
                                errors.push(`${field} must contain only letters and numbers`);
                            }
                            break;
                        case 'array':
                            if (!Array.isArray(value)) {
                                errors.push(`${field} must be an array`);
                            }
                            break;
                    }
                }

                // Length validation for strings
                if (typeof value === 'string') {
                    if (rules.minLength && value.length < rules.minLength) {
                        errors.push(`${field} must be at least ${rules.minLength} characters`);
                    }
                    if (rules.maxLength && value.length > rules.maxLength) {
                        errors.push(`${field} must not exceed ${rules.maxLength} characters`);
                    }
                }

                // Range validation for numbers
                if (rules.min !== undefined) {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue < rules.min) {
                        errors.push(`${field} must be at least ${rules.min}`);
                    }
                }
                if (rules.max !== undefined) {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > rules.max) {
                        errors.push(`${field} must not exceed ${rules.max}`);
                    }
                }

                // Pattern validation
                if (rules.pattern && typeof value === 'string') {
                    if (!rules.pattern.test(value)) {
                        errors.push(`${field} format is invalid`);
                    }
                }

                // Enum validation
                if (rules.enum && Array.isArray(rules.enum)) {
                    if (!rules.enum.includes(value)) {
                        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
                    }
                }

                // Custom validation
                if (rules.custom && typeof rules.custom === 'function') {
                    try {
                        const customError = rules.custom(value);
                        if (customError) {
                            errors.push(`${field} ${customError}`);
                        }
                    } catch (customValidationError) {
                        errors.push(`${field} validation failed`);
                    }
                }
            }

            if (errors.length > 0) {
                return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
            }

            next();
        } catch (sanitizationError) {
            return next(new AppError(sanitizationError.message, 400));
        }
    };
};

/**
 * Secure parameter validation
 * @param {Object} schema - Parameter validation schema
 * @returns {Function} Express middleware function
 */
const secureValidateParams = (schema) => {
    return (req, res, next) => {
        const errors = [];

        try {
            for (const [param, rules] of Object.entries(schema)) {
                let value = req.params[param];

                // Sanitize parameter
                value = sanitizeInput(value, { allowHTML: false });
                req.params[param] = value;

                if (rules.type === 'number' && !validator.isNumeric(value)) {
                    errors.push(`${param} must be a valid number`);
                }

                if (rules.type === 'id') {
                    if (!validator.isInt(value, { min: 1 })) {
                        errors.push(`${param} must be a valid positive integer`);
                    }
                }

                if (rules.pattern && !rules.pattern.test(value)) {
                    errors.push(`${param} format is invalid`);
                }
            }

            if (errors.length > 0) {
                return next(new AppError(`Invalid parameters: ${errors.join(', ')}`, 400));
            }

            next();
        } catch (sanitizationError) {
            return next(new AppError('Invalid parameter format', 400));
        }
    };
};

/**
 * Enhanced file upload validation with security checks
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const secureValidateFileUpload = (options = {}) => {
    const {
        required = true,
        allowedTypes = ['text/csv', 'application/pdf'],
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedExtensions = ['csv', 'pdf'],
        checkMagicNumbers = true
    } = options;

    // Magic number signatures for file type verification
    const MAGIC_NUMBERS = {
        'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
        'text/csv': [], // CSV doesn't have a reliable magic number
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04] // XLSX (ZIP)
    };

    return (req, res, next) => {
        if (required && !req.file) {
            return next(new AppError('File is required', 400));
        }

        if (req.file) {
            // Sanitize filename
            try {
                req.file.originalname = sanitizeInput(req.file.originalname, {
                    allowHTML: false,
                    maxLength: 255
                });
            } catch (error) {
                return next(new AppError('Invalid filename', 400));
            }

            // Check file type
            if (!allowedTypes.includes(req.file.mimetype)) {
                return next(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
            }

            // Check file size
            if (req.file.size > maxSize) {
                return next(new AppError(`File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`, 400));
            }

            // Validate file extension
            const fileExtension = req.file.originalname.toLowerCase().split('.').pop();
            if (!allowedExtensions.includes(fileExtension)) {
                return next(new AppError(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`, 400));
            }

            // Check for malicious file names
            if (/[<>:"/\\|?*\x00-\x1f]/.test(req.file.originalname)) {
                return next(new AppError('Invalid filename characters', 400));
            }

            // Verify magic numbers for additional security
            if (checkMagicNumbers && MAGIC_NUMBERS[req.file.mimetype]) {
                const magicNumbers = MAGIC_NUMBERS[req.file.mimetype];
                if (magicNumbers.length > 0 && req.file.buffer) {
                    const header = Array.from(req.file.buffer.slice(0, magicNumbers.length));
                    const isValid = magicNumbers.every((byte, index) => header[index] === byte);
                    if (!isValid) {
                        return next(new AppError('File content does not match declared type', 400));
                    }
                }
            }
        }

        next();
    };
};

/**
 * Middleware to prevent request bombing
 * @param {Object} options - Options for request limiting
 * @returns {Function} Express middleware function
 */
const preventRequestBombing = (options = {}) => {
    const {
        maxBodySize = 10 * 1024 * 1024, // 10MB
        maxParameters = 1000,
        maxDepth = 10
    } = options;

    return (req, res, next) => {
        // Check request body size
        const contentLength = parseInt(req.get('Content-Length') || '0');
        if (contentLength > maxBodySize) {
            return next(new AppError('Request too large', 413));
        }

        // Check parameter count
        const paramCount = Object.keys(req.body || {}).length + 
                          Object.keys(req.query || {}).length + 
                          Object.keys(req.params || {}).length;
        
        if (paramCount > maxParameters) {
            return next(new AppError('Too many parameters', 400));
        }

        // Check object depth
        function getDepth(obj, depth = 0) {
            if (depth > maxDepth) return depth;
            if (typeof obj !== 'object' || obj === null) return depth;
            
            let maxChildDepth = depth;
            for (const value of Object.values(obj)) {
                if (typeof value === 'object' && value !== null) {
                    maxChildDepth = Math.max(maxChildDepth, getDepth(value, depth + 1));
                }
            }
            return maxChildDepth;
        }

        if (req.body && getDepth(req.body) > maxDepth) {
            return next(new AppError('Request structure too deep', 400));
        }

        next();
    };
};

module.exports = {
    sanitizeInput,
    secureValidateBody,
    secureValidateParams,
    secureValidateFileUpload,
    preventRequestBombing,
    SQL_INJECTION_PATTERNS,
    XSS_PATTERNS
};