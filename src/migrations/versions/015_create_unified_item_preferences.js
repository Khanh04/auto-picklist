/**
 * Create unified item preferences table
 * Consolidates matching_preferences and supplier_preferences into a single table
 * that directly maps item_name -> {product_id, supplier_id}
 */

exports.up = async function(knex) {
  // Create the new unified item_preferences table
  await knex.schema.createTable('item_preferences', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.text('original_item').notNullable();
    table.integer('product_id').unsigned().notNullable();
    table.integer('supplier_id').unsigned().notNullable();
    table.integer('frequency').defaultTo(1);
    table.timestamp('last_used').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('product_id').references('id').inTable('products');
    table.foreign('supplier_id').references('id').inTable('suppliers');

    // Unique constraint: one preference per user per item
    table.unique(['user_id', 'original_item']);
  });

  // Create indexes for better performance
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_item_preferences_user_item
    ON item_preferences(user_id, original_item)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_item_preferences_product_id
    ON item_preferences(product_id)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_item_preferences_supplier_id
    ON item_preferences(supplier_id)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_item_preferences_last_used
    ON item_preferences(last_used DESC)
  `);

  console.log('✅ Created unified item_preferences table with indexes');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('item_preferences');
  console.log('✅ Dropped item_preferences table');
};