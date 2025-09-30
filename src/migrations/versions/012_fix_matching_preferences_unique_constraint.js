/**
 * Fix matching preferences unique constraint to include user_id
 * The original constraint only used (original_item, matched_product_id)
 * but it should be (original_item, matched_product_id, user_id) for proper multi-tenancy
 */

exports.up = async function(knex) {
  console.log('🔧 Fixing matching_preferences unique constraint...');

  // Drop the old unique constraint (if it exists)
  try {
    await knex.schema.raw(`
      ALTER TABLE matching_preferences
      DROP CONSTRAINT IF EXISTS matching_preferences_original_item_matched_product_id_unique
    `);
    console.log('   ✅ Dropped old unique constraint');
  } catch (error) {
    console.log('   ⚠️  Old constraint may not exist:', error.message);
  }

  // Add the new unique constraint including user_id
  await knex.schema.raw(`
    ALTER TABLE matching_preferences
    ADD CONSTRAINT matching_preferences_original_item_matched_product_id_user_id_unique
    UNIQUE (original_item, matched_product_id, user_id)
  `);
  console.log('   ✅ Added new unique constraint with user_id');

  console.log('🎉 Matching preferences unique constraint migration completed!');
};

exports.down = async function(knex) {
  console.log('🔄 Reverting matching_preferences unique constraint...');

  // Drop the new unique constraint
  await knex.schema.raw(`
    ALTER TABLE matching_preferences
    DROP CONSTRAINT IF EXISTS matching_preferences_original_item_matched_product_id_user_id_unique
  `);
  console.log('   ✅ Dropped new unique constraint');

  // Restore the old unique constraint (without user_id)
  await knex.schema.raw(`
    ALTER TABLE matching_preferences
    ADD CONSTRAINT matching_preferences_original_item_matched_product_id_unique
    UNIQUE (original_item, matched_product_id)
  `);
  console.log('   ✅ Restored old unique constraint');

  console.log('✅ Matching preferences unique constraint rollback completed');
};