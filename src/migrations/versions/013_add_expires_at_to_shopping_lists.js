/**
 * Add missing expires_at column to shopping_lists table
 *
 * The application code expects this column to exist but it was missing from
 * the original shopping_lists migration. This adds the column with the
 * default value that matches the expected behavior.
 */

exports.up = async function(knex) {
  console.log('🔧 Adding expires_at column to shopping_lists table...');

  // Check if expires_at column already exists
  const hasExpiresAt = await knex.schema.hasColumn('shopping_lists', 'expires_at');

  if (!hasExpiresAt) {
    await knex.schema.alterTable('shopping_lists', function(table) {
      // Add expires_at column with default of 24 hours from current timestamp
      table.timestamp('expires_at')
           .defaultTo(knex.raw("CURRENT_TIMESTAMP + INTERVAL '24 hours'"))
           .notNullable();
    });

    // Update existing records to have the expires_at value
    await knex.raw(`
      UPDATE shopping_lists
      SET expires_at = created_at + INTERVAL '24 hours'
      WHERE expires_at IS NULL
    `);

    // Create index for efficient querying by expiration
    await knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_shopping_lists_expires_at
      ON shopping_lists(expires_at)
    `);

    console.log('   ✅ Added expires_at column to shopping_lists');
    console.log('   ✅ Updated existing records with expires_at values');
    console.log('   ✅ Created index on expires_at column');
  } else {
    console.log('   ℹ️  expires_at column already exists in shopping_lists');
  }

  console.log('✅ Shopping lists expires_at migration completed');
};

exports.down = async function(knex) {
  console.log('🔄 Removing expires_at column from shopping_lists table...');

  // Drop the index first
  await knex.schema.raw('DROP INDEX IF EXISTS idx_shopping_lists_expires_at');

  // Check if expires_at column exists before trying to drop it
  const hasExpiresAt = await knex.schema.hasColumn('shopping_lists', 'expires_at');

  if (hasExpiresAt) {
    await knex.schema.alterTable('shopping_lists', function(table) {
      table.dropColumn('expires_at');
    });
    console.log('   ✅ Removed expires_at column from shopping_lists');
  }

  console.log('✅ Shopping lists expires_at migration rollback completed');
};