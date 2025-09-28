/**
 * Add comprehensive user authentication system
 * Creates users, sessions, API keys, OAuth accounts, audit logs, and user preferences
 * Modifies existing tables to support user ownership and sharing
 * Maintains backward compatibility with existing shareId system
 */

exports.up = async function(knex) {
  // Create users table - core user management
  await knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255); // nullable for OAuth-only users
    table.string('display_name', 100).notNullable();
    table.string('first_name', 50);
    table.string('last_name', 50);
    table.string('profile_picture_url', 500);
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('email_verified_at');
    table.boolean('is_active').defaultTo(true);
    table.enum('role', ['user', 'admin', 'system']).defaultTo('user');
    table.timestamp('last_login_at');
    table.string('timezone', 50).defaultTo('UTC');
    table.json('preferences'); // User-specific settings
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create system user for backward compatibility
  await knex('users').insert({
    id: 1,
    email: 'system@auto-picklist.internal',
    display_name: 'System User',
    role: 'system',
    is_active: true,
    email_verified: true,
    email_verified_at: knex.fn.now()
  });

  // Create user_sessions table - JWT session management
  await knex.schema.createTable('user_sessions', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('session_token', 255).unique().notNullable(); // JWT jti claim
    table.string('refresh_token', 255).unique(); // For token refresh
    table.string('device_info', 500); // User agent, IP, etc.
    table.string('ip_address', 45); // IPv4/IPv6 support
    table.timestamp('expires_at').notNullable();
    table.timestamp('last_used_at').defaultTo(knex.fn.now());
    table.boolean('is_revoked').defaultTo(false);
    table.timestamp('revoked_at');
    table.string('revoked_reason', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create api_keys table - CLI and programmatic access
  await knex.schema.createTable('api_keys', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('key_name', 100).notNullable(); // User-friendly name
    table.string('key_hash', 255).unique().notNullable(); // Hashed API key
    table.string('key_prefix', 10).notNullable(); // First few chars for display
    table.json('scopes'); // Permissions array ['read', 'write', 'admin']
    table.integer('rate_limit_per_hour').defaultTo(1000);
    table.timestamp('last_used_at');
    table.string('last_used_ip', 45);
    table.timestamp('expires_at'); // nullable for non-expiring keys
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Unique constraint for user + key name
    table.unique(['user_id', 'key_name']);
  });

  // Create oauth_accounts table - Google/Microsoft integration
  await knex.schema.createTable('oauth_accounts', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.enum('provider', ['google', 'microsoft', 'github']).notNullable();
    table.string('provider_user_id', 255).notNullable(); // OAuth provider's user ID
    table.string('provider_email', 255); // Email from OAuth provider
    table.string('access_token', 1000); // Encrypted OAuth access token
    table.string('refresh_token', 1000); // Encrypted OAuth refresh token
    table.timestamp('token_expires_at');
    table.json('provider_data'); // Additional data from provider
    table.timestamp('connected_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at');
    table.boolean('is_active').defaultTo(true);

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Unique constraint for provider + provider_user_id
    table.unique(['provider', 'provider_user_id']);
  });

  // Create user_preferences table - Extended user settings
  await knex.schema.createTable('user_preferences', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('category', 50).notNullable(); // 'matching', 'ui', 'notifications', etc.
    table.string('key', 100).notNullable(); // Preference name
    table.json('value').notNullable(); // Preference value (flexible JSON)
    table.text('description'); // Human-readable description
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Unique constraint for user + category + key
    table.unique(['user_id', 'category', 'key']);
  });

  // Create security_audit_log table - Security event tracking
  await knex.schema.createTable('security_audit_log', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned(); // nullable for anonymous events
    table.enum('event_type', [
      'login_success', 'login_failed', 'logout', 'password_change',
      'email_change', 'account_created', 'account_deleted', 'account_locked',
      'api_key_created', 'api_key_revoked', 'oauth_connected', 'oauth_disconnected',
      'permission_change', 'suspicious_activity', 'data_export', 'data_import'
    ]).notNullable();
    table.string('ip_address', 45);
    table.string('user_agent', 1000);
    table.string('session_id', 255); // Link to user_sessions
    table.json('event_data'); // Additional event-specific data
    table.enum('severity', ['low', 'medium', 'high', 'critical']).defaultTo('low');
    table.boolean('requires_review').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign key constraints (nullable user_id for anonymous events)
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
  });

  // Modify existing shopping_lists table to add user ownership
  await knex.schema.alterTable('shopping_lists', function(table) {
    table.integer('user_id').unsigned(); // nullable for backward compatibility
    table.integer('created_by_user_id').unsigned(); // Track creator separately
    table.enum('visibility', ['private', 'shared', 'public']).defaultTo('private');
    table.json('shared_with'); // Array of user IDs or email addresses
    table.boolean('allow_anonymous_access').defaultTo(true); // Backward compatibility
    table.string('description', 500); // Optional list description
    table.json('settings'); // List-specific settings (e.g., auto-complete items)

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.foreign('created_by_user_id').references('id').inTable('users').onDelete('SET NULL');
  });

  // Migrate existing shopping lists to system user
  await knex('shopping_lists').update({
    user_id: 1,
    created_by_user_id: 1,
    visibility: 'shared',
    allow_anonymous_access: true
  });

  // Create sharing_permissions table - Granular sharing control
  await knex.schema.createTable('sharing_permissions', function(table) {
    table.increments('id').primary();
    table.integer('shopping_list_id').unsigned().notNullable();
    table.integer('user_id').unsigned(); // nullable for email-based sharing
    table.string('shared_with_email', 255); // For sharing with non-users
    table.enum('permission_level', ['view', 'edit', 'admin']).defaultTo('view');
    table.integer('granted_by_user_id').unsigned().notNullable();
    table.timestamp('granted_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at'); // Optional expiration
    table.timestamp('last_accessed_at');
    table.boolean('is_active').defaultTo(true);

    // Foreign key constraints
    table.foreign('shopping_list_id').references('id').inTable('shopping_lists').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('granted_by_user_id').references('id').inTable('users').onDelete('CASCADE');

    // Ensure one permission per user per list
    table.unique(['shopping_list_id', 'user_id']);
    table.unique(['shopping_list_id', 'shared_with_email']);
  });

  // Create password_reset_tokens table - Secure password reset
  await knex.schema.createTable('password_reset_tokens', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('token_hash', 255).unique().notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_used').defaultTo(false);
    table.timestamp('used_at');
    table.string('ip_address', 45);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create email_verification_tokens table - Email verification
  await knex.schema.createTable('email_verification_tokens', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('token_hash', 255).unique().notNullable();
    table.string('email', 255).notNullable(); // Allow email changes
    table.timestamp('expires_at').notNullable();
    table.boolean('is_used').defaultTo(false);
    table.timestamp('used_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // Create comprehensive indexes for performance

  // Users table indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at)');

  // User sessions indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refresh_token)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_revoked, expires_at) WHERE is_revoked = false');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)');

  // API keys indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(user_id, is_active) WHERE is_active = true');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at)');

  // OAuth accounts indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_oauth_accounts_email ON oauth_accounts(provider_email)');

  // User preferences indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(user_id, category)');

  // Security audit log indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_log(event_type)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log(created_at)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON security_audit_log(severity, requires_review)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_security_audit_ip ON security_audit_log(ip_address)');

  // Shopping lists indexes (updated)
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_by ON shopping_lists(created_by_user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_shopping_lists_visibility ON shopping_lists(visibility)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_shopping_lists_anonymous ON shopping_lists(allow_anonymous_access) WHERE allow_anonymous_access = true');

  // Sharing permissions indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sharing_permissions_list_id ON sharing_permissions(shopping_list_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sharing_permissions_user_id ON sharing_permissions(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sharing_permissions_email ON sharing_permissions(shared_with_email)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sharing_permissions_active ON sharing_permissions(shopping_list_id, is_active) WHERE is_active = true');

  // Password reset tokens indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token_hash)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at)');

  // Email verification tokens indexes
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification_tokens(user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token_hash)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_tokens(expires_at)');

  // Enable Row Level Security (RLS) on sensitive tables
  // Create database roles for RLS (if they don't exist)
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
        CREATE ROLE anonymous;
      END IF;
    END
    $$;
  `);

  // Enable Row Level Security
  await knex.schema.raw('ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE sharing_permissions ENABLE ROW LEVEL SECURITY');

  // Create RLS policies for shopping_lists
  await knex.schema.raw(`
    CREATE POLICY shopping_lists_user_access ON shopping_lists
    FOR ALL TO authenticated
    USING (
      user_id = current_setting('app.current_user_id')::int OR
      created_by_user_id = current_setting('app.current_user_id')::int OR
      allow_anonymous_access = true OR
      id IN (
        SELECT shopping_list_id FROM sharing_permissions
        WHERE user_id = current_setting('app.current_user_id')::int
        AND is_active = true
      )
    )
  `);

  // Create RLS policy for shopping_list_items
  await knex.schema.raw(`
    CREATE POLICY shopping_list_items_access ON shopping_list_items
    FOR ALL TO authenticated
    USING (
      shopping_list_id IN (
        SELECT id FROM shopping_lists
        WHERE user_id = current_setting('app.current_user_id')::int OR
              created_by_user_id = current_setting('app.current_user_id')::int OR
              allow_anonymous_access = true OR
              id IN (
                SELECT shopping_list_id FROM sharing_permissions
                WHERE user_id = current_setting('app.current_user_id')::int
                AND is_active = true
              )
      )
    )
  `);

  // Create RLS policy for user_preferences
  await knex.schema.raw(`
    CREATE POLICY user_preferences_own_access ON user_preferences
    FOR ALL TO authenticated
    USING (user_id = current_setting('app.current_user_id')::int)
  `);

  // Create view for user shopping lists with permissions
  await knex.schema.raw(`
    CREATE OR REPLACE VIEW user_shopping_lists AS
    SELECT
      sl.*,
      CASE
        WHEN sl.user_id = sp.user_id OR sl.created_by_user_id = sp.user_id THEN 'admin'
        ELSE COALESCE(sp.permission_level, 'view')
      END as user_permission,
      u_owner.display_name as owner_name,
      u_creator.display_name as creator_name
    FROM shopping_lists sl
    LEFT JOIN sharing_permissions sp ON sl.id = sp.shopping_list_id AND sp.is_active = true
    LEFT JOIN users u_owner ON sl.user_id = u_owner.id
    LEFT JOIN users u_creator ON sl.created_by_user_id = u_creator.id
    WHERE sl.allow_anonymous_access = true OR sp.user_id IS NOT NULL
  `);

  // Create function to automatically update updated_at timestamps
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  // Create triggers for updated_at columns
  const tablesWithUpdatedAt = ['users', 'api_keys', 'user_preferences', 'shopping_lists'];
  for (const tableName of tablesWithUpdatedAt) {
    await knex.schema.raw(`
      CREATE TRIGGER update_${tableName}_updated_at
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  // Insert default user preferences for system user
  const defaultPreferences = [
    { user_id: 1, category: 'matching', key: 'strategy', value: JSON.stringify('hybrid'), description: 'Default matching strategy' },
    { user_id: 1, category: 'matching', key: 'fuzzy_threshold', value: JSON.stringify(0.8), description: 'Fuzzy matching threshold' },
    { user_id: 1, category: 'ui', key: 'theme', value: JSON.stringify('light'), description: 'UI theme preference' },
    { user_id: 1, category: 'ui', key: 'items_per_page', value: JSON.stringify(50), description: 'Items per page in lists' },
    { user_id: 1, category: 'notifications', key: 'email_updates', value: JSON.stringify(false), description: 'Email notification preference' }
  ];

  await knex('user_preferences').insert(defaultPreferences);

  console.log('✅ User authentication migration completed');
  console.log('✅ System user created with ID 1');
  console.log('✅ Existing shopping lists migrated to system user');
  console.log('✅ Row-level security policies enabled');
  console.log('✅ Performance indexes created');
  console.log('✅ Audit logging system ready');
};

exports.down = async function(knex) {
  // Drop triggers first
  const tablesWithUpdatedAt = ['users', 'api_keys', 'user_preferences', 'shopping_lists'];
  for (const tableName of tablesWithUpdatedAt) {
    await knex.schema.raw(`DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${tableName}`);
  }

  // Drop function
  await knex.schema.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');

  // Drop views
  await knex.schema.raw('DROP VIEW IF EXISTS user_shopping_lists');

  // Disable RLS before dropping tables
  await knex.schema.raw('ALTER TABLE shopping_lists DISABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE shopping_list_items DISABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE sharing_permissions DISABLE ROW LEVEL SECURITY');

  // Remove added columns from shopping_lists (reverse order)
  await knex.schema.alterTable('shopping_lists', function(table) {
    table.dropForeign(['user_id']);
    table.dropForeign(['created_by_user_id']);
    table.dropColumn('user_id');
    table.dropColumn('created_by_user_id');
    table.dropColumn('visibility');
    table.dropColumn('shared_with');
    table.dropColumn('allow_anonymous_access');
    table.dropColumn('description');
    table.dropColumn('settings');
  });

  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('email_verification_tokens');
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('sharing_permissions');
  await knex.schema.dropTableIfExists('security_audit_log');
  await knex.schema.dropTableIfExists('user_preferences');
  await knex.schema.dropTableIfExists('oauth_accounts');
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('users');

  // Clean up database roles (only if they exist and no dependencies)
  await knex.schema.raw(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        DROP ROLE authenticated;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
        DROP ROLE anonymous;
      END IF;
    EXCEPTION
      WHEN dependent_objects_still_exist THEN
        RAISE NOTICE 'Cannot drop roles - dependent objects exist';
    END
    $$;
  `);

  console.log('✅ User authentication migration rolled back');
};