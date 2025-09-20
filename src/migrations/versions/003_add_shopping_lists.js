/**
 * Add shopping lists functionality
 * Creates tables for shared shopping lists and items
 * Based on scripts/migrate-to-railway.js shopping_lists logic
 */

exports.up = async function(knex) {
  // Create shopping_lists table
  await knex.schema.createTable('shopping_lists', function(table) {
    table.increments('id').primary();
    table.string('share_id', 36).unique().notNullable(); // UUID for sharing
    table.string('name', 255).notNullable();
    table.json('picklist_data'); // Store the original picklist data
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create shopping_list_items table
  await knex.schema.createTable('shopping_list_items', function(table) {
    table.increments('id').primary();
    table.integer('shopping_list_id').unsigned().notNullable();
    table.integer('item_index').notNullable(); // Position in original picklist
    table.integer('requested_quantity').defaultTo(1).notNullable();
    table.integer('purchased_quantity').defaultTo(0).notNullable();
    table.boolean('is_completed').defaultTo(false);
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraint
    table.foreign('shopping_list_id').references('id').inTable('shopping_lists').onDelete('CASCADE');

    // Index for efficient lookups
    table.index(['shopping_list_id', 'item_index']);
  });

  // Create indexes for better performance
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_share_id
    ON shopping_lists(share_id)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id
    ON shopping_list_items(shopping_list_id)
  `);

  console.log('✅ Shopping lists migration completed');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('shopping_list_items');
  await knex.schema.dropTableIfExists('shopping_lists');
  console.log('✅ Shopping lists migration rolled back');
};