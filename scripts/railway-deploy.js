#!/usr/bin/env node

// Railway deployment script with better error handling and debugging

const { spawn } = require('child_process');
const path = require('path');

console.log('🚂 Starting Railway deployment process...');
console.log('=====================================');

async function runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔄 Running: ${command} ${args.join(' ')}`);
        
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${command} completed successfully`);
                resolve(code);
            } else {
                console.error(`❌ ${command} failed with exit code ${code}`);
                reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
            }
        });
        
        child.on('error', (error) => {
            console.error(`💥 Failed to start ${command}:`, error.message);
            reject(error);
        });
    });
}

async function deploy() {
    try {
        // Step 1: Debug environment
        console.log('\n📊 Step 1: Debug Environment Variables');
        await runCommand('node', ['scripts/debug-env.js']);
        
        // Step 2: Wait for database
        console.log('\n⏳ Step 2: Wait for Database Connection');
        await runCommand('node', ['scripts/wait-for-db.js']);
        
        // Step 3: Start application with auto-migration
        console.log('\n🚀 Step 3: Start Application with Auto-Migration');
        console.log('=====================================');
        console.log('ℹ️  Server will automatically run migrations on startup');
        console.log('🔄 Auto-migration integrated into server.js');
        console.log('🌐 Starting web server...');

        // Start the application (this will auto-migrate then start server)
        await runCommand('npm', ['start']);
        
    } catch (error) {
        console.error('\n💥 Railway deployment failed:', error.message);
        console.error('\n🔍 Debugging tips:');
        console.error('1. Check Railway dashboard for PostgreSQL service');
        console.error('2. Verify database service is healthy and connected');
        console.error('3. Check environment variables with: railway variables');
        console.error('4. Review logs with: railway logs');
        console.error('5. Check migration status manually: npm run migrate:status');
        console.error('6. Run migrations manually if needed: npm run migrate');
        
        process.exit(1);
    }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Deployment interrupted');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Deployment terminated');
    process.exit(1);
});

if (require.main === module) {
    deploy();
}

module.exports = { deploy };