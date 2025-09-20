# Integrating Existing Database with Knex Migrations

This guide helps you migrate from the old database setup scripts to the new Knex.js migration system while preserving your existing data.

## 🔍 **Before You Start**

### Check Your Current Setup
```bash
# Check if you have existing data
npm run migrate:status

# If you see "Knex migration table does not exist" or similar errors,
# you need to integrate your existing database
```

## 🚀 **Integration Process**

### Option 1: Automatic Integration (Recommended)

Run the integration script that will analyze your database and set up Knex tracking:

```bash
# This will automatically handle the integration
npm run migrate:integrate
```

**What this does:**
1. ✅ Checks for existing database tables and data
2. ✅ Sets up Knex migration tracking tables
3. ✅ Marks existing schema as "already migrated"
4. ✅ Applies any new pending migrations
5. ✅ Validates the final state

### Option 2: Manual Integration

If you prefer manual control:

#### Step 1: Backup Your Database
```bash
# Create a backup first (IMPORTANT!)
pg_dump -h localhost -U $USER -d autopicklist > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Step 2: Set Up Migration Tracking
```bash
# Initialize Knex migration table
npm run migrate

# This will fail initially because tables exist, but creates the tracking table
```

#### Step 3: Mark Existing Migrations as Complete
```sql
-- Connect to your database and run:
psql -h localhost -U $USER -d autopicklist

-- Mark baseline migrations as completed
INSERT INTO knex_migrations (name, batch, migration_time) VALUES
  ('001_initial_schema.js', 1, NOW()),
  ('002_add_matching_preferences.js', 1, NOW()),
  ('003_add_shopping_lists.js', 1, NOW());
```

#### Step 4: Verify Integration
```bash
npm run migrate:status
npm run migrate:validate
```

## 🛠 **Database State Scenarios**

### Scenario A: Fresh Database
If your database is empty or only has basic structure:
```bash
# Just run migrations normally
npm run migrate
```

### Scenario B: Database with Old Setup Scripts
If you have data from the old `scripts/setup-database.js`:
```bash
# Use the integration script
npm run migrate:integrate
```

### Scenario C: Partially Migrated Database
If you've already started using Knex but have issues:
```bash
# Check current state
npm run migrate:status

# Run integration to fix any issues
npm run migrate:integrate
```

## 🔧 **Troubleshooting**

### "Table already exists" Error
```bash
# The integration script handles this automatically
npm run migrate:integrate
```

### "Migration table not found" Error
```bash
# Your database needs integration
npm run migrate:integrate
```

### "No migrations to run" but Database is Empty
```bash
# Reset migration tracking and run fresh
psql -h localhost -U $USER -d autopicklist -c "DROP TABLE IF EXISTS knex_migrations, knex_migrations_lock;"
npm run migrate
```

### Production Database Integration
```bash
# ALWAYS backup first in production!
pg_dump $DATABASE_URL > production_backup_$(date +%Y%m%d_%H%M%S).sql

# Then run integration with extra care
NODE_ENV=production npm run migrate:integrate
```

## ✅ **Verification Steps**

After integration, verify everything is working:

```bash
# Check migration status
npm run migrate:status
# Should show: Current version: 003_add_shopping_lists.js

# Validate schema
npm run migrate:validate
# Should show: ✅ Database schema is valid

# Test server startup
npm start
# Should show: ✅ Database is up to date

# Test creating new migration
npm run migrate:make test_integration
npm run migrate
npm run migrate:rollback
```

## 📋 **Next Steps After Integration**

1. **Remove Old Scripts** (optional):
   - Keep `scripts/` folder for reference
   - Update documentation to use new migration commands

2. **Update Deployment Process**:
   - Railway: Migrations run automatically on startup
   - Local: Use `npm start` (auto-migrates)

3. **Team Communication**:
   - Inform team about new migration commands
   - Update development workflow documentation

## 🚨 **Important Notes**

- ⚠️ **Always backup before integration**
- ⚠️ **Test integration on development first**
- ⚠️ **The integration script is safe and non-destructive**
- ✅ **Your existing data will be preserved**
- ✅ **Old scripts remain functional as backup**

## 🆘 **Emergency Rollback**

If something goes wrong, you can restore from backup:
```bash
# Drop current database and restore from backup
dropdb autopicklist
createdb autopicklist
psql -h localhost -U $USER -d autopicklist < your_backup_file.sql
```