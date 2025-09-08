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
        
        // Step 3: Run migration
        console.log('\n🔄 Step 3: Database Migration');
        await runCommand('npm', ['run', 'migrate:railway']);
        
        // Step 4: Start application
        console.log('\n🚀 Step 4: Start Application');
        console.log('=====================================');
        console.log('🎉 Migration completed successfully!');
        console.log('🌐 Starting web server...');
        
        // Start the application (this will not return)
        await runCommand('npm', ['start']);
        
    } catch (error) {
        console.error('\n💥 Railway deployment failed:', error.message);
        console.error('\n🔍 Debugging tips:');
        console.error('1. Check Railway dashboard for PostgreSQL service');
        console.error('2. Verify database service is healthy and connected');
        console.error('3. Check environment variables with: railway variables');
        console.error('4. Review logs with: railway logs');
        
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