/**
 * Rename shopping_lists.name column to title for consistency
 * The application code expects 'title' but the original schema used 'name'
 */

exports.up = async function(knex) {
  console.log('🔧 Renaming shopping_lists.name column to title...');

  // Check if 'name' column exists and 'title' doesn't exist
  const hasName = await knex.schema.hasColumn('shopping_lists', 'name');
  const hasTitle = await knex.schema.hasColumn('shopping_lists', 'title');

  if (hasName && !hasTitle) {
    // Rename the column from 'name' to 'title'
    await knex.schema.alterTable('shopping_lists', function(table) {
      table.renameColumn('name', 'title');
    });
    console.log('   ✅ Renamed name column to title in shopping_lists');
  } else if (hasTitle) {
    console.log('   ℹ️  title column already exists in shopping_lists');
  } else if (!hasName) {
    // If neither exists, add the title column
    await knex.schema.alterTable('shopping_lists', function(table) {
      table.string('title', 255).notNullable().defaultTo('Shopping List');
    });
    console.log('   ✅ Added title column to shopping_lists');
  }

  console.log('✅ Shopping lists title column migration completed');
};

exports.down = async function(knex) {
  // Rename back to 'name' if rolling back
  const hasTitle = await knex.schema.hasColumn('shopping_lists', 'title');
  const hasName = await knex.schema.hasColumn('shopping_lists', 'name');

  if (hasTitle && !hasName) {
    await knex.schema.alterTable('shopping_lists', function(table) {
      table.renameColumn('title', 'name');
    });
    console.log('✅ Renamed title column back to name in shopping_lists');
  }
};