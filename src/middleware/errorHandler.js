/**
 * Centralized error handling middleware
 */

/**
 * Custom error class for application errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Async error handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Global error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (error, req, res, next) => {
    let err = { ...error };
    err.message = error.message;

    // Log error details
    console.error('Error Details:', {
        message: err.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Default error values
    let message = 'Internal Server Error';
    let statusCode = 500;

    // Handle specific error types
    if (error.name === 'ValidationError') {
        message = 'Invalid input data';
        statusCode = 400;
    } else if (error.name === 'CastError') {
        message = 'Resource not found';
        statusCode = 404;
    } else if (error.code === '23505') { // PostgreSQL unique constraint violation
        message = 'Duplicate entry';
        statusCode = 409;
    } else if (error.code === '23503') { // PostgreSQL foreign key constraint violation
        message = 'Referenced resource not found';
        statusCode = 400;
    } else if (error.code === 'ECONNREFUSED') {
        message = 'Database connection failed';
        statusCode = 503;
    } else if (error instanceof AppError) {
        message = error.message;
        statusCode = error.statusCode;
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error
        })
    });
};

/**
 * Handle 404 not found errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Close server & exit process
    process.exit(1);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = {
    AppError,
    asyncHandler,
    globalErrorHandler,
    notFoundHandler
};