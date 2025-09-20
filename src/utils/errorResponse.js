/**
 * Response utilities for consistent API responses in tests
 */

const crypto = require('crypto');

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Send standardized success response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {Object} meta - Optional metadata
 */
function sendSuccessResponse(req, res, data, meta = {}) {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: req.requestId || generateRequestId()
  };

  // Add metadata if provided
  if (meta && Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  res.json(response);
}

/**
 * Send standardized error response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code
 */
function sendErrorResponse(req, res, error, statusCode = 500) {
  const response = {
    success: false,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An error occurred',
      timestamp: new Date().toISOString(),
      requestId: req.requestId || generateRequestId(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  };

  res.status(statusCode).json(response);
}

/**
 * Build error response object
 * @param {Object} options - Error response options
 * @returns {Object} Error response object and status code
 */
function buildErrorResponse({ error, context = {} }) {
  const statusCode = error.statusCode || error.status || 500;

  const response = {
    success: false,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An error occurred',
      timestamp: new Date().toISOString(),
      requestId: context.requestId || generateRequestId(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    }
  };

  return { response, statusCode };
}

/**
 * Build success response object
 * @param {Object} data - Response data
 * @param {Object} meta - Optional metadata
 * @param {Object} context - Request context
 * @returns {Object} Success response object
 */
function buildSuccessResponse(data, meta = {}, context = {}) {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId: context.requestId || generateRequestId()
  };

  if (meta && Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return response;
}

module.exports = {
  sendSuccessResponse,
  sendErrorResponse,
  buildErrorResponse,
  buildSuccessResponse,
  generateRequestId
};