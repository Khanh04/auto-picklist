/**
 * Authentication Middleware
 * Handles JWT token validation, API key authentication, and user context setup
 */

const AuthenticationService = require('../services/AuthenticationService');

/**
 * Create authentication middleware with database connection
 */
function createAuthMiddleware(db, config = {}) {
  const authService = new AuthenticationService(db, config);

  /**
   * Extract token from Authorization header or cookies
   */
  function extractToken(req) {
    // First, try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        return { type: 'jwt', token: authHeader.substring(7) };
      }

      if (authHeader.startsWith('ApiKey ')) {
        return { type: 'apikey', token: authHeader.substring(7) };
      }
    }

    // If no Authorization header, check for JWT in cookies
    if (req.cookies && req.cookies.token) {
      return { type: 'jwt', token: req.cookies.token };
    }

    // Also check for access_token cookie (common naming)
    if (req.cookies && req.cookies.access_token) {
      return { type: 'jwt', token: req.cookies.access_token };
    }

    return null;
  }

  /**
   * Get client information for security logging
   */
  function getClientInfo(req) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      deviceInfo: JSON.stringify({
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        acceptLanguage: req.get('Accept-Language'),
        acceptEncoding: req.get('Accept-Encoding')
      })
    };
  }

  /**
   * Optional authentication middleware
   * Sets user context if token is provided, but doesn't require authentication
   */
  const authenticateOptional = async (req, res, next) => {
    try {
      const tokenData = extractToken(req);
      const clientInfo = getClientInfo(req);

      if (!tokenData) {
        // No token provided - continue as anonymous user
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }

      let authResult;

      if (tokenData.type === 'jwt') {
        authResult = await authService.validateToken(tokenData.token);
        req.authMethod = 'jwt';
      } else if (tokenData.type === 'apikey') {
        authResult = await authService.validateApiKey(tokenData.token);
        req.authMethod = 'apikey';
        req.apiKeyScopes = authResult.scopes;
        req.rateLimitPerHour = authResult.rateLimitPerHour;
      }

      if (authResult) {
        req.user = authResult.user;
        req.isAuthenticated = true;
        req.sessionId = authResult.sessionId;

        // Set user context for RLS
        await authService.setUserContext(authResult.user.id);

        // API access logging removed
      } else {
        req.user = null;
        req.isAuthenticated = false;
      }

      next();
    } catch (error) {
      // Failed authentication logging removed

      // For optional auth, continue as anonymous on auth failure
      req.user = null;
      req.isAuthenticated = false;
      next();
    }
  };

  /**
   * Required authentication middleware
   * Requires valid authentication token
   */
  const authenticateRequired = async (req, res, next) => {
    try {
      const tokenData = extractToken(req);

      if (!tokenData) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'MISSING_TOKEN'
        });
      }

      const clientInfo = getClientInfo(req);
      let authResult;

      if (tokenData.type === 'jwt') {
        authResult = await authService.validateToken(tokenData.token);
        req.authMethod = 'jwt';
      } else if (tokenData.type === 'apikey') {
        authResult = await authService.validateApiKey(tokenData.token);
        req.authMethod = 'apikey';
        req.apiKeyScopes = authResult.scopes;
        req.rateLimitPerHour = authResult.rateLimitPerHour;
      } else {
        throw new Error('Invalid authentication method');
      }

      req.user = authResult.user;
      req.isAuthenticated = true;
      req.sessionId = authResult.sessionId;

      // Set user context for RLS
      await authService.setUserContext(authResult.user.id);

      // API access logging removed

      next();
    } catch (error) {
      const clientInfo = getClientInfo(req);

      // Failed authentication logging removed

      return res.status(401).json({
        error: 'Authentication failed',
        code: 'INVALID_TOKEN',
        message: error.message
      });
    }
  };

  /**
   * Role-based authorization middleware
   */
  const requireRole = (roles) => {
    return (req, res, next) => {
      if (!req.isAuthenticated) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    };
  };

  /**
   * API scope authorization middleware for API key access
   */
  const requireScope = (scopes) => {
    return (req, res, next) => {
      if (!req.isAuthenticated) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      if (req.authMethod === 'jwt') {
        // JWT tokens have full access
        return next();
      }

      if (req.authMethod === 'apikey') {
        const requiredScopes = Array.isArray(scopes) ? scopes : [scopes];
        const userScopes = req.apiKeyScopes || [];

        const hasRequiredScope = requiredScopes.some(scope =>
          userScopes.includes(scope) || userScopes.includes('admin')
        );

        if (!hasRequiredScope) {
          return res.status(403).json({
            error: 'Insufficient API key permissions',
            code: 'INSUFFICIENT_SCOPE',
            required: requiredScopes,
            current: userScopes
          });
        }
      }

      next();
    };
  };

  /**
   * Shopping list permission middleware
   */
  const requireShoppingListPermission = (permission = 'view') => {
    return async (req, res, next) => {
      if (!req.isAuthenticated) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const shoppingListId = req.params.id || req.params.shoppingListId || req.body.shoppingListId;

      if (!shoppingListId) {
        return res.status(400).json({
          error: 'Shopping list ID required',
          code: 'MISSING_SHOPPING_LIST_ID'
        });
      }

      try {
        const permissionCheck = await authService.checkShoppingListPermission(
          req.user.id,
          shoppingListId,
          permission
        );

        if (!permissionCheck.hasAccess) {
          return res.status(403).json({
            error: 'Insufficient permissions for this shopping list',
            code: 'INSUFFICIENT_SHOPPING_LIST_PERMISSIONS',
            required: permission
          });
        }

        req.shoppingListPermission = permissionCheck.permission;
        req.shoppingList = permissionCheck.shoppingList;
        next();
      } catch (error) {
        return res.status(500).json({
          error: 'Error checking permissions',
          code: 'PERMISSION_CHECK_ERROR',
          message: error.message
        });
      }
    };
  };

  /**
   * Rate limiting middleware for API keys
   */
  const rateLimit = (windowMs = 60 * 60 * 1000) => { // 1 hour default
    const requestCounts = new Map();

    return (req, res, next) => {
      if (req.authMethod !== 'apikey') {
        return next(); // Only rate limit API keys
      }

      const keyId = req.user.id + '_' + req.apiKeyId;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      for (const [key, data] of requestCounts.entries()) {
        if (data.resetTime < now) {
          requestCounts.delete(key);
        }
      }

      // Get or create rate limit data
      let rateLimitData = requestCounts.get(keyId);
      if (!rateLimitData || rateLimitData.resetTime < now) {
        rateLimitData = {
          count: 0,
          resetTime: now + windowMs
        };
        requestCounts.set(keyId, rateLimitData);
      }

      // Check rate limit
      const limit = req.rateLimitPerHour || 1000;
      if (rateLimitData.count >= limit) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          limit,
          resetTime: rateLimitData.resetTime
        });
      }

      // Increment counter
      rateLimitData.count++;

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': limit,
        'X-RateLimit-Remaining': Math.max(0, limit - rateLimitData.count),
        'X-RateLimit-Reset': Math.ceil(rateLimitData.resetTime / 1000)
      });

      next();
    };
  };

  /**
   * Error handling middleware for authentication errors
   */
  const handleAuthErrors = (err, req, res, next) => {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_JWT',
        message: err.message
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        message: err.message
      });
    }

    if (err.message && err.message.includes('Session')) {
      return res.status(401).json({
        error: 'Session invalid',
        code: 'INVALID_SESSION',
        message: err.message
      });
    }

    next(err);
  };

  return {
    authenticateOptional,
    authenticateRequired,
    requireRole,
    requireScope,
    requireShoppingListPermission,
    rateLimit,
    handleAuthErrors,
    authService
  };
}

module.exports = createAuthMiddleware;