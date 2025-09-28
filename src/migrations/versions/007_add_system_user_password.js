/**
 * Add password to system user for development access
 *
 * This migration adds login credentials to the system user (ID 1)
 * so developers can access existing data that was migrated during
 * the mandatory authentication implementation.
 */

const bcrypt = require('bcrypt');

exports.up = async function(knex) {
  console.log('🔐 Adding password to system user for development access...');

  // Hash the password - using 'admin123' as a simple development password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash('admin123', saltRounds);

  // Update system user with login credentials
  const updated = await knex('users')
    .where('id', 1)
    .update({
      email: 'admin@auto-picklist.local', // Change to a more user-friendly email
      password_hash: hashedPassword,
      display_name: 'System Administrator',
      first_name: 'System',
      last_name: 'Administrator',
      role: 'admin', // Change from 'system' to 'admin' so it can log in
      updated_at: knex.fn.now()
    });

  if (updated === 0) {
    throw new Error('System user (ID 1) not found. Please run migration 005 first.');
  }

  console.log('✅ System user credentials updated:');
  console.log('   📧 Email: admin@auto-picklist.local');
  console.log('   🔑 Password: admin123');
  console.log('   👤 Role: admin');
  console.log('   ⚠️  NOTE: Change this password in production!');
};

exports.down = async function(knex) {
  console.log('🔄 Removing system user password...');

  // Revert system user back to original state
  const updated = await knex('users')
    .where('id', 1)
    .update({
      email: 'system@auto-picklist.internal',
      password_hash: null,
      display_name: 'System User',
      first_name: null,
      last_name: null,
      role: 'system',
      updated_at: knex.fn.now()
    });

  if (updated > 0) {
    console.log('✅ System user reverted to original state');
  }
};