/**
 * Add matching preferences table
 * Allows users to save and learn from manual item selections
 * Based on scripts/migrate-to-railway.js matching_preferences logic
 */

exports.up = async function(knex) {
  await knex.schema.createTable('matching_preferences', function(table) {
    table.increments('id').primary();
    table.text('original_item').notNullable();
    table.integer('matched_product_id').unsigned().notNullable();
    table.integer('frequency').defaultTo(1);
    table.timestamp('last_used').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign key constraint
    table.foreign('matched_product_id').references('id').inTable('products');

    // Unique constraint to prevent duplicate preferences
    table.unique(['original_item', 'matched_product_id']);
  });

  // Create indexes for better performance
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_matching_preferences_original_item
    ON matching_preferences(original_item)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_matching_preferences_product_id
    ON matching_preferences(matched_product_id)
  `);

  console.log('✅ Matching preferences migration completed');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('matching_preferences');
  console.log('✅ Matching preferences migration rolled back');
};