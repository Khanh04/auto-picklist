/**
 * Authentication Routes
 * Handles user registration, login, logout, and token management
 */

const express = require('express');
const router = express.Router();

/**
 * Create auth routes with database connection and middleware
 */
function createAuthRoutes(db, authMiddleware) {
  const { authService, authenticateRequired, authenticateOptional } = authMiddleware;

  /**
   * POST /auth/register
   * Register a new user account
   */
  router.post('/register', async (req, res) => {
    try {
      const { email, password, displayName, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password || !displayName) {
        return res.status(400).json({
          error: 'Missing required fields',
          code: 'MISSING_REQUIRED_FIELDS',
          required: ['email', 'password', 'displayName']
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        });
      }

      const result = await authService.registerUser({
        email,
        password,
        displayName,
        firstName,
        lastName
      });

      res.status(201).json({
        success: true,
        user: result.user,
        message: 'Account created successfully. Please check your email for verification.',
        verificationRequired: true
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'User already exists',
          code: 'USER_EXISTS'
        });
      }

      res.status(500).json({
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR',
        message: error.message
      });
    }
  });

  /**
   * POST /auth/login
   * Authenticate user with email and password
   */
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      const clientInfo = {
        deviceInfo: JSON.stringify({
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          acceptLanguage: req.get('Accept-Language')
        }),
        ipAddress: req.ip || req.socket.remoteAddress
      };

      const result = await authService.authenticateUser({
        email,
        password,
        ...clientInfo
      });

      // Set access token as httpOnly cookie for automatic authentication
      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 4 * 60 * 60 * 1000 // 4 hours to match JWT expiry
      });

      // Also set refresh token as httpOnly cookie
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      });
    } catch (error) {
      if (error.message.includes('Invalid email or password')) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      res.status(500).json({
        error: 'Login failed',
        code: 'LOGIN_ERROR',
        message: error.message
      });
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token required',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      const result = await authService.refreshAccessToken({
        refreshToken,
        ipAddress: req.ip || req.connection.remoteAddress
      });

      res.json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      });
    } catch (error) {
      res.status(401).json({
        error: 'Token refresh failed',
        code: 'REFRESH_FAILED',
        message: error.message
      });
    }
  });

  /**
   * POST /auth/logout
   * Revoke current session
   */
  router.post('/logout', authenticateRequired, async (req, res) => {
    try {
      if (req.sessionId) {
        await authService.revokeSession({
          sessionToken: req.sessionId,
          reason: 'user_logout'
        });
      }

      // Clear authentication cookies
      res.clearCookie('token');
      res.clearCookie('refresh_token');

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Logout failed',
        code: 'LOGOUT_ERROR',
        message: error.message
      });
    }
  });

  /**
   * GET /auth/me
   * Get current user information
   */
  router.get('/me', authenticateRequired, async (req, res) => {
    try {
      // Get user preferences
      const preferences = await authService.getUserPreferences(req.user.id);

      res.json({
        success: true,
        user: req.user,
        preferences,
        authMethod: req.authMethod,
        sessionId: req.sessionId
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get user information',
        code: 'USER_INFO_ERROR',
        message: error.message
      });
    }
  });

  /**
   * PUT /auth/profile
   * Update user profile information
   */
  router.put('/profile', authenticateRequired, async (req, res) => {
    try {
      const { firstName, lastName, email, company, phone } = req.body;

      // Validate at least one field is provided
      if (!firstName && !lastName && !email && !company && !phone) {
        return res.status(400).json({
          error: 'At least one profile field must be provided',
          code: 'NO_PROFILE_DATA'
        });
      }

      const updatedUser = await authService.updateProfile(req.user.id, {
        firstName,
        lastName,
        email,
        company,
        phone
      });

      res.json({
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      if (error.message.includes('Invalid email format')) {
        return res.status(400).json({
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
      }

      if (error.message.includes('Email already in use')) {
        return res.status(409).json({
          error: 'Email already in use by another account',
          code: 'EMAIL_TAKEN'
        });
      }

      res.status(500).json({
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_ERROR',
        message: error.message
      });
    }
  });

  /**
   * PUT /auth/preferences
   * Update user preferences
   */
  router.put('/preferences', authenticateRequired, async (req, res) => {
    try {
      const { category, key, value, description } = req.body;

      if (!category || !key || value === undefined) {
        return res.status(400).json({
          error: 'Category, key, and value are required',
          code: 'MISSING_PREFERENCE_DATA'
        });
      }

      await authService.updateUserPreference(
        req.user.id,
        category,
        key,
        value,
        description
      );

      res.json({
        success: true,
        message: 'Preference updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update preference',
        code: 'PREFERENCE_UPDATE_ERROR',
        message: error.message
      });
    }
  });

  /**
   * GET /auth/preferences/:category?
   * Get user preferences by category
   */
  router.get('/preferences/:category?', authenticateRequired, async (req, res) => {
    try {
      const { category } = req.params;
      const preferences = await authService.getUserPreferences(req.user.id, category);

      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get preferences',
        code: 'PREFERENCE_GET_ERROR',
        message: error.message
      });
    }
  });

  /**
   * POST /auth/api-keys
   * Create new API key
   */
  router.post('/api-keys', authenticateRequired, async (req, res) => {
    try {
      const { keyName, scopes, expiresAt, rateLimitPerHour } = req.body;

      if (!keyName || !scopes || !Array.isArray(scopes)) {
        return res.status(400).json({
          error: 'Key name and scopes array are required',
          code: 'MISSING_API_KEY_DATA'
        });
      }

      // Validate scopes
      const validScopes = ['read', 'write', 'admin'];
      const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        return res.status(400).json({
          error: 'Invalid scopes',
          code: 'INVALID_SCOPES',
          validScopes,
          invalidScopes
        });
      }

      const result = await authService.createApiKey({
        userId: req.user.id,
        keyName,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        rateLimitPerHour
      });

      res.status(201).json({
        success: true,
        apiKey: result.apiKey, // Only returned once
        keyId: result.keyId,
        keyPrefix: result.keyPrefix,
        scopes: result.scopes,
        expiresAt: result.expiresAt,
        message: 'API key created successfully. Save the key securely - it will not be shown again.'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create API key',
        code: 'API_KEY_CREATE_ERROR',
        message: error.message
      });
    }
  });

  /**
   * GET /auth/api-keys
   * List user's API keys (without the actual keys)
   */
  router.get('/api-keys', authenticateRequired, async (req, res) => {
    try {
      const apiKeys = await db('api_keys')
        .where({ user_id: req.user.id })
        .select('id', 'key_name', 'key_prefix', 'scopes', 'rate_limit_per_hour',
                'last_used_at', 'expires_at', 'is_active', 'created_at')
        .orderBy('created_at', 'desc');

      res.json({
        success: true,
        apiKeys: apiKeys.map(key => ({
          ...key,
          scopes: JSON.parse(key.scopes || '[]')
        }))
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get API keys',
        code: 'API_KEY_LIST_ERROR',
        message: error.message
      });
    }
  });

  /**
   * DELETE /auth/api-keys/:keyId
   * Revoke API key
   */
  router.delete('/api-keys/:keyId', authenticateRequired, async (req, res) => {
    try {
      const { keyId } = req.params;

      const updated = await db('api_keys')
        .where({ id: keyId, user_id: req.user.id })
        .update({ is_active: false, updated_at: db.fn.now() });

      if (updated === 0) {
        return res.status(404).json({
          error: 'API key not found',
          code: 'API_KEY_NOT_FOUND'
        });
      }

      // Log security event
      await authService.logSecurityEvent(db, {
        user_id: req.user.id,
        event_type: 'api_key_revoked',
        severity: 'medium',
        ip_address: req.ip,
        event_data: { key_id: keyId }
      });

      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to revoke API key',
        code: 'API_KEY_REVOKE_ERROR',
        message: error.message
      });
    }
  });

  /**
   * GET /auth/security-log
   * Get user's security audit log
   */
  router.get('/security-log', authenticateRequired, async (req, res) => {
    try {
      const { page = 1, limit = 50, eventType } = req.query;
      const offset = (page - 1) * limit;

      let query = db('security_audit_log')
        .where({ user_id: req.user.id })
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit))
        .offset(offset);

      if (eventType) {
        query = query.where({ event_type: eventType });
      }

      const logs = await query;
      const total = await db('security_audit_log')
        .where({ user_id: req.user.id })
        .count('* as count')
        .first();

      res.json({
        success: true,
        logs: logs.map(log => ({
          ...log,
          event_data: log.event_data ? JSON.parse(log.event_data) : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get security log',
        code: 'SECURITY_LOG_ERROR',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createAuthRoutes;