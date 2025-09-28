const express = require('express');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const cookieParser = require('cookie-parser');

// Import configuration and middleware
const config = require('./src/config');
const MigrationManager = require('./src/migrations/MigrationManager');
const { globalErrorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { preventRequestBombing } = require('./src/middleware/secureValidation');
const { requestContext, requestLogger } = require('./src/middleware/requestContext');
const { enhancedGlobalErrorHandler, enhancedNotFoundHandler } = require('./src/middleware/enhancedErrorHandler');

// Import route modules
const itemsRoutes = require('./src/routes/items');
const suppliersRoutes = require('./src/routes/suppliers');
const preferencesRoutes = require('./src/routes/preferences');
const supplierPreferencesRoutes = require('./src/routes/supplierPreferences');
const picklistRoutes = require('./src/routes/picklist');
const shoppingListRoutes = require('./src/routes/shoppingList');
const databaseRoutes = require('./src/routes/database');
const multiCsvRoutes = require('./src/routes/multiCsv');
const createAuthRoutes = require('./src/routes/auth');
const createAuthMiddleware = require('./src/middleware/auth');

const app = express();
const port = config.server.port;

// Validate configuration
try {
    config.validate();
    console.log('✅ Configuration validated successfully');
    
    if (config.isDevelopment()) {
        console.log('📋 Configuration Summary:', JSON.stringify(config.getSafeConfig(), null, 2));
    }
} catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(config.upload.directory)) {
    fs.mkdirSync(config.upload.directory, { recursive: true });
    console.log(`📁 Created uploads directory: ${config.upload.directory}`);
}

// Health check endpoint (before rate limiting)
if (config.features.enableHealthCheck) {
    app.get('/health', async (req, res) => {
        try {
            // Test database connection
            const { pool } = require('./src/database/config');
            await pool.query('SELECT 1');
            res.status(200).json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                version: config.app.version,
                environment: config.NODE_ENV
            });
        } catch (error) {
            res.status(503).json({ 
                status: 'unhealthy', 
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
}

// Global middleware with security enhancements
app.use(express.json({
    limit: '10mb',
    strict: true, // Only parse arrays and objects
    type: 'application/json'
}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 1000 // Limit URL-encoded parameters
}));
app.use(cookieParser()); // Parse cookies for JWT authentication

// Request context tracking (must be early in middleware chain)
app.use(requestContext);

// Request bombing prevention
app.use(preventRequestBombing({
    maxBodySize: 10 * 1024 * 1024, // 10MB
    maxParameters: 1000,
    maxDepth: 10
}));

// Rate limiting removed

// CORS configuration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.security.corsOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true'); // Support for authentication cookies

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (config.isProduction()) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
});

// Enhanced request logging middleware
app.use(requestLogger);

// Initialize database connection and authentication middleware
const { pool } = require('./src/database/config');
const knex = require('knex');

// Create Knex instance using the migration configuration
const environment = process.env.NODE_ENV || 'development';
const knexConfig = require('./src/migrations/knexfile.js')[environment];
const db = knex(knexConfig);

const authMiddleware = createAuthMiddleware(db, {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiresIn: '15m',
    refreshTokenExpiresIn: '7d'
});

// API Routes
app.use('/api/auth', createAuthRoutes(db, authMiddleware));

// Core API routes - ALL require authentication (Phase 2: Mandatory Authentication)
app.use('/api/items', authMiddleware.authenticateRequired, itemsRoutes);
app.use('/api/suppliers', authMiddleware.authenticateRequired, suppliersRoutes);
app.use('/api/preferences', authMiddleware.authenticateRequired, preferencesRoutes);
app.use('/api/supplier-preferences', authMiddleware.authenticateRequired, supplierPreferencesRoutes);
app.use('/api/picklist', authMiddleware.authenticateRequired, picklistRoutes);
app.use('/api/shopping-list', authMiddleware.authenticateRequired, shoppingListRoutes);
app.use('/api/database', authMiddleware.authenticateRequired, databaseRoutes);
app.use('/api/multi-csv', authMiddleware.authenticateRequired, multiCsvRoutes);

// Legacy API endpoints for backward compatibility - require authentication
app.get('/api/get-preference/:originalItem', authMiddleware.authenticateRequired, (req, res, next) => {
    req.url = `/api/preferences/${req.params.originalItem}`;
    preferencesRoutes(req, res, next);
});

app.post('/api/store-preferences', authMiddleware.authenticateRequired, (req, res, next) => {
    req.url = '/api/preferences';
    preferencesRoutes(req, res, next);
});

app.post('/api/match-item', authMiddleware.authenticateRequired, (req, res, next) => {
    req.url = '/api/items/match';
    itemsRoutes(req, res, next);
});

// Export route - returns download URLs for on-the-fly generation
app.post('/export', async (req, res) => {
    try {
        const { picklist, summary } = req.body;

        if (!picklist || !Array.isArray(picklist)) {
            return res.status(400).json({ error: 'Invalid picklist data' });
        }

        // Prepare picklist data with matched items for better display
        const processedPicklist = picklist.map(row => ({
            ...row,
            // Use matched description if available, otherwise use original item
            item: row.matchedDescription || row.item
        }));

        // Generate unique identifier for this export session
        const exportId = Date.now().toString();
        
        // Store the processed picklist temporarily in memory for download generation
        // This is more secure than file storage and automatically cleaned up
        global.exportCache = global.exportCache || new Map();
        global.exportCache.set(exportId, {
            data: processedPicklist,
            timestamp: Date.now()
        });
        
        // Clean old cache entries (older than 10 minutes)
        const cleanupTime = Date.now() - (10 * 60 * 1000);
        for (const [key, value] of global.exportCache.entries()) {
            if (value.timestamp < cleanupTime) {
                global.exportCache.delete(key);
            }
        }

        const response = {
            success: true,
            message: 'Picklist ready for download!',
            csvUrl: `/download/csv/${exportId}`,
            pdfUrl: `/download/pdf/${exportId}`,
            summary: summary
        };
        
        console.log('Sending export response:', response);
        res.json(response);

    } catch (error) {
        console.error('Export error:', error.message);
        res.status(500).json({ error: 'Failed to prepare export' });
    }
});

// On-the-fly download route
app.get('/download/:type/:exportId', (req, res) => {
    const { type, exportId } = req.params;
    
    // Security: Validate file type parameter
    if (!['pdf', 'csv'].includes(type)) {
        return res.status(400).json({ error: 'Invalid file type' });
    }
    
    // Security: Validate exportId (should be numeric timestamp)
    if (!/^\d+$/.test(exportId)) {
        return res.status(400).json({ error: 'Invalid export ID' });
    }
    
    // Get data from cache
    const exportCache = global.exportCache || new Map();
    const cacheEntry = exportCache.get(exportId);
    
    if (!cacheEntry) {
        return res.status(404).json({ error: 'Export data not found or expired' });
    }
    
    try {
        const { data: picklistData } = cacheEntry;
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (type === 'csv') {
            // Generate and stream CSV
            const { streamCSV } = require('./src/modules/csvGenerator');
            streamCSV(picklistData, res, `picklist-${timestamp}.csv`);
            
        } else if (type === 'pdf') {
            // Generate and stream PDF
            const { generatePDF } = require('./src/modules/pdfGenerator');
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="picklist-${timestamp}.pdf"`);
            
            generatePDF(picklistData, res);
        }
        
        // Clean up this cache entry after use
        exportCache.delete(exportId);
        
    } catch (error) {
        console.error('Download error:', error.message);
        res.status(500).json({ error: 'Failed to generate download' });
    }
});

// Serve static files (frontend)
app.use(express.static(config.paths.public));

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: config.app.name,
        version: config.app.version,
        description: config.app.description,
        environment: config.NODE_ENV,
        endpoints: {
            health: '/health',
            items: '/api/items',
            suppliers: '/api/suppliers',
            preferences: '/api/preferences',
            supplierPreferences: '/api/supplier-preferences',
            picklist: '/api/picklist'
        },
        features: config.features
    });
});

// Catch-all handler for client-side routing
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found',
            path: req.path
        });
    }
    
    res.sendFile(path.join(config.paths.public, 'index.html'));
});

// Error handling middleware (must be last)
app.use(enhancedNotFoundHandler);
app.use(globalErrorHandler);

// Create HTTP server
const server = http.createServer(app);

// Graceful shutdown handling
const gracefulShutdown = () => {
    console.log('🔄 Shutdown signal received, shutting down gracefully...');
    
    // Close WebSocket server
    if (wss) {
        wss.close(() => {
            console.log('✅ WebSocket server closed');
        });
    }
    
    // Close HTTP server
    server.close((err) => {
        if (err) {
            console.error('❌ Error during server shutdown:', err);
            process.exit(1);
        }
        console.log('✅ HTTP server closed');
        process.exit(0);
    });
    
    // Force close after timeout
    setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Set max listeners to prevent warnings
wss.setMaxListeners(20);
server.setMaxListeners(20);

// Store active shopping list connections
const shoppingListConnections = new Map();

wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            switch (message.type) {
                case 'join_shopping_list':
                    const shareId = message.shareId;
                    if (!shoppingListConnections.has(shareId)) {
                        shoppingListConnections.set(shareId, new Set());
                    }
                    shoppingListConnections.get(shareId).add(ws);
                    ws.shareId = shareId;
                    console.log(`Client joined shopping list: ${shareId}`);
                    break;
                    
                case 'update_item':
                    if (ws.shareId) {
                        const connections = shoppingListConnections.get(ws.shareId);
                        if (connections) {
                            connections.forEach((client) => {
                                if (client !== ws && client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        type: 'item_updated',
                                        data: message.data
                                    }));
                                }
                            });
                        }
                    }
                    break;
                    
                case 'toggle_completed':
                    if (ws.shareId) {
                        const { index, checked } = message.data;
                        
                        // Update database via API call
                        try {
                            const fetch = require('node-fetch');
                            const response = await fetch(`http://localhost:${config.server.port}/api/shopping-list/share/${ws.shareId}/item/${index}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ isChecked: checked })
                            });

                            if (response.ok) {
                                const result = await response.json();
                                
                                // Broadcast the database-confirmed update to all clients
                                const connections = shoppingListConnections.get(ws.shareId);
                                if (connections) {
                                    connections.forEach((client) => {
                                        if (client.readyState === WebSocket.OPEN) {
                                            client.send(JSON.stringify({
                                                type: 'item_toggled',
                                                data: {
                                                    index: result.data.itemIndex,
                                                    checked: result.data.isChecked,
                                                    checkedAt: result.data.checkedAt,
                                                    updatedAt: result.data.updatedAt
                                                }
                                            }));
                                        }
                                    });
                                }
                            } else {
                                // Send error back to the client that initiated the request
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: { message: 'Failed to update item state' }
                                }));
                            }
                        } catch (error) {
                            console.error('Error updating item in database:', error);
                            ws.send(JSON.stringify({
                                type: 'error',
                                data: { message: 'Database update failed' }
                            }));
                        }
                    }
                    break;
                    
                case 'switch_supplier':
                    if (ws.shareId) {
                        // Simply broadcast a refresh signal to all other clients
                        // The originating client has already updated its local state and database
                        const connections = shoppingListConnections.get(ws.shareId);
                        if (connections) {
                            connections.forEach((client) => {
                                if (client !== ws && client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        type: 'picklist_updated',
                                        data: {
                                            timestamp: Date.now(),
                                            shareId: ws.shareId
                                        }
                                    }));
                                }
                            });
                        }
                        
                        console.log(`Picklist update broadcasted for shopping list ${ws.shareId}`);
                    }
                    break;

                case 'picklist_update_broadcast':
                    if (ws.shareId) {
                        // Broadcast refresh signal to all other clients
                        const connections = shoppingListConnections.get(ws.shareId);
                        if (connections) {
                            connections.forEach((client) => {
                                if (client !== ws && client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        type: 'picklist_updated',
                                        data: {
                                            timestamp: Date.now(),
                                            shareId: ws.shareId,
                                            ...message.data
                                        }
                                    }));
                                }
                            });
                        }
                        
                        console.log(`Picklist update broadcasted for shopping list ${ws.shareId}`);
                    }
                    break;
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        if (ws.shareId) {
            const connections = shoppingListConnections.get(ws.shareId);
            if (connections) {
                connections.delete(ws);
                if (connections.size === 0) {
                    shoppingListConnections.delete(ws.shareId);
                }
            }
            console.log(`Client left shopping list: ${ws.shareId}`);
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Auto-migration function
async function runMigrations() {
    const migrationManager = new MigrationManager();

    try {
        const needsMigration = await migrationManager.needsMigration();

        if (needsMigration) {
            console.log('🔄 Running database migrations...');
            await migrationManager.migrate();
            console.log('✅ Migrations completed successfully');
        } else {
            console.log('✅ Database is up to date');
        }
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (config.isProduction()) {
            console.error('💡 In production, run "npm run migrate:integrate" first if this is an existing database');
            console.error('💡 Or check migration status with deployment scripts');
            process.exit(1);
        } else {
            console.warn('⚠️  Continuing in development mode despite migration failure');
        }
    } finally {
        await migrationManager.close();
    }
}

// Start server with migrations
async function startServer() {
    // Run migrations first
    await runMigrations();

    // Then start the server
    server.listen(port, () => {
        console.log(`🚀 ${config.app.name} v${config.app.version}`);
        console.log(`🌐 Server running on http://${config.server.host}:${port}`);
        console.log(`📊 Environment: ${config.NODE_ENV}`);
        console.log(`💾 Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
        console.log(`🔌 WebSocket server ready for real-time connections`);

        if (config.features.enableHealthCheck) {
            console.log(`🏥 Health check: http://${config.server.host}:${port}/health`);
        }

        console.log('✨ Server ready to accept connections');
    });
}

// Start the application
startServer().catch(error => {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
});

module.exports = app;