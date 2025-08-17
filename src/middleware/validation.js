const { AppError } = require('./errorHandler');

/**
 * Validation middleware functions
 */

/**
 * Validate file upload
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateFileUpload = (options = {}) => {
    const {
        required = true,
        allowedTypes = ['text/csv', 'application/pdf'],
        maxSize = 5 * 1024 * 1024 // 5MB default
    } = options;

    return (req, res, next) => {
        if (required && !req.file) {
            return next(new AppError('File is required', 400));
        }

        if (req.file) {
            // Check file type
            if (!allowedTypes.includes(req.file.mimetype)) {
                return next(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
            }

            // Check file size
            if (req.file.size > maxSize) {
                return next(new AppError(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`, 400));
            }

            // Check for malicious file names
            if (/[<>:"/\\|?*]/.test(req.file.originalname)) {
                return next(new AppError('Invalid file name characters', 400));
            }
        }

        next();
    };
};

/**
 * Validate request body fields
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware function
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            // Required check
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Skip further validation if field is not provided and not required
            if (value === undefined || value === null) {
                continue;
            }

            // Type validation
            if (rules.type) {
                if (rules.type === 'string' && typeof value !== 'string') {
                    errors.push(`${field} must be a string`);
                } else if (rules.type === 'number' && isNaN(Number(value))) {
                    errors.push(`${field} must be a number`);
                } else if (rules.type === 'array' && !Array.isArray(value)) {
                    errors.push(`${field} must be an array`);
                } else if (rules.type === 'email' && !isValidEmail(value)) {
                    errors.push(`${field} must be a valid email`);
                }
            }

            // Length validation for strings
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${field} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${field} must not exceed ${rules.maxLength} characters`);
            }

            // Range validation for numbers
            if (rules.min !== undefined && Number(value) < rules.min) {
                errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && Number(value) > rules.max) {
                errors.push(`${field} must not exceed ${rules.max}`);
            }

            // Custom validation
            if (rules.custom && typeof rules.custom === 'function') {
                const customError = rules.custom(value);
                if (customError) {
                    errors.push(`${field} ${customError}`);
                }
            }
        }

        if (errors.length > 0) {
            return next(new AppError(`Validation failed: ${errors.join(', ')}`, 400));
        }

        next();
    };
};

/**
 * Validate route parameters
 * @param {Object} schema - Parameter validation schema
 * @returns {Function} Express middleware function
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        const errors = [];

        for (const [param, rules] of Object.entries(schema)) {
            const value = req.params[param];

            if (rules.type === 'number' && isNaN(Number(value))) {
                errors.push(`${param} must be a valid number`);
            }

            if (rules.type === 'id' && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
                errors.push(`${param} must be a valid positive integer`);
            }
        }

        if (errors.length > 0) {
            return next(new AppError(`Invalid parameters: ${errors.join(', ')}`, 400));
        }

        next();
    };
};

/**
 * Sanitize input data
 * @param {Array} fields - Fields to sanitize
 * @returns {Function} Express middleware function
 */
const sanitizeInput = (fields = []) => {
    return (req, res, next) => {
        const sanitize = (str) => {
            if (typeof str !== 'string') return str;
            return str
                .trim()
                .replace(/[<>]/g, '') // Remove potential HTML tags
                .substring(0, 1000); // Limit length
        };

        // Sanitize body fields
        if (fields.length === 0) {
            // Sanitize all string fields if no specific fields provided
            for (const [key, value] of Object.entries(req.body || {})) {
                if (typeof value === 'string') {
                    req.body[key] = sanitize(value);
                }
            }
        } else {
            // Sanitize specific fields
            fields.forEach(field => {
                if (req.body && req.body[field]) {
                    req.body[field] = sanitize(req.body[field]);
                }
            });
        }

        next();
    };
};

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
const rateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 100,
        message = 'Too many requests from this IP'
    } = options;

    const requests = new Map();

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        for (const [key, timestamps] of requests.entries()) {
            const validTimestamps = timestamps.filter(ts => ts > windowStart);
            if (validTimestamps.length === 0) {
                requests.delete(key);
            } else {
                requests.set(key, validTimestamps);
            }
        }

        // Check current IP
        const ipRequests = requests.get(ip) || [];
        const validRequests = ipRequests.filter(ts => ts > windowStart);

        if (validRequests.length >= maxRequests) {
            return next(new AppError(message, 429));
        }

        // Add current request
        validRequests.push(now);
        requests.set(ip, validRequests);

        next();
    };
};

/**
 * Helper function to validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

module.exports = {
    validateFileUpload,
    validateBody,
    validateParams,
    sanitizeInput,
    rateLimit
};