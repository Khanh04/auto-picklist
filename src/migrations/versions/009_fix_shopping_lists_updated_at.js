/**
 * Fix shopping_lists table missing updated_at column
 * The trigger update_shopping_lists_updated_at expects this column to exist
 */

exports.up = async function(knex) {
  console.log('🔧 Adding missing updated_at column to shopping_lists table...');

  // Check if updated_at column exists
  const hasUpdatedAt = await knex.schema.hasColumn('shopping_lists', 'updated_at');

  if (!hasUpdatedAt) {
    // Add the missing updated_at column
    await knex.schema.alterTable('shopping_lists', function(table) {
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    console.log('   ✅ Added updated_at column to shopping_lists');

    // Update existing records to have the same updated_at as created_at
    await knex.raw(`
      UPDATE shopping_lists
      SET updated_at = created_at
      WHERE updated_at IS NULL
    `);

    console.log('   ✅ Set updated_at for existing records');
  } else {
    console.log('   ℹ️  updated_at column already exists');
  }

  console.log('✅ Shopping lists updated_at column fix completed');
};

exports.down = async function(knex) {
  // Check if updated_at column exists before trying to drop it
  const hasUpdatedAt = await knex.schema.hasColumn('shopping_lists', 'updated_at');

  if (hasUpdatedAt) {
    await knex.schema.alterTable('shopping_lists', function(table) {
      table.dropColumn('updated_at');
    });
    console.log('✅ Dropped updated_at column from shopping_lists');
  }
};