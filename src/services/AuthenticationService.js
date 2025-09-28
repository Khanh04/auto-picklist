/**
 * Authentication Service
 * Handles user authentication, session management, and security operations
 * Works with the comprehensive user authentication database schema
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthenticationService {
  constructor(db, config = {}) {
    this.db = db;
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      jwtExpiresIn: config.jwtExpiresIn || '15m',
      refreshTokenExpiresIn: config.refreshTokenExpiresIn || '7d',
      bcryptRounds: config.bcryptRounds || 12,
      maxFailedAttempts: config.maxFailedAttempts || 5,
      lockoutDuration: config.lockoutDuration || 15 * 60 * 1000, // 15 minutes
      ...config
    };
  }

  /**
   * Register a new user
   */
  async registerUser({ email, password, displayName, firstName, lastName }) {
    const trx = await this.db.transaction();

    try {
      // Check if user already exists
      const existingUser = await trx('users').where({ email }).first();
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, this.config.bcryptRounds);

      // Create user
      const [user] = await trx('users').insert({
        email,
        password_hash: passwordHash,
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
        email_verified: false,
        is_active: true,
        role: 'user'
      }).returning('*');

      // Create email verification token
      const verificationToken = await this.createEmailVerificationToken(trx, user.id, email);


      await trx.commit();

      return {
        user: this.sanitizeUser(user),
        verificationToken
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser({ email, password, deviceInfo, ipAddress }) {
    const trx = await this.db.transaction();

    try {
      // Find user
      const user = await trx('users')
        .where({ email, is_active: true })
        .first();

      if (!user || !user.password_hash) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Create session
      const session = await this.createUserSession(trx, {
        userId: user.id,
        deviceInfo,
        ipAddress
      });

      // Update last login
      await trx('users')
        .where({ id: user.id })
        .update({ last_login_at: trx.fn.now() });


      await trx.commit();

      return {
        user: this.sanitizeUser(user),
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: this.config.jwtExpiresIn
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Create user session with JWT tokens
   */
  async createUserSession(trx, { userId, deviceInfo, ipAddress }) {
    const sessionToken = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration times
    const accessTokenExpiresAt = new Date(Date.now() + this.parseTimeToMs(this.config.jwtExpiresIn));
    const refreshTokenExpiresAt = new Date(Date.now() + this.parseTimeToMs(this.config.refreshTokenExpiresIn));

    // Create session record
    await trx('user_sessions').insert({
      user_id: userId,
      session_token: sessionToken,
      refresh_token: refreshToken,
      device_info: deviceInfo,
      ip_address: ipAddress,
      expires_at: refreshTokenExpiresAt
    });

    // Generate JWT access token
    const accessToken = jwt.sign(
      {
        sub: userId,
        jti: sessionToken,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(accessTokenExpiresAt.getTime() / 1000)
      },
      this.config.jwtSecret
    );

    return {
      session_token: sessionToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: accessTokenExpiresAt
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken({ refreshToken, ipAddress }) {
    const trx = await this.db.transaction();

    try {
      // Find valid session
      const session = await trx('user_sessions')
        .join('users', 'user_sessions.user_id', 'users.id')
        .where({
          'user_sessions.refresh_token': refreshToken,
          'user_sessions.is_revoked': false,
          'users.is_active': true
        })
        .where('user_sessions.expires_at', '>', trx.fn.now())
        .select('user_sessions.*', 'users.email')
        .first();

      if (!session) {
        throw new Error('Invalid or expired refresh token');
      }

      // Generate new tokens
      const newSession = await this.createUserSession(trx, {
        userId: session.user_id,
        deviceInfo: session.device_info,
        ipAddress
      });

      // Revoke old session
      await trx('user_sessions')
        .where({ id: session.id })
        .update({
          is_revoked: true,
          revoked_at: trx.fn.now(),
          revoked_reason: 'token_refresh'
        });

      // Update last used
      await trx('user_sessions')
        .where({ session_token: newSession.session_token })
        .update({ last_used_at: trx.fn.now() });

      await trx.commit();

      return {
        accessToken: newSession.access_token,
        refreshToken: newSession.refresh_token,
        expiresIn: this.config.jwtExpiresIn
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Validate JWT token and return user context
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret);

      // Simplified query without transaction for read-only validation
      const session = await this.db('user_sessions')
        .join('users', 'user_sessions.user_id', 'users.id')
        .where({
          'user_sessions.session_token': decoded.jti,
          'user_sessions.is_revoked': false,
          'users.is_active': true
        })
        .andWhere('user_sessions.expires_at', '>', this.db.fn.now())
        .select('user_sessions.*', 'users.email', 'users.display_name', 'users.first_name', 'users.last_name', 'users.role', 'users.is_active as user_is_active')
        .first();

      if (!session) {
        throw new Error('Session not found or expired');
      }

      // Update last used (simple update without transaction)
      await this.db('user_sessions')
        .where({ session_token: decoded.jti })
        .update({ last_used_at: this.db.fn.now() });

      return {
        user: this.sanitizeUser({
          id: session.user_id,
          email: session.email,
          display_name: session.display_name,
          first_name: session.first_name,
          last_name: session.last_name,
          role: session.role,
          is_active: session.user_is_active
        }),
        sessionId: session.id,
        tokenData: decoded
      };
    } catch (error) {
      throw new Error('Invalid token: ' + error.message);
    }
  }

  /**
   * Create API key for user
   */
  async createApiKey({ userId, keyName, scopes, expiresAt, rateLimitPerHour = 1000 }) {
    const trx = await this.db.transaction();

    try {
      // Generate API key
      const apiKey = `ak_${crypto.randomBytes(16).toString('hex')}`;
      const keyHash = await bcrypt.hash(apiKey, this.config.bcryptRounds);
      const keyPrefix = apiKey.substring(0, 10);

      // Create API key record
      const [apiKeyRecord] = await trx('api_keys').insert({
        user_id: userId,
        key_name: keyName,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: JSON.stringify(scopes),
        rate_limit_per_hour: rateLimitPerHour,
        expires_at: expiresAt
      }).returning('*');


      await trx.commit();

      return {
        apiKey, // Return plain key only once
        keyId: apiKeyRecord.id,
        keyPrefix,
        scopes,
        expiresAt
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey) {
    const apiKeyRecords = await this.db('api_keys')
      .join('users', 'api_keys.user_id', 'users.id')
      .where({
        'api_keys.is_active': true,
        'users.is_active': true
      })
      .where(function() {
        this.whereNull('api_keys.expires_at')
          .orWhere('api_keys.expires_at', '>', this.client.fn.now());
      })
      .select('api_keys.*', 'users.email', 'users.display_name', 'users.role');

    // Check each API key hash (constant time comparison)
    for (const record of apiKeyRecords) {
      const isValid = await bcrypt.compare(apiKey, record.key_hash);
      if (isValid) {
        // Update last used
        await this.db('api_keys')
          .where({ id: record.id })
          .update({
            last_used_at: this.db.fn.now(),
            last_used_ip: null // Set from request context
          });

        return {
          user: this.sanitizeUser(record),
          apiKeyId: record.id,
          scopes: JSON.parse(record.scopes || '[]'),
          rateLimitPerHour: record.rate_limit_per_hour
        };
      }
    }

    throw new Error('Invalid API key');
  }

  /**
   * Revoke user session
   */
  async revokeSession({ sessionToken, reason = 'user_logout' }) {
    const trx = await this.db.transaction();

    try {
      const session = await trx('user_sessions')
        .where({ session_token: sessionToken })
        .first();

      if (session) {
        await trx('user_sessions')
          .where({ session_token: sessionToken })
          .update({
            is_revoked: true,
            revoked_at: trx.fn.now(),
            revoked_reason: reason
          });

      }

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Create email verification token
   */
  async createEmailVerificationToken(trx, userId, email) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, this.config.bcryptRounds);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await trx('email_verification_tokens').insert({
      user_id: userId,
      token_hash: tokenHash,
      email,
      expires_at: expiresAt
    });

    return token;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(trx, eventData) {
    await trx('security_audit_log').insert({
      user_id: eventData.user_id || null,
      event_type: eventData.event_type,
      ip_address: eventData.ip_address || null,
      user_agent: eventData.user_agent || null,
      session_id: eventData.session_id || null,
      event_data: eventData.event_data ? JSON.stringify(eventData.event_data) : null,
      severity: eventData.severity || 'low',
      requires_review: eventData.requires_review || false
    });
  }

  /**
   * Set user context for RLS
   */
  async setUserContext(userId) {
    await this.db.raw('SELECT set_config(?, ?, ?)', [
      'app.current_user_id',
      userId.toString(),
      true
    ]);
  }

  /**
   * Sanitize user data for client response
   */
  sanitizeUser(user) {
    const sanitized = { ...user };
    delete sanitized.password_hash;
    delete sanitized.session_id;
    return sanitized;
  }

  /**
   * Parse time string to milliseconds
   */
  parseTimeToMs(timeStr) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid time format');
    }

    return parseInt(match[1]) * units[match[2]];
  }

  /**
   * Get user preferences by category
   */
  async getUserPreferences(userId, category = null) {
    let query = this.db('user_preferences').where({ user_id: userId });

    if (category) {
      query = query.where({ category });
    }

    const preferences = await query;

    // Group by category
    const grouped = {};
    preferences.forEach(pref => {
      if (!grouped[pref.category]) {
        grouped[pref.category] = {};
      }
      grouped[pref.category][pref.key] = pref.value;
    });

    return category ? grouped[category] || {} : grouped;
  }

  /**
   * Update user preference
   */
  async updateUserPreference(userId, category, key, value, description = null) {
    await this.db('user_preferences')
      .insert({
        user_id: userId,
        category,
        key,
        value: JSON.stringify(value),
        description
      })
      .onConflict(['user_id', 'category', 'key'])
      .merge({
        value: JSON.stringify(value),
        updated_at: this.db.fn.now()
      });
  }

  /**
   * Update user profile information
   */
  async updateProfile(userId, profileData) {
    const trx = await this.db.transaction();

    try {
      const { firstName, lastName, email, company, phone } = profileData;

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Invalid email format');
        }

        // Check if email is already taken by another user
        const existingUser = await trx('users')
          .where({ email })
          .andWhere('id', '!=', userId)
          .first();

        if (existingUser) {
          throw new Error('Email already in use by another account');
        }
      }

      // Build update object with only provided fields
      const updateData = {
        updated_at: trx.fn.now()
      };

      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (email !== undefined) updateData.email = email;
      if (company !== undefined) updateData.company = company;
      if (phone !== undefined) updateData.phone = phone;

      // Generate display_name if firstName or lastName changed
      if (firstName !== undefined || lastName !== undefined) {
        const currentUser = await trx('users').where({ id: userId }).first();
        const newFirstName = firstName !== undefined ? firstName : currentUser.first_name;
        const newLastName = lastName !== undefined ? lastName : currentUser.last_name;
        updateData.display_name = `${newFirstName || ''} ${newLastName || ''}`.trim();
      }

      // Update user profile
      await trx('users')
        .where({ id: userId })
        .update(updateData);


      await trx.commit();

      // Get updated user profile
      const updatedUser = await this.db('users')
        .where({ id: userId })
        .select('id', 'email', 'first_name', 'last_name', 'display_name', 'company', 'phone', 'email_verified', 'created_at', 'updated_at')
        .first();

      return updatedUser;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Check if user has permission to access shopping list
   */
  async checkShoppingListPermission(userId, shoppingListId, requiredPermission = 'view') {
    const permission = await this.db('shopping_lists as sl')
      .leftJoin('sharing_permissions as sp', function() {
        this.on('sl.id', '=', 'sp.shopping_list_id')
          .andOn('sp.user_id', '=', userId)
          .andOn('sp.is_active', '=', true);
      })
      .where('sl.id', shoppingListId)
      .where(function() {
        this.where('sl.user_id', userId)
          .orWhere('sl.created_by_user_id', userId)
          .orWhere('sl.allow_anonymous_access', true)
          .orWhereNotNull('sp.id');
      })
      .select(
        'sl.*',
        this.db.raw(`
          CASE
            WHEN sl.user_id = ? OR sl.created_by_user_id = ? THEN 'admin'
            ELSE COALESCE(sp.permission_level, 'view')
          END as user_permission
        `, [userId, userId])
      )
      .first();

    if (!permission) {
      return { hasAccess: false, permission: null };
    }

    const permissionLevels = { view: 1, edit: 2, admin: 3 };
    const userLevel = permissionLevels[permission.user_permission] || 0;
    const requiredLevel = permissionLevels[requiredPermission] || 0;

    return {
      hasAccess: userLevel >= requiredLevel,
      permission: permission.user_permission,
      shoppingList: permission
    };
  }
}

module.exports = AuthenticationService;