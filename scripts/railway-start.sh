#!/bin/bash

# Railway Startup Script
# This script runs the database migration and starts the application

echo "🚂 Starting Railway deployment..."
echo "📍 Environment: ${NODE_ENV:-development}"
echo "🔗 Database: ${PGHOST:-not-set}"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
timeout=60
count=0

while ! node -e "
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
pool.query('SELECT NOW()').then(() => {
    console.log('Database ready!');
    pool.end();
    process.exit(0);
}).catch(err => {
    console.error('Database not ready:', err.message);
    pool.end();
    process.exit(1);
});
" 2>/dev/null; do
    count=$((count + 1))
    if [ $count -gt $timeout ]; then
        echo "❌ Database connection timeout"
        exit 1
    fi
    echo "⏳ Database not ready, waiting... ($count/$timeout)"
    sleep 1
done

echo "✅ Database connection established"

# Run database migration
echo "🔄 Running database migration..."
npm run migrate:railway

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed"
else
    echo "❌ Database migration failed"
    exit 1
fi

# Start the application
echo "🚀 Starting application..."
exec npm start