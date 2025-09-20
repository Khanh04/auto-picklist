/**
 * Add supplier preferences table
 * Allows users to save and learn from manual supplier selections
 * Always prioritizes user choice over system optimization
 */

exports.up = async function(knex) {
  // Drop existing supplier_preferences table if it exists (old structure)
  await knex.schema.dropTableIfExists('supplier_preferences');

  // Create supplier_preferences table with new structure
  await knex.schema.createTable('supplier_preferences', function(table) {
    table.increments('id').primary();
    table.text('original_item').notNullable();
    table.integer('matched_product_id').unsigned();
    table.integer('preferred_supplier_id').unsigned().notNullable();
    table.integer('frequency').defaultTo(1);
    table.timestamp('last_used').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key constraints
    table.foreign('matched_product_id').references('id').inTable('products').onDelete('SET NULL');
    table.foreign('preferred_supplier_id').references('id').inTable('suppliers').onDelete('CASCADE');

    // Unique constraint to prevent duplicate preferences
    table.unique(['original_item', 'matched_product_id', 'preferred_supplier_id']);
  });

  // Create indexes for better performance
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_supplier_preferences_original_item
    ON supplier_preferences(original_item)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_supplier_preferences_product_id
    ON supplier_preferences(matched_product_id)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_supplier_preferences_supplier_id
    ON supplier_preferences(preferred_supplier_id)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_supplier_preferences_frequency
    ON supplier_preferences(frequency DESC)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_supplier_preferences_last_used
    ON supplier_preferences(last_used DESC)
  `);

  console.log('✅ Supplier preferences migration completed');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('supplier_preferences');
  console.log('✅ Supplier preferences migration rolled back');
};