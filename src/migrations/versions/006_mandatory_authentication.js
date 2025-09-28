/**
 * Phase 1: Mandatory User Authentication
 *
 * Enforces user ownership on all core tables by:
 * 1. Adding user_id to supplier_preferences table with foreign key constraint
 * 2. Making shopping_lists.user_id non-nullable
 * 3. Migrating existing anonymous data to system user (ID 1)
 * 4. Adding performance indexes for user-based queries
 * 5. Ensuring data integrity with proper constraints
 *
 * This migration preserves all existing functionality while adding mandatory user ownership.
 * The system user (ID 1) becomes the owner of all existing anonymous data.
 */

exports.up = async function(knex) {
  // Validate that system user exists before proceeding
  const systemUser = await knex('users').where('id', 1).first();
  if (!systemUser) {
    throw new Error('System user (ID 1) must exist before running mandatory authentication migration. Run migration 005 first.');
  }

  console.log('✅ System user validated - proceeding with mandatory authentication migration...');

  // Begin transaction for data safety
  await knex.transaction(async (trx) => {

    // PHASE 1: Add user_id to supplier_preferences table
    console.log('📝 Adding user_id column to supplier_preferences table...');

    // Check if user_id column already exists
    const hasUserIdColumn = await trx.schema.hasColumn('supplier_preferences', 'user_id');

    if (!hasUserIdColumn) {
      await trx.schema.alterTable('supplier_preferences', function(table) {
        table.integer('user_id').unsigned().notNullable().defaultTo(1);

        // Add foreign key constraint to users table
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      });
      console.log('   ✅ Added user_id column to supplier_preferences');
    } else {
      console.log('   ⚠️  user_id column already exists in supplier_preferences');
    }

    // Migrate existing supplier preferences to system user
    console.log('📝 Migrating existing supplier preferences to system user...');
    const supplierPrefsCount = await trx('supplier_preferences').count('* as count').first();
    console.log(`   Found ${supplierPrefsCount.count} supplier preferences to migrate`);

    // All existing supplier preferences are already assigned to system user via defaultTo(1)
    // No additional data migration needed for supplier_preferences

    // PHASE 2: Handle shopping_lists user_id constraints
    console.log('📝 Ensuring all shopping lists have user ownership...');

    // First, assign any null user_id entries to system user
    const nullUserLists = await trx('shopping_lists').whereNull('user_id').count('* as count').first();
    console.log(`   Found ${nullUserLists.count} shopping lists without user ownership`);

    if (parseInt(nullUserLists.count) > 0) {
      // Temporarily disable the trigger to avoid conflicts
      await trx.raw('ALTER TABLE shopping_lists DISABLE TRIGGER update_shopping_lists_updated_at');

      try {
        await trx.raw(`
          UPDATE shopping_lists
          SET user_id = 1
          WHERE user_id IS NULL
        `);
        console.log(`   ✅ Assigned ${nullUserLists.count} shopping lists to system user`);
      } finally {
        // Re-enable the trigger
        await trx.raw('ALTER TABLE shopping_lists ENABLE TRIGGER update_shopping_lists_updated_at');
      }
    }

    // Also ensure created_by_user_id is set for any null entries
    const nullCreatorLists = await trx('shopping_lists').whereNull('created_by_user_id').count('* as count').first();
    if (parseInt(nullCreatorLists.count) > 0) {
      // Temporarily disable the trigger to avoid conflicts
      await trx.raw('ALTER TABLE shopping_lists DISABLE TRIGGER update_shopping_lists_updated_at');

      try {
        await trx.raw(`
          UPDATE shopping_lists
          SET created_by_user_id = 1
          WHERE created_by_user_id IS NULL
        `);
        console.log(`   ✅ Set creator for ${nullCreatorLists.count} shopping lists to system user`);
      } finally {
        // Re-enable the trigger
        await trx.raw('ALTER TABLE shopping_lists ENABLE TRIGGER update_shopping_lists_updated_at');
      }
    }

    // Now make user_id non-nullable
    console.log('📝 Making shopping_lists.user_id non-nullable...');

    // Drop views that depend on user_id
    await trx.raw('DROP VIEW IF EXISTS user_shopping_lists');

    // Drop RLS policies that depend on user_id
    await trx.raw('DROP POLICY IF EXISTS shopping_lists_user_access ON shopping_lists');
    await trx.raw('DROP POLICY IF EXISTS shopping_list_items_access ON shopping_list_items');

    await trx.schema.alterTable('shopping_lists', function(table) {
      table.integer('user_id').unsigned().notNullable().alter();
      table.integer('created_by_user_id').unsigned().notNullable().alter();
    });

    // Recreate RLS policies for shopping_lists
    await trx.raw(`
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

    // Recreate RLS policy for shopping_list_items
    await trx.raw(`
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

    // Recreate the user_shopping_lists view
    await trx.raw(`
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

    console.log('   ✅ User ID columns made non-nullable, RLS policies and views updated');

    // PHASE 3: Add performance indexes for user-based queries
    console.log('📝 Adding performance indexes for user-based operations...');

    // Supplier preferences indexes
    await trx.schema.raw('CREATE INDEX IF NOT EXISTS idx_supplier_preferences_user_id ON supplier_preferences(user_id)');
    await trx.schema.raw('CREATE INDEX IF NOT EXISTS idx_supplier_preferences_user_item ON supplier_preferences(user_id, original_item)');
    await trx.schema.raw('CREATE INDEX IF NOT EXISTS idx_supplier_preferences_user_product ON supplier_preferences(user_id, matched_product_id) WHERE matched_product_id IS NOT NULL');

    // Enhanced shopping lists indexes for user operations
    await trx.schema.raw('CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_created ON shopping_lists(user_id, created_at DESC)');

    // Check if updated_at column exists before creating index on it
    const hasUpdatedAt = await trx.schema.hasColumn('shopping_lists', 'updated_at');
    if (hasUpdatedAt) {
      await trx.schema.raw('CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_updated ON shopping_lists(user_id, updated_at DESC)');
    }

    await trx.schema.raw('CREATE INDEX IF NOT EXISTS idx_shopping_lists_creator_date ON shopping_lists(created_by_user_id, created_at DESC)');

    // Composite index for user access patterns
    await trx.schema.raw('CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_access ON shopping_lists(user_id, visibility, allow_anonymous_access)');

    // Shopping list items user access (via shopping list relationship)
    const itemsHasUpdatedAt = await trx.schema.hasColumn('shopping_list_items', 'updated_at');
    const itemsHasIsCompleted = await trx.schema.hasColumn('shopping_list_items', 'is_completed');

    if (itemsHasUpdatedAt && itemsHasIsCompleted) {
      await trx.schema.raw(`
        CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_access
        ON shopping_list_items(shopping_list_id, is_completed, updated_at DESC)
      `);
    } else if (itemsHasIsCompleted) {
      await trx.schema.raw(`
        CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_access
        ON shopping_list_items(shopping_list_id, is_completed)
      `);
    } else {
      await trx.schema.raw(`
        CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_access
        ON shopping_list_items(shopping_list_id)
      `);
    }

    // PHASE 4: Add unique constraint for user-specific supplier preferences
    console.log('📝 Adding unique constraints for data integrity...');

    // Check if the old unique constraint exists before trying to drop it
    const constraintInfo = await trx.raw(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'supplier_preferences'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%original_item%'
    `);

    if (constraintInfo.rows.length > 0) {
      // Drop the old unique constraint and recreate with user_id
      await trx.schema.alterTable('supplier_preferences', function(table) {
        table.dropUnique(['original_item', 'matched_product_id', 'preferred_supplier_id']);
      });
      console.log('   ✅ Dropped old unique constraint');
    }

    // Check if new constraint already exists
    const newConstraintInfo = await trx.raw(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'supplier_preferences'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'supplier_preferences_user_unique'
    `);

    if (newConstraintInfo.rows.length === 0) {
      await trx.schema.alterTable('supplier_preferences', function(table) {
        table.unique(['user_id', 'original_item', 'matched_product_id', 'preferred_supplier_id'], 'supplier_preferences_user_unique');
      });
      console.log('   ✅ Added new user-specific unique constraint');
    } else {
      console.log('   ⚠️  User-specific unique constraint already exists');
    }

    // PHASE 5: Create helper views for user data access
    console.log('📝 Creating helper views for user data access...');

    // View for user's supplier preferences with supplier details
    await trx.schema.raw(`
      CREATE OR REPLACE VIEW user_supplier_preferences AS
      SELECT
        sp.*,
        s.name as supplier_name,
        p.description as product_description
      FROM supplier_preferences sp
      JOIN suppliers s ON sp.preferred_supplier_id = s.id
      LEFT JOIN products p ON sp.matched_product_id = p.id
      ORDER BY sp.user_id, sp.frequency DESC, sp.last_used DESC
    `);

    // View for user shopping list summary (use columns that actually exist)
    await trx.schema.raw(`
      CREATE OR REPLACE VIEW user_shopping_list_summary AS
      SELECT
        sl.user_id,
        COUNT(*) as total_lists,
        COUNT(CASE WHEN sl.visibility = 'private' THEN 1 END) as private_lists,
        COUNT(CASE WHEN sl.visibility = 'shared' THEN 1 END) as shared_lists,
        COUNT(CASE WHEN sl.visibility = 'public' THEN 1 END) as public_lists,
        MAX(sl.created_at) as last_activity,
        COUNT(sli.id) as total_items
      FROM shopping_lists sl
      LEFT JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
      GROUP BY sl.user_id
    `);

    console.log('📝 Migration transaction completed successfully');
  });

  // PHASE 6: Verify data integrity after migration
  console.log('🔍 Verifying data integrity...');

  const totalUsers = await knex('users').count('* as count').first();
  const listsWithUsers = await knex('shopping_lists').count('* as count').first();
  const prefsWithUsers = await knex('supplier_preferences').count('* as count').first();
  const systemUserLists = await knex('shopping_lists').where('user_id', 1).count('* as count').first();
  const systemUserPrefs = await knex('supplier_preferences').where('user_id', 1).count('* as count').first();

  console.log('📊 Data integrity verification:');
  console.log(`   • Total users: ${totalUsers.count}`);
  console.log(`   • Shopping lists with user ownership: ${listsWithUsers.count}`);
  console.log(`   • Supplier preferences with user ownership: ${prefsWithUsers.count}`);
  console.log(`   • System user shopping lists: ${systemUserLists.count}`);
  console.log(`   • System user supplier preferences: ${systemUserPrefs.count}`);

  // Verify no orphaned data
  const orphanedLists = await knex('shopping_lists').whereNull('user_id').count('* as count').first();
  const orphanedPrefs = await knex('supplier_preferences').whereNull('user_id').count('* as count').first();

  if (parseInt(orphanedLists.count) > 0 || parseInt(orphanedPrefs.count) > 0) {
    throw new Error(`Data integrity check failed: Found ${orphanedLists.count} orphaned lists and ${orphanedPrefs.count} orphaned preferences`);
  }

  console.log('✅ Mandatory authentication migration completed successfully');
  console.log('✅ All existing data preserved and assigned to system user');
  console.log('✅ User ownership now enforced on all core tables');
  console.log('✅ Performance indexes added for user-based queries');
  console.log('✅ Data integrity verified - no orphaned records');
};

exports.down = async function(knex) {
  console.log('🔄 Rolling back mandatory authentication migration...');

  await knex.transaction(async (trx) => {
    // Drop helper views
    await trx.schema.raw('DROP VIEW IF EXISTS user_supplier_preferences');
    await trx.schema.raw('DROP VIEW IF EXISTS user_shopping_list_summary');

    // Drop indexes created by this migration
    await trx.schema.raw('DROP INDEX IF EXISTS idx_supplier_preferences_user_id');
    await trx.schema.raw('DROP INDEX IF EXISTS idx_supplier_preferences_user_item');
    await trx.schema.raw('DROP INDEX IF EXISTS idx_supplier_preferences_user_product');
    await trx.schema.raw('DROP INDEX IF EXISTS idx_shopping_lists_user_created');
    await trx.schema.raw('DROP INDEX IF EXISTS idx_shopping_lists_user_updated');
    await trx.schema.raw('DROP INDEX IF EXISTS idx_shopping_lists_creator_date');
    await trx.schema.raw('DROP INDEX IF EXISTS idx_shopping_lists_user_access');
    await trx.schema.raw('DROP INDEX IF EXISTS idx_shopping_list_items_user_access');

    // Revert supplier_preferences table changes
    const hasUserIdColumn = await trx.schema.hasColumn('supplier_preferences', 'user_id');

    if (hasUserIdColumn) {
      // Check if user-specific unique constraint exists
      const userConstraintInfo = await trx.raw(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'supplier_preferences'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'supplier_preferences_user_unique'
      `);

      if (userConstraintInfo.rows.length > 0) {
        await trx.schema.alterTable('supplier_preferences', function(table) {
          table.dropUnique(['user_id', 'original_item', 'matched_product_id', 'preferred_supplier_id']);
        });
      }

      // Drop foreign key constraint if it exists
      try {
        await trx.schema.alterTable('supplier_preferences', function(table) {
          table.dropForeign(['user_id']);
        });
      } catch (error) {
        // Foreign key might not exist if migration failed early
        console.log('   ⚠️  Foreign key constraint may not exist, continuing...');
      }

      // Drop user_id column
      await trx.schema.alterTable('supplier_preferences', function(table) {
        table.dropColumn('user_id');
      });

      // Recreate original unique constraint on supplier_preferences
      await trx.schema.alterTable('supplier_preferences', function(table) {
        table.unique(['original_item', 'matched_product_id', 'preferred_supplier_id']);
      });
    }

    // Revert shopping_lists user_id back to nullable
    await trx.schema.alterTable('shopping_lists', function(table) {
      table.integer('user_id').unsigned().nullable().alter();
      table.integer('created_by_user_id').unsigned().nullable().alter();
    });

    console.log('🔄 Rollback transaction completed');
  });

  console.log('✅ Mandatory authentication migration rolled back successfully');
  console.log('⚠️  Note: This rollback removes user ownership constraints');
  console.log('⚠️  Existing data remains but user associations are relaxed');
};