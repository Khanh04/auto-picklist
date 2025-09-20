/**
 * Enhanced error handling middleware for Express applications
 * Provides consistent error responses and logging for tests
 */

/**
 * Simple error handler middleware for testing
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enhancedErrorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    statusCode = 400;
    message = 'Invalid reference';
  } else if (err.status) {
    statusCode = err.status;
    message = err.message;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * Create not found error
 * @param {string} resource - Resource type
 * @param {string} identifier - Resource identifier
 * @returns {Error} Not found error
 */
const createNotFoundError = (resource, identifier) => {
  const error = new Error(`${resource} not found`);
  error.code = 'NOT_FOUND';
  error.status = 404;
  error.resource = resource;
  error.identifier = identifier;
  return error;
};

/**
 * Enhanced async handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const enhancedAsyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
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

// Export both named and default exports for compatibility
module.exports = {
  enhancedErrorHandler,
  enhancedAsyncHandler,
  enhancedNotFoundHandler,
  createNotFoundError
};

// Also export as default for require() compatibility
module.exports.enhancedErrorHandler = enhancedErrorHandler;