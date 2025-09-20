/**
 * Initial database schema migration
 * Creates the core tables: suppliers, products, supplier_prices
 * Based on scripts/setup-database.js
 */

exports.up = async function(knex) {
  // Create suppliers table
  await knex.schema.createTable('suppliers', function(table) {
    table.increments('id').primary();
    table.string('name', 255).unique().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create products table
  await knex.schema.createTable('products', function(table) {
    table.increments('id').primary();
    table.text('description').notNullable().unique();
    table.text('normalized_description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create supplier_prices table (junction table)
  await knex.schema.createTable('supplier_prices', function(table) {
    table.increments('id').primary();
    table.integer('product_id').unsigned().references('id').inTable('products').onDelete('CASCADE');
    table.integer('supplier_id').unsigned().references('id').inTable('suppliers').onDelete('CASCADE');
    table.decimal('price', 10, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['product_id', 'supplier_id']);
  });

  // Create indexes for better performance
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_products_description
    ON products USING GIN(to_tsvector('english', description))
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_products_normalized
    ON products(normalized_description)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_supplier_prices_product
    ON supplier_prices(product_id)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier
    ON supplier_prices(supplier_id)
  `);

  // Create view for easier querying
  await knex.schema.raw(`
    CREATE OR REPLACE VIEW product_supplier_prices AS
    SELECT
      p.id as product_id,
      p.description,
      p.normalized_description,
      s.id as supplier_id,
      s.name as supplier_name,
      sp.price,
      sp.updated_at
    FROM products p
    JOIN supplier_prices sp ON p.id = sp.product_id
    JOIN suppliers s ON sp.supplier_id = s.id
  `);

  console.log('✅ Initial schema migration completed');
};

exports.down = async function(knex) {
  // Drop view first
  await knex.schema.raw('DROP VIEW IF EXISTS product_supplier_prices');

  // Drop tables in reverse order (respecting foreign keys)
  await knex.schema.dropTableIfExists('supplier_prices');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('suppliers');

  console.log('✅ Initial schema migration rolled back');
};