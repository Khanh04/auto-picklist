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

// Export route for frontend compatibility
app.post('/export', async (req, res) => {
    try {
        const { picklist, summary } = req.body;

        if (!picklist || !Array.isArray(picklist)) {
            return res.status(400).json({ error: 'Invalid picklist data' });
        }

        const timestamp = Date.now();
        const csvOutputPath = `uploads/output-${timestamp}.csv`;
        const pdfOutputPath = `uploads/output-${timestamp}.pdf`;

        // Prepare picklist data with matched items for better display
        const processedPicklist = picklist.map(row => ({
            ...row,
            // Use matched description if available, otherwise use original item
            item: row.matchedDescription || row.item
        }));

        // Convert picklist to CSV with proper data sanitization
        const csvHeaders = 'quantity,item,selectedSupplier,unitPrice,totalPrice\n';
        const csvRows = processedPicklist.map(row => {
            const values = [
                (row.quantity || 0).toString(),
                `"${(row.item || '').replace(/"/g, '""').replace(/[\r\n]/g, ' ')}"`, // Escape quotes and newlines
                `"${(row.selectedSupplier || '').replace(/"/g, '""')}"`,
                (row.unitPrice || '').toString(),
                (row.totalPrice || '').toString()
            ];
            return values.join(',');
        });
        const csvContent = csvHeaders + csvRows.join('\n');
        
        require('fs').writeFileSync(csvOutputPath, csvContent, 'utf8');

        // Generate PDF using existing module
        const { generatePDF } = require('./src/modules/pdfGenerator');
        generatePDF(processedPicklist, pdfOutputPath);

        res.json({
            success: true,
            message: 'Picklist exported successfully!',
            csvPath: csvOutputPath,
            pdfPath: pdfOutputPath,
            summary: summary
        });

    } catch (error) {
        console.error('Export error:', error.message);
        // Security: Don't expose internal error details
        res.status(500).json({ error: 'Failed to export picklist' });
    }
});

// Download route for exported files
app.get('/download/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    
    // Security: Validate file type parameter
    if (!['pdf', 'csv'].includes(type)) {
        return res.status(400).json({ error: 'Invalid file type' });
    }
    
    // Security: Validate filename to prevent path traversal attacks
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Security: Only allow files that match our expected pattern
    if (!/^output-\d+\.(pdf|csv)$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename format' });
    }
    
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!require('fs').existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers based on file type
    if (type === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="picklist-${Date.now()}.pdf"`);
    } else if (type === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="picklist-${Date.now()}.csv"`);
    }

    // Send file and clean up after download
    res.sendFile(filePath, (err) => {
        if (!err) {
            // Delete file after successful download
            setTimeout(() => {
                if (require('fs').existsSync(filePath)) {
                    require('fs').unlinkSync(filePath);
                }
            }, 1000); // 1 second delay to ensure download completes
        }
    });
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