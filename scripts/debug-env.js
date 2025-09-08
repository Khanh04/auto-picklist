#!/usr/bin/env node

// Debug script to check Railway environment variables

console.log('🔍 Railway Environment Debug');
console.log('============================');

// Check all database-related environment variables
const dbVars = [
    'DATABASE_URL',
    'PGUSER', 'PGHOST', 'PGDATABASE', 'PGPASSWORD', 'PGPORT',
    'DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT',
    'POSTGRES_USER', 'POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_PASSWORD', 'POSTGRES_PORT'
];

console.log('\n📊 Database Environment Variables:');
dbVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        // Mask password for security
        const displayValue = varName.toLowerCase().includes('password') 
            ? '***' + value.slice(-3)
            : value;
        console.log(`✅ ${varName}=${displayValue}`);
    } else {
        console.log(`❌ ${varName}=<not set>`);
    }
});

console.log('\n🌍 General Environment:');
console.log(`NODE_ENV=${process.env.NODE_ENV || '<not set>'}`);
console.log(`PORT=${process.env.PORT || '<not set>'}`);
console.log(`RAILWAY_ENVIRONMENT=${process.env.RAILWAY_ENVIRONMENT || '<not set>'}`);

// Check if we're running on Railway
if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('\n🚂 Running on Railway');
    console.log(`Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
    console.log(`Service: ${process.env.RAILWAY_SERVICE_NAME || '<not set>'}`);
} else {
    console.log('\n💻 Running locally or on other platform');
}

console.log('\n🔧 Recommended database config:');
if (process.env.DATABASE_URL) {
    console.log('✅ Use DATABASE_URL connection string (preferred)');
} else if (process.env.PGHOST && process.env.PGDATABASE) {
    console.log('✅ Use individual PG* variables');
} else if (process.env.DB_HOST && process.env.DB_NAME) {
    console.log('✅ Use individual DB_* variables');
} else {
    console.log('❌ No database configuration found!');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL service is added to Railway project');
    console.log('2. Check Railway dashboard for database service status');
    console.log('3. Ensure services are properly connected');
    console.log('4. Try redeploying to refresh environment variables');
}

console.log('\n============================');