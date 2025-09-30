/**
 * Fix picklist_data column type from json to jsonb
 *
 * The original migration incorrectly created picklist_data as json type,
 * but the application code expects jsonb for using jsonb_array_length() function.
 * This migration safely converts the column type while preserving data.
 */

exports.up = async function(knex) {
  console.log('🔧 Converting picklist_data column from json to jsonb...');

  // Check current column type
  const columnInfo = await knex.raw(`
    SELECT data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'shopping_lists'
    AND column_name = 'picklist_data'
  `);

  if (columnInfo.rows.length > 0) {
    const currentType = columnInfo.rows[0].data_type;
    console.log(`   Current picklist_data type: ${currentType}`);

    if (currentType === 'json') {
      // Step 1: Drop dependent views
      await knex.raw('DROP VIEW IF EXISTS user_shopping_lists');
      console.log('   🗑️  Dropped dependent views');

      // Step 2: Add a temporary jsonb column
      await knex.schema.alterTable('shopping_lists', function(table) {
        table.jsonb('picklist_data_temp');
      });

      // Step 3: Convert and copy data from json to jsonb
      await knex.raw(`
        UPDATE shopping_lists
        SET picklist_data_temp = picklist_data::jsonb
      `);

      // Step 4: Drop the old json column
      await knex.schema.alterTable('shopping_lists', function(table) {
        table.dropColumn('picklist_data');
      });

      // Step 5: Rename the temp column to the original name
      await knex.schema.alterTable('shopping_lists', function(table) {
        table.renameColumn('picklist_data_temp', 'picklist_data');
      });

      // Step 6: Make the column NOT NULL if it should be
      await knex.schema.alterTable('shopping_lists', function(table) {
        table.jsonb('picklist_data').notNullable().alter();
      });

      // Step 7: Recreate the user_shopping_lists view
      await knex.raw(`
        CREATE OR REPLACE VIEW user_shopping_lists AS
        SELECT
          sl.*,
          CASE
            WHEN sl.user_id = sp.user_id OR sl.created_by_user_id = sp.user_id THEN 'admin'
            ELSE COALESCE(sp.permission_level, 'view')
          END as user_permission,
          u_owner.display_name as owner_name,
          u_creator.display_name as creator_name
        FROM shopping_lists sl
        LEFT JOIN sharing_permissions sp ON sl.id = sp.shopping_list_id AND sp.is_active = true
        LEFT JOIN users u_owner ON sl.user_id = u_owner.id
        LEFT JOIN users u_creator ON sl.created_by_user_id = u_creator.id
        WHERE sl.allow_anonymous_access = true OR sp.user_id IS NOT NULL
      `);
      console.log('   🔄 Recreated user_shopping_lists view');

      console.log('   ✅ Successfully converted picklist_data from json to jsonb');
    } else if (currentType === 'jsonb') {
      console.log('   ℹ️  picklist_data is already jsonb type');
    } else {
      console.log(`   ⚠️  Unexpected type: ${currentType}`);
    }
  } else {
    console.log('   ⚠️  picklist_data column not found');
  }

  console.log('✅ Picklist data type migration completed');
};

exports.down = async function(knex) {
  console.log('🔄 Converting picklist_data column from jsonb back to json...');

  // Check current column type
  const columnInfo = await knex.raw(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'shopping_lists'
    AND column_name = 'picklist_data'
  `);

  if (columnInfo.rows.length > 0) {
    const currentType = columnInfo.rows[0].data_type;

    if (currentType === 'jsonb') {
      // Step 1: Drop dependent views
      await knex.raw('DROP VIEW IF EXISTS user_shopping_lists');

      // Step 2: Add a temporary json column
      await knex.schema.alterTable('shopping_lists', function(table) {
        table.json('picklist_data_temp');
      });

      // Step 3: Convert and copy data from jsonb to json
      await knex.raw(`
        UPDATE shopping_lists
        SET picklist_data_temp = picklist_data::json
      `);

      // Step 4: Drop the jsonb column
      await knex.schema.alterTable('shopping_lists', function(table) {
        table.dropColumn('picklist_data');
      });

      // Step 5: Rename the temp column to the original name
      await knex.schema.alterTable('shopping_lists', function(table) {
        table.renameColumn('picklist_data_temp', 'picklist_data');
      });

      // Step 6: Recreate the user_shopping_lists view
      await knex.raw(`
        CREATE OR REPLACE VIEW user_shopping_lists AS
        SELECT
          sl.*,
          CASE
            WHEN sl.user_id = sp.user_id OR sl.created_by_user_id = sp.user_id THEN 'admin'
            ELSE COALESCE(sp.permission_level, 'view')
          END as user_permission,
          u_owner.display_name as owner_name,
          u_creator.display_name as creator_name
        FROM shopping_lists sl
        LEFT JOIN sharing_permissions sp ON sl.id = sp.shopping_list_id AND sp.is_active = true
        LEFT JOIN users u_owner ON sl.user_id = u_owner.id
        LEFT JOIN users u_creator ON sl.created_by_user_id = u_creator.id
        WHERE sl.allow_anonymous_access = true OR sp.user_id IS NOT NULL
      `);

      console.log('   ✅ Successfully converted picklist_data from jsonb to json');
    }
  }

  console.log('✅ Picklist data type rollback completed');
};