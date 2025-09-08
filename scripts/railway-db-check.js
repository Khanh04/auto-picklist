#!/usr/bin/env node

// Railway-specific database connectivity check

const { Pool } = require('pg');

async function testRailwayConnection() {
    console.log('🚂 Railway Database Connectivity Test');
    console.log('=====================================');
    
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not found');
        console.log('🔧 Check that PostgreSQL service is connected to your app');
        return false;
    }
    
    console.log(`📍 Database URL: ${databaseUrl.replace(/:\/\/.*@/, '://***@')}`);
    
    // Test different connection configurations
    const configs = [];
    
    // Test DATABASE_URL (internal)
    if (process.env.DATABASE_URL) {
        configs.push({
            name: 'DATABASE_URL (internal) with no SSL',
            config: {
                connectionString: process.env.DATABASE_URL,
                ssl: false,
                connectionTimeoutMillis: 15000,
            }
        });
    }
    
    // Test DATABASE_PUBLIC_URL (external)
    if (process.env.DATABASE_PUBLIC_URL) {
        configs.push({
            name: 'DATABASE_PUBLIC_URL (external) with SSL',
            config: {
                connectionString: process.env.DATABASE_PUBLIC_URL,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 15000,
            }
        });
        configs.push({
            name: 'DATABASE_PUBLIC_URL (external) with no SSL',
            config: {
                connectionString: process.env.DATABASE_PUBLIC_URL,
                ssl: false,
                connectionTimeoutMillis: 15000,
            }
        });
    }
    
    // Add individual variables test
    configs.push({
        name: 'Individual variables',
        config: {
            user: process.env.PGUSER,
            host: process.env.PGHOST,
            database: process.env.PGDATABASE,
            password: process.env.PGPASSWORD,
            port: parseInt(process.env.PGPORT) || 5432,
            ssl: false,
            connectionTimeoutMillis: 15000,
        }
    });
    
    for (const { name, config } of configs) {
        console.log(`\n🔄 Testing: ${name}`);
        
        const pool = new Pool(config);
        
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT NOW(), version()');
            console.log('✅ Connection successful!');
            console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
            console.log(`🕐 Server time: ${result.rows[0].now}`);
            
            client.release();
            await pool.end();
            
            return true;
            
        } catch (error) {
            console.log(`❌ Connection failed: ${error.message}`);
            console.log(`🔍 Error code: ${error.code || 'N/A'}`);
            
            try {
                await pool.end();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }
    
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Ensure PostgreSQL service is "Active" in Railway dashboard');
    console.log('2. Check that services are properly connected');
    console.log('3. Try redeploying the PostgreSQL service');
    console.log('4. Check Railway service logs for PostgreSQL startup issues');
    
    return false;
}

if (require.main === module) {
    testRailwayConnection()
        .then(success => {
            if (success) {
                console.log('\n🎉 Database connectivity test passed!');
                process.exit(0);
            } else {
                console.log('\n❌ Database connectivity test failed');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Test script error:', error);
            process.exit(1);
        });
}

module.exports = { testRailwayConnection };