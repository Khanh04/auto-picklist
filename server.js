const express = require('express');
const path = require('path');
const fs = require('fs');

// Import configuration and middleware
const config = require('./src/config');
const { globalErrorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { rateLimit } = require('./src/middleware/validation');

// Import route modules
const itemsRoutes = require('./src/routes/items');
const suppliersRoutes = require('./src/routes/suppliers');
const preferencesRoutes = require('./src/routes/preferences');
const picklistRoutes = require('./src/routes/picklist');
const shoppingListRoutes = require('./src/routes/shoppingList');

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

// Global middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
if (config.isProduction()) {
    app.use('/api/', rateLimit({
        windowMs: config.security.rateLimitWindowMs,
        maxRequests: config.security.rateLimitMaxRequests,
        message: 'Too many requests from this IP, please try again later'
    }));
}

// CORS configuration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.security.corsOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
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

// Request logging middleware
if (config.isDevelopment()) {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// API Routes
app.use('/api/items', itemsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/picklist', picklistRoutes);
app.use('/api/shopping-list', shoppingListRoutes);

// Legacy API endpoints for backward compatibility
app.get('/api/get-preference/:originalItem', (req, res, next) => {
    req.url = `/api/preferences/${req.params.originalItem}`;
    preferencesRoutes(req, res, next);
});

app.post('/api/store-preferences', (req, res, next) => {
    req.url = '/api/preferences';
    preferencesRoutes(req, res, next);
});

app.post('/api/match-item', (req, res, next) => {
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
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Start server
const server = app.listen(port, () => {
    console.log(`🚀 ${config.app.name} v${config.app.version}`);
    console.log(`🌐 Server running on http://${config.server.host}:${port}`);
    console.log(`📊 Environment: ${config.NODE_ENV}`);
    console.log(`💾 Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
    
    if (config.features.enableHealthCheck) {
        console.log(`🏥 Health check: http://${config.server.host}:${port}/health`);
    }
    
    console.log('✨ Server ready to accept connections');
});

module.exports = app;