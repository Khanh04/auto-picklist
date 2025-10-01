/**
 * Migrate existing preference data to unified item_preferences table
 * Consolidates data from matching_preferences and supplier_preferences
 */

exports.up = async function(knex) {
  console.log('🔄 Starting preference data migration...');

  // Step 1: Migrate data where we have both product and supplier preferences
  const combinedPrefs = await knex.raw(`
    INSERT INTO item_preferences (user_id, original_item, product_id, supplier_id, frequency, last_used, created_at, updated_at)
    SELECT
      COALESCE(sp.user_id, mp.user_id) as user_id,
      sp.original_item,
      sp.matched_product_id as product_id,
      sp.preferred_supplier_id as supplier_id,
      GREATEST(COALESCE(sp.frequency, 1), COALESCE(mp.frequency, 1)) as frequency,
      GREATEST(COALESCE(sp.last_used, sp.created_at), COALESCE(mp.last_used, mp.created_at)) as last_used,
      LEAST(COALESCE(sp.created_at, NOW()), COALESCE(mp.created_at, NOW())) as created_at,
      NOW() as updated_at
    FROM supplier_preferences sp
    LEFT JOIN matching_preferences mp ON
      sp.original_item = mp.original_item
      AND sp.matched_product_id = mp.matched_product_id
      AND sp.user_id = mp.user_id
    WHERE sp.matched_product_id IS NOT NULL
    ON CONFLICT (user_id, original_item) DO UPDATE SET
      frequency = GREATEST(item_preferences.frequency, EXCLUDED.frequency),
      last_used = GREATEST(item_preferences.last_used, EXCLUDED.last_used),
      updated_at = NOW()
  `);

  console.log(`✅ Migrated ${combinedPrefs.rowCount || 0} combined preferences`);

  // Step 2: Handle matching preferences without supplier preferences
  // These will need manual review or default supplier assignment
  const orphanedMatches = await knex.raw(`
    SELECT
      mp.user_id,
      mp.original_item,
      mp.matched_product_id,
      mp.frequency,
      mp.last_used,
      mp.created_at
    FROM matching_preferences mp
    LEFT JOIN supplier_preferences sp ON
      mp.original_item = sp.original_item
      AND mp.matched_product_id = sp.matched_product_id
      AND mp.user_id = sp.user_id
    LEFT JOIN item_preferences ip ON
      mp.user_id = ip.user_id
      AND mp.original_item = ip.original_item
    WHERE sp.id IS NULL
      AND ip.id IS NULL
  `);

  if (orphanedMatches.rows.length > 0) {
    console.log(`⚠️  Found ${orphanedMatches.rows.length} matching preferences without supplier preferences`);

    // For each orphaned match, find the cheapest supplier for that product
    for (const match of orphanedMatches.rows) {
      const cheapestSupplier = await knex.raw(`
        SELECT supplier_id, MIN(price) as min_price
        FROM supplier_prices
        WHERE product_id = ?
        GROUP BY supplier_id
        ORDER BY min_price ASC
        LIMIT 1
      `, [match.matched_product_id]);

      if (cheapestSupplier.rows.length > 0) {
        await knex('item_preferences').insert({
          user_id: match.user_id,
          original_item: match.original_item,
          product_id: match.matched_product_id,
          supplier_id: cheapestSupplier.rows[0].supplier_id,
          frequency: match.frequency,
          last_used: match.last_used,
          created_at: match.created_at,
          updated_at: new Date()
        }).onConflict(['user_id', 'original_item']).ignore();
      }
    }

    console.log(`✅ Migrated ${orphanedMatches.rows.length} orphaned matching preferences with default suppliers`);
  }

  // Step 3: Handle supplier preferences without matching preferences
  // These are direct supplier selections without specific product matches
  const orphanedSuppliers = await knex.raw(`
    SELECT
      sp.user_id,
      sp.original_item,
      sp.matched_product_id,
      sp.preferred_supplier_id,
      sp.frequency,
      sp.last_used,
      sp.created_at
    FROM supplier_preferences sp
    LEFT JOIN item_preferences ip ON
      sp.user_id = ip.user_id
      AND sp.original_item = ip.original_item
    WHERE sp.matched_product_id IS NULL
      AND ip.id IS NULL
  `);

  if (orphanedSuppliers.rows.length > 0) {
    console.log(`⚠️  Found ${orphanedSuppliers.rows.length} supplier preferences without product matches`);

    // For each orphaned supplier preference, find a matching product for that supplier
    for (const pref of orphanedSuppliers.rows) {
      // Try to find a product for this supplier by searching for similar item names
      const matchingProduct = await knex.raw(`
        SELECT p.id as product_id
        FROM products p
        INNER JOIN supplier_prices sp_prices ON p.id = sp_prices.product_id
        WHERE sp_prices.supplier_id = ?
          AND (
            LOWER(p.description) LIKE LOWER(?)
            OR LOWER(p.description) LIKE LOWER(?)
            OR similarity(LOWER(p.description), LOWER(?)) > 0.3
          )
        ORDER BY similarity(LOWER(p.description), LOWER(?)) DESC
        LIMIT 1
      `, [
        pref.preferred_supplier_id,
        `%${pref.original_item}%`,
        `%${pref.original_item.split(' ')[0]}%`,
        pref.original_item,
        pref.original_item
      ]);

      if (matchingProduct.rows.length > 0) {
        await knex('item_preferences').insert({
          user_id: pref.user_id,
          original_item: pref.original_item,
          product_id: matchingProduct.rows[0].product_id,
          supplier_id: pref.preferred_supplier_id,
          frequency: pref.frequency,
          last_used: pref.last_used,
          created_at: pref.created_at,
          updated_at: new Date()
        }).onConflict(['user_id', 'original_item']).ignore();
      }
    }

    console.log(`✅ Attempted to migrate ${orphanedSuppliers.rows.length} orphaned supplier preferences`);
  }

  // Step 4: Report migration results
  const totalMigrated = await knex('item_preferences').count('* as count');
  const totalOriginalMatching = await knex('matching_preferences').count('* as count');
  const totalOriginalSupplier = await knex('supplier_preferences').count('* as count');

  console.log(`📊 Migration Summary:`);
  console.log(`   - Original matching preferences: ${totalOriginalMatching[0].count}`);
  console.log(`   - Original supplier preferences: ${totalOriginalSupplier[0].count}`);
  console.log(`   - New unified preferences: ${totalMigrated[0].count}`);
  console.log(`✅ Preference data migration completed`);
};

exports.down = async function(knex) {
  // Clear the migrated data but don't delete the table
  await knex('item_preferences').del();
  console.log('✅ Rolled back preference data migration');
};