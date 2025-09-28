/**
 * Add user ownership to all data tables for proper multi-tenancy
 *
 * This migration adds user_id columns to tables that currently lack user ownership:
 * - matching_preferences (144 records) - assign to user 1
 * - shopping_list_items (54 records) - assign based on shopping_list's user_id
 * - suppliers (18 records) - assign to user 1 (existing data)
 * - supplier_prices (1252 records) - assign to user 1 (existing data)
 * - products (529 records) - assign to user 1 (existing data)
 */

exports.up = async function(knex) {
  console.log('🔧 Adding user ownership to all data tables...');

  // 1. Add user_id to matching_preferences table
  console.log('📝 Adding user_id to matching_preferences...');
  await knex.schema.table('matching_preferences', function(table) {
    table.integer('user_id').notNullable().defaultTo(1);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index('user_id');
  });

  // Update existing matching_preferences to belong to user 1
  const matchingPrefsUpdated = await knex('matching_preferences').update({ user_id: 1 });
  console.log(`   ✅ Updated ${matchingPrefsUpdated} matching_preferences records`);

  // 2. Add user_id to shopping_list_items table
  console.log('📝 Adding user_id to shopping_list_items...');
  await knex.schema.table('shopping_list_items', function(table) {
    table.integer('user_id').notNullable().defaultTo(1);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index('user_id');
  });

  // Update existing shopping_list_items based on their shopping_list's user_id
  await knex.raw(`
    UPDATE shopping_list_items
    SET user_id = (
      SELECT user_id
      FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
    )
  `);
  const itemsCount = await knex('shopping_list_items').count('* as count').first();
  console.log(`   ✅ Updated ${itemsCount.count} shopping_list_items records`);

  // 3. Add user_id to suppliers table
  console.log('📝 Adding user_id to suppliers...');
  await knex.schema.table('suppliers', function(table) {
    table.integer('user_id').notNullable().defaultTo(1);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index('user_id');
  });

  // Update existing suppliers to belong to user 1
  const suppliersUpdated = await knex('suppliers').update({ user_id: 1 });
  console.log(`   ✅ Updated ${suppliersUpdated} suppliers records`);

  // 4. Add user_id to supplier_prices table
  console.log('📝 Adding user_id to supplier_prices...');
  await knex.schema.table('supplier_prices', function(table) {
    table.integer('user_id').notNullable().defaultTo(1);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index('user_id');
  });

  // Update existing supplier_prices to belong to user 1
  const pricesUpdated = await knex('supplier_prices').update({ user_id: 1 });
  console.log(`   ✅ Updated ${pricesUpdated} supplier_prices records`);

  // 5. Add user_id to products table
  console.log('📝 Adding user_id to products...');
  await knex.schema.table('products', function(table) {
    table.integer('user_id').notNullable().defaultTo(1);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index('user_id');
  });

  // Update existing products to belong to user 1
  const productsUpdated = await knex('products').update({ user_id: 1 });
  console.log(`   ✅ Updated ${productsUpdated} products records`);

  console.log('🎉 User ownership migration completed successfully!');
  console.log('📊 Summary:');
  console.log(`   - matching_preferences: ${matchingPrefsUpdated} records`);
  console.log(`   - shopping_list_items: ${itemsCount.count} records`);
  console.log(`   - suppliers: ${suppliersUpdated} records`);
  console.log(`   - supplier_prices: ${pricesUpdated} records`);
  console.log(`   - products: ${productsUpdated} records`);
};

exports.down = async function(knex) {
  console.log('🔄 Removing user ownership from all data tables...');

  // Remove user_id columns in reverse order
  console.log('📝 Removing user_id from products...');
  await knex.schema.table('products', function(table) {
    table.dropForeign('user_id');
    table.dropIndex('user_id');
    table.dropColumn('user_id');
  });

  console.log('📝 Removing user_id from supplier_prices...');
  await knex.schema.table('supplier_prices', function(table) {
    table.dropForeign('user_id');
    table.dropIndex('user_id');
    table.dropColumn('user_id');
  });

  console.log('📝 Removing user_id from suppliers...');
  await knex.schema.table('suppliers', function(table) {
    table.dropForeign('user_id');
    table.dropIndex('user_id');
    table.dropColumn('user_id');
  });

  console.log('📝 Removing user_id from shopping_list_items...');
  await knex.schema.table('shopping_list_items', function(table) {
    table.dropForeign('user_id');
    table.dropIndex('user_id');
    table.dropColumn('user_id');
  });

  console.log('📝 Removing user_id from matching_preferences...');
  await knex.schema.table('matching_preferences', function(table) {
    table.dropForeign('user_id');
    table.dropIndex('user_id');
    table.dropColumn('user_id');
  });

  console.log('✅ User ownership rollback completed');
};