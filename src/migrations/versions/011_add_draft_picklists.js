/**
 * Add draft picklists functionality for automatic periodic saving
 * Allows users to save temporary/draft picklists while working to resume later
 * Includes automatic cleanup of expired drafts after 7 days
 */

exports.up = async function(knex) {
  console.log('🔧 Creating draft_picklists table...');

  // Create draft_picklists table
  await knex.schema.createTable('draft_picklists', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('session_id', 64).notNullable(); // Browser session tracking
    table.string('draft_key', 64).unique().notNullable(); // Unique identifier for the draft
    table.string('title', 255).notNullable().defaultTo('Draft Picklist');
    table.jsonb('picklist_data').notNullable(); // Store the actual picklist data
    table.string('source_file_name', 255); // Track original uploaded file
    table.timestamp('last_saved_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable().defaultTo(knex.raw("CURRENT_TIMESTAMP + INTERVAL '7 days'"));

    // Foreign key constraint with CASCADE delete
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Ensure one draft per user+session combination if needed
    table.unique(['user_id', 'session_id', 'draft_key']);
  });

  console.log('   ✅ draft_picklists table created');

  // Create indexes for performance
  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_draft_picklists_user_session
    ON draft_picklists(user_id, session_id)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_draft_picklists_expires_at
    ON draft_picklists(expires_at)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_draft_picklists_draft_key
    ON draft_picklists(draft_key)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_draft_picklists_user_id
    ON draft_picklists(user_id)
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_draft_picklists_last_saved
    ON draft_picklists(last_saved_at)
  `);

  console.log('   ✅ Performance indexes created');

  // Create cleanup function for expired drafts
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION cleanup_expired_draft_picklists()
    RETURNS INTEGER AS $$
    DECLARE
        deleted_count INTEGER;
    BEGIN
        DELETE FROM draft_picklists WHERE expires_at < CURRENT_TIMESTAMP;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;
  `);

  console.log('   ✅ Cleanup function created: cleanup_expired_draft_picklists()');

  // Add trigger to automatically update last_saved_at on picklist_data changes
  await knex.schema.raw(`
    CREATE OR REPLACE FUNCTION update_draft_last_saved_at()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Only update last_saved_at if picklist_data actually changed
        IF OLD.picklist_data IS DISTINCT FROM NEW.picklist_data THEN
            NEW.last_saved_at = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.schema.raw(`
    CREATE TRIGGER update_draft_picklists_last_saved_at
    BEFORE UPDATE ON draft_picklists
    FOR EACH ROW EXECUTE FUNCTION update_draft_last_saved_at();
  `);

  console.log('   ✅ Auto-update trigger created for last_saved_at');

  // Enable Row Level Security for draft_picklists
  await knex.schema.raw('ALTER TABLE draft_picklists ENABLE ROW LEVEL SECURITY');

  // Create RLS policy - users can only access their own drafts
  await knex.schema.raw(`
    CREATE POLICY draft_picklists_user_access ON draft_picklists
    FOR ALL TO authenticated
    USING (user_id = current_setting('app.current_user_id')::int)
  `);

  console.log('   ✅ Row Level Security policy created');

  console.log('✅ Draft picklists migration completed');
  console.log('📊 New features added:');
  console.log('   - draft_picklists table for temporary saves');
  console.log('   - Automatic expiration after 7 days');
  console.log('   - cleanup_expired_draft_picklists() function');
  console.log('   - Performance indexes for efficient querying');
  console.log('   - Automatic last_saved_at updates on data changes');
  console.log('   - Row-level security for user isolation');
};

exports.down = async function(knex) {
  console.log('🔄 Rolling back draft picklists migration...');

  // Drop trigger and function first
  await knex.schema.raw('DROP TRIGGER IF EXISTS update_draft_picklists_last_saved_at ON draft_picklists');
  await knex.schema.raw('DROP FUNCTION IF EXISTS update_draft_last_saved_at()');
  await knex.schema.raw('DROP FUNCTION IF EXISTS cleanup_expired_draft_picklists()');

  console.log('   ✅ Triggers and functions dropped');

  // Disable RLS before dropping table
  await knex.schema.raw('ALTER TABLE draft_picklists DISABLE ROW LEVEL SECURITY');

  console.log('   ✅ Row Level Security disabled');

  // Drop the table (indexes will be dropped automatically)
  await knex.schema.dropTableIfExists('draft_picklists');

  console.log('   ✅ draft_picklists table dropped');
  console.log('✅ Draft picklists migration rolled back');
};