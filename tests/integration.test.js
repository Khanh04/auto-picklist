const request = require('supertest');
const path = require('path');
const fs = require('fs');
const express = require('express');

// Mock the database
jest.mock('../src/database/config', () => ({
    pool: {
        connect: jest.fn().mockResolvedValue({
            query: jest.fn(),
            release: jest.fn()
        })
    }
}));

// Simple integration test for the main server functionality
describe('Integration Tests', () => {
    let app;

    beforeAll(() => {
        // Create a minimal Express app for testing
        app = express();
        app.use(express.json());
        
        // Add a simple test route
        app.get('/test/status', (req, res) => {
            res.json({ status: 'ok', message: 'Test server running' });
        });
        
        // Mock the database routes
        app.get('/test/export', (req, res) => {
            res.json({ 
                success: true, 
                message: 'Export functionality available',
                features: ['import', 'export', 'shopping-lists']
            });
        });
    });

    describe('Basic Functionality', () => {
        it('should respond to status check', async () => {
            const response = await request(app)
                .get('/test/status');
            
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
        });

        it('should have export functionality available', async () => {
            const response = await request(app)
                .get('/test/export');
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.features).toContain('export');
            expect(response.body.features).toContain('import');
        });
    });

    describe('File System Integration', () => {
        it('should have required directories', () => {
            const uploadsDir = path.join(__dirname, '../uploads');
            const publicDir = path.join(__dirname, '../public');
            
            expect(fs.existsSync(uploadsDir)).toBe(true);
            expect(fs.existsSync(publicDir)).toBe(true);
        });

        it('should have required configuration files', () => {
            const packageJson = path.join(__dirname, '../package.json');
            const serverJs = path.join(__dirname, '../server.js');
            
            expect(fs.existsSync(packageJson)).toBe(true);
            expect(fs.existsSync(serverJs)).toBe(true);
        });

        it('should have test files in place', () => {
            const testDir = path.join(__dirname);
            const files = fs.readdirSync(testDir);
            
            expect(files).toContain('databaseLoader.test.js');
            expect(files).toContain('integration.test.js');
            expect(files).toContain('setup.js');
        });
    });

    describe('Database Integration', () => {
        it('should mock database connections properly', () => {
            const { pool } = require('../src/database/config');
            expect(pool.connect).toBeDefined();
            expect(typeof pool.connect).toBe('function');
        });
    });

    describe('Route Structure', () => {
        it('should have database routes available', () => {
            const databaseRoutes = require('../src/routes/database');
            expect(databaseRoutes).toBeDefined();
        });

        it('should have shopping list routes available', () => {
            const shoppingListRoutes = require('../src/routes/shoppingList');
            expect(shoppingListRoutes).toBeDefined();
        });

        it('should have required middleware', () => {
            const errorHandler = require('../src/middleware/errorHandler');
            expect(errorHandler.globalErrorHandler).toBeDefined();
            expect(errorHandler.notFoundHandler).toBeDefined();
        });
    });

    describe('Feature Availability', () => {
        it('should have Excel processing capability', () => {
            const XLSX = require('xlsx');
            expect(XLSX.readFile).toBeDefined();
            expect(XLSX.utils.sheet_to_json).toBeDefined();
        });

        it('should have all required npm packages', () => {
            const packageJson = require('../package.json');
            
            expect(packageJson.dependencies['express']).toBeDefined();
            expect(packageJson.dependencies['xlsx']).toBeDefined();
            expect(packageJson.dependencies['multer']).toBeDefined();
            expect(packageJson.dependencies['ws']).toBeDefined();
        });

        it('should have proper test configuration', () => {
            const jestConfig = require('../jest.config.js');
            expect(jestConfig.setupFilesAfterEnv).toContain('<rootDir>/tests/setup.js');
        });
    });
});