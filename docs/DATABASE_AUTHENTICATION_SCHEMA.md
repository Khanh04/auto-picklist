# Database Authentication Schema Design

## Overview

This document describes the comprehensive user authentication system added to the auto-picklist application. The design maintains backward compatibility while adding robust security features, user management, and granular access controls.

## Core Design Principles

1. **Backward Compatibility**: Existing shareId system continues to work
2. **Security First**: Row-level security, audit logging, secure token management
3. **Scalability**: Designed for Railway deployment with connection pooling optimization
4. **Flexibility**: Supports multiple authentication methods (email/password, OAuth, API keys)
5. **Privacy**: Granular permissions and data isolation

## Database Schema

### Core User Management

#### `users` Table
Primary user account storage with comprehensive profile management:

```sql
- id (PK): Auto-incrementing user identifier
- email: Unique user email (authentication credential)
- password_hash: Bcrypt hashed password (nullable for OAuth-only users)
- display_name: User's preferred display name
- first_name, last_name: Optional profile information
- profile_picture_url: Avatar/profile image URL
- email_verified: Email verification status
- is_active: Account status (for soft deactivation)
- role: ['user', 'admin', 'system'] - Role-based access control
- last_login_at: Track user activity
- timezone: User's preferred timezone
- preferences: JSON field for user-specific settings
```

**Key Features:**
- System user (ID: 1) for backward compatibility
- Support for OAuth-only accounts (no password)
- Soft delete capability with `is_active` flag
- Timezone support for internationalization

### Session Management

#### `user_sessions` Table
JWT session tracking with comprehensive security features:

```sql
- session_token: JWT jti claim for session identification
- refresh_token: Secure token refresh mechanism
- device_info: User agent, device fingerprinting
- ip_address: IPv4/IPv6 support for security tracking
- expires_at: Session expiration management
- is_revoked: Immediate session invalidation
- revoked_reason: Audit trail for session termination
```

**Security Features:**
- Token rotation on refresh
- Device tracking for suspicious activity detection
- IP-based session validation
- Graceful session revocation

### API Access

#### `api_keys` Table
Secure CLI and programmatic access:

```sql
- key_name: User-friendly identifier
- key_hash: Securely hashed API key
- key_prefix: Display-safe key preview
- scopes: JSON array of permissions ['read', 'write', 'admin']
- rate_limit_per_hour: Per-key rate limiting
- expires_at: Optional key expiration
```

**Features:**
- Scope-based permissions
- Rate limiting per key
- Usage tracking and analytics
- Secure key storage (hashed, never plain text)

### OAuth Integration

#### `oauth_accounts` Table
Multi-provider OAuth support:

```sql
- provider: ['google', 'microsoft', 'github']
- provider_user_id: OAuth provider's user identifier
- access_token, refresh_token: Encrypted OAuth tokens
- provider_data: Additional provider information
```

**Supported Providers:**
- Google OAuth 2.0
- Microsoft Azure AD
- GitHub (future expansion)

### User Preferences

#### `user_preferences` Table
Hierarchical preference management:

```sql
- category: Preference grouping ('matching', 'ui', 'notifications')
- key: Specific preference name
- value: JSON value (flexible data types)
- description: Human-readable documentation
```

**Preference Categories:**
- `matching`: Algorithm preferences, thresholds
- `ui`: Theme, layout, pagination settings
- `notifications`: Email, push notification preferences
- `privacy`: Data sharing, analytics opt-out

### Security & Audit

#### `security_audit_log` Table
Comprehensive security event tracking:

```sql
Event Types:
- Authentication: login_success, login_failed, logout
- Account Management: password_change, account_created, account_deleted
- API Access: api_key_created, api_key_revoked
- OAuth: oauth_connected, oauth_disconnected
- Security: suspicious_activity, permission_change
- Data: data_export, data_import
```

**Audit Features:**
- IP address and user agent tracking
- Severity classification (low, medium, high, critical)
- Review flagging for suspicious activities
- Session correlation for forensic analysis

### Enhanced Shopping Lists

#### Modified `shopping_lists` Table
Extended with user ownership and sharing:

```sql
- user_id: Current owner (nullable for backward compatibility)
- created_by_user_id: Original creator tracking
- visibility: ['private', 'shared', 'public']
- shared_with: JSON array of user IDs/emails
- allow_anonymous_access: Backward compatibility flag
- description: Optional list description
- settings: List-specific configuration
```

#### `sharing_permissions` Table
Granular access control:

```sql
- permission_level: ['view', 'edit', 'admin']
- shared_with_email: Share with non-registered users
- granted_by_user_id: Permission delegation tracking
- expires_at: Time-limited access
- last_accessed_at: Usage analytics
```

### Security Token Management

#### `password_reset_tokens` Table
Secure password reset workflow:

```sql
- token_hash: Securely hashed reset token
- expires_at: Token expiration (recommended: 1 hour)
- is_used: Prevent token reuse
- ip_address: Security audit trail
```

#### `email_verification_tokens` Table
Email verification and change management:

```sql
- email: Target email (supports email changes)
- token_hash: Secure verification token
- expires_at: Token expiration (recommended: 24 hours)
```

## Row-Level Security (RLS)

### Enabled Tables
- `shopping_lists`
- `shopping_list_items`
- `user_preferences`
- `sharing_permissions`

### Security Policies

#### Shopping Lists Access
Users can access lists where they are:
1. Owner (`user_id` match)
2. Creator (`created_by_user_id` match)
3. Anonymous access enabled (`allow_anonymous_access = true`)
4. Explicitly shared (`sharing_permissions` entry)

#### Data Isolation
- Users see only their own preferences
- Sharing permissions scoped to granted access
- System user (ID: 1) has elevated access for backward compatibility

## Performance Optimization

### Strategic Indexing

#### High-Performance Queries
- `idx_users_email`: Fast authentication lookups
- `idx_user_sessions_active`: Active session queries
- `idx_api_keys_hash`: API key validation
- `idx_shopping_lists_user_id`: User's list retrieval
- `idx_security_audit_*`: Security monitoring queries

#### Composite Indexes
- `(user_id, category)` on user_preferences
- `(shopping_list_id, is_active)` on sharing_permissions
- `(user_id, is_revoked, expires_at)` on user_sessions

### Query Optimization
- Partial indexes for active records only
- GIN indexes for JSON preference searches
- Proper foreign key indexes for JOIN operations

## Migration Strategy

### Backward Compatibility

1. **System User Creation**: All existing data migrated to system user (ID: 1)
2. **Anonymous Access**: Existing shopping lists maintain `allow_anonymous_access = true`
3. **ShareId Preservation**: Original shareId system continues to function
4. **Graceful Degradation**: Unauthenticated users retain full functionality

### Data Migration Steps

1. Create system user account
2. Migrate existing shopping lists to system ownership
3. Enable anonymous access for all existing lists
4. Preserve existing shareId functionality
5. Apply RLS policies with backward compatibility

## Security Considerations

### Authentication Security

#### Password Security
- Bcrypt hashing with configurable rounds
- Password complexity requirements (configurable)
- Secure password reset with time-limited tokens
- Prevention of password reuse

#### Session Security
- JWT with short expiration times
- Refresh token rotation
- Device fingerprinting
- IP address validation
- Session revocation capabilities

#### API Key Security
- Cryptographically secure key generation
- Secure hashing (never store plain text)
- Scope-based access control
- Rate limiting per key
- Usage monitoring and alerts

### Data Protection

#### Encryption at Rest
- OAuth tokens encrypted in database
- Sensitive user data properly secured
- Audit logs with IP address tracking

#### Access Control
- Row-level security policies
- Granular sharing permissions
- Time-limited access grants
- Permission delegation tracking

### Audit & Compliance

#### Security Monitoring
- Comprehensive event logging
- Severity-based alerting
- IP-based anomaly detection
- Session correlation for forensics

#### Privacy Compliance
- User data export capabilities
- Account deletion with data cleanup
- Audit trail preservation
- Consent tracking mechanisms

## Railway Deployment Considerations

### Connection Pool Optimization
- Efficient index design for limited connections
- Proper foreign key constraints
- Optimized RLS policies
- Minimal JOIN complexity in views

### Environment Security
- Environment variable management
- SSL/TLS enforcement
- Secure token generation
- Rate limiting configuration

## Usage Examples

### User Registration Flow
```sql
-- Create user account
INSERT INTO users (email, password_hash, display_name, email_verified)
VALUES ('user@example.com', '$2b$12$...', 'John Doe', false);

-- Create email verification token
INSERT INTO email_verification_tokens (user_id, token_hash, email, expires_at)
VALUES (1, '$2b$12$...', 'user@example.com', NOW() + INTERVAL '24 hours');
```

### Shopping List Sharing
```sql
-- Share list with specific user
INSERT INTO sharing_permissions (shopping_list_id, user_id, permission_level, granted_by_user_id)
VALUES (1, 2, 'edit', 1);

-- Share with email (pre-registration)
INSERT INTO sharing_permissions (shopping_list_id, shared_with_email, permission_level, granted_by_user_id)
VALUES (1, 'friend@example.com', 'view', 1);
```

### API Key Management
```sql
-- Create CLI API key
INSERT INTO api_keys (user_id, key_name, key_hash, key_prefix, scopes, rate_limit_per_hour)
VALUES (1, 'CLI Access', '$2b$12$...', 'ak_test_', '["read", "write"]', 1000);
```

This schema provides a robust foundation for user authentication while maintaining the flexibility and backward compatibility required for the auto-picklist system.