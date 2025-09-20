/**
 * Example seed data for development
 * You can create seed files to populate your database with test data
 */

exports.seed = async function(knex) {
  // Clear existing data (optional - be careful in production!)
  if (process.env.NODE_ENV === 'development') {
    await knex('supplier_prices').del();
    await knex('products').del();
    await knex('suppliers').del();

    // Insert seed data for suppliers
    const suppliers = await knex('suppliers').insert([
      { name: 'Example Supplier A' },
      { name: 'Example Supplier B' },
      { name: 'Example Supplier C' }
    ]).returning('*');

    // Insert seed data for products
    const products = await knex('products').insert([
      {
        description: 'Example Product 1',
        normalized_description: 'example product 1'
      },
      {
        description: 'Example Product 2',
        normalized_description: 'example product 2'
      }
    ]).returning('*');

    // Insert seed data for supplier prices
    await knex('supplier_prices').insert([
      {
        supplier_id: suppliers[0].id,
        product_id: products[0].id,
        price: 10.50
      },
      {
        supplier_id: suppliers[1].id,
        product_id: products[0].id,
        price: 9.75
      },
      {
        supplier_id: suppliers[0].id,
        product_id: products[1].id,
        price: 25.00
      }
    ]);

    console.log('✅ Development seed data inserted');
  } else {
    console.log('ℹ️  Skipping seed data in non-development environment');
  }
};