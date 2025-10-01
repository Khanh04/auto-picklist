const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MultiCsvService = require('../services/MultiCsvService');
const { enhancedAsyncHandler, createValidationError } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse } = require('../utils/errorResponse');
const { validateFileUpload } = require('../middleware/validation');

// MultiCsvService will be created per request with user context

// Configure multer for multiple file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/multi-csv';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${originalName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10 // Maximum 10 files
    },
    fileFilter: function (req, file, cb) {
        // Accept only CSV files
        if (file.mimetype === 'text/csv' || 
            file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

/**
 * POST /api/multi-csv/upload
 * Upload single or multiple CSV/PDF files and generate picklist
 * Unified endpoint supporting both single and multi-file processing
 */
router.post('/upload',
    upload.array('files', 10), // Accept up to 10 files with field name 'files'
    enhancedAsyncHandler(async (req, res) => {
        const files = req.files;
        const useDatabase = req.body.useDatabase !== 'false'; // Default to true

        // Extract user context (may be null for anonymous users)
        const userId = req.user ? req.user.id : null;

        if (!files || files.length === 0) {
            throw createValidationError(['files'], 'No files uploaded');
        }

        if (files.length > 10) {
            throw createValidationError(['files'], 'Maximum 10 files allowed at once');
        }

        // Validate file types (only CSV supported)
        for (const file of files) {
            if (!file.mimetype.includes('csv') && !file.originalname.toLowerCase().endsWith('.csv')) {
                throw createValidationError(['files'], `Unsupported file type: ${file.mimetype}. Only CSV files are supported.`);
            }
        }

        console.log(`Processing ${files.length} CSV file(s) with user context: ${userId || 'anonymous'}...`);

        try {
            // Create service instance with user context
            const multiCsvService = new MultiCsvService(userId);

            // Handle single file case for backwards compatibility
            if (files.length === 1) {
                const file = files[0];

                // For single file, return simpler structure similar to original /api/picklist/upload
                const orderItems = await multiCsvService.parseCSVFile(file.path);
                const picklist = await multiCsvService.picklistService.createIntelligentPicklist(orderItems);
                const summary = multiCsvService.picklistService.calculateSummary(picklist);
                const validation = multiCsvService.picklistService.validatePicklist(picklist);

                // Return single file format for backwards compatibility
                const response = {
                    picklist,
                    summary,
                    validation,
                    filename: file.originalname,
                    useDatabase: true,
                    itemCount: orderItems.length,
                    // Also include multi-format structure for unified handling
                    multiFormat: {
                        success: true,
                        files: [{
                            filename: file.originalname,
                            itemCount: orderItems.length,
                            picklist: picklist,
                            summary: summary
                        }],
                        combinedPicklist: picklist,
                        overallSummary: summary,
                        metadata: {
                            filesProcessed: 1,
                            totalItems: orderItems.length,
                            processingTime: Date.now()
                        }
                    }
                };

                sendSuccessResponse(req, res, response, {
                    message: `Successfully processed ${orderItems.length} items from ${file.originalname}`
                });
                return;
            }

            // Handle multiple files case
            const results = await multiCsvService.processMultipleCSVs(files, useDatabase);

            // Clean up uploaded files
            files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.warn(`Failed to cleanup file ${file.path}:`, err.message);
                }
            });

            sendSuccessResponse(req, res, {
                ...results,
                timestamp: new Date().toISOString()
            }, {
                message: `Successfully processed ${results.metadata.filesProcessed} CSV files`
            });

        } catch (error) {
            console.error('Error processing multiple CSV files:', error);
            
            // Clean up uploaded files on error
            files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.warn(`Failed to cleanup file ${file.path}:`, err.message);
                }
            });

            throw error; // Re-throw to be handled by enhanced error handler
        }
    })
);

/**
 * POST /api/multi-csv/export
 * Export combined results from multiple CSV processing
 */
router.post('/export',
    enhancedAsyncHandler(async (req, res) => {
        const { results, format = 'csv' } = req.body;

        // Extract user context (may be null for anonymous users)
        const userId = req.user ? req.user.id : null;

        if (!results || !results.combinedPicklist) {
            throw createValidationError(['results'], 'No processing results provided');
        }

        // Create service instance with user context
        const multiCsvService = new MultiCsvService(userId);
        const exportedData = multiCsvService.exportCombinedResults(results, format);
        
        // Set appropriate headers based on format
        let contentType, filename;
        
        switch (format.toLowerCase()) {
            case 'json':
                contentType = 'application/json';
                filename = `multi-csv-results-${Date.now()}.json`;
                break;
            case 'summary':
                contentType = 'text/plain';
                filename = `multi-csv-summary-${Date.now()}.txt`;
                break;
            case 'csv':
            default:
                contentType = 'text/csv';
                filename = `multi-csv-combined-${Date.now()}.csv`;
                break;
        }
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportedData);
    })
);

/**
 * POST /api/multi-csv/analyze
 * Analyze uploaded CSV files without generating picklist (preview mode)
 */
router.post('/analyze',
    upload.array('files', 10),
    enhancedAsyncHandler(async (req, res) => {
        const files = req.files;

        // Extract user context (may be null for anonymous users)
        const userId = req.user ? req.user.id : null;

        if (!files || files.length === 0) {
            throw createValidationError(['files'], 'No CSV files uploaded');
        }

        try {
            // Create service instance with user context
            const multiCsvService = new MultiCsvService(userId);

            const analysis = {
                files: [],
                totalItems: 0,
                estimatedProcessingTime: 0
            };

            // Analyze each file without full processing
            for (const file of files) {
                try {
                    const orderItems = await multiCsvService.parseCSVFile(file.path);
                    
                    analysis.files.push({
                        filename: file.originalname,
                        size: file.size,
                        itemCount: orderItems.length,
                        sampleItems: orderItems.slice(0, 5), // First 5 items as preview
                        status: 'valid'
                    });
                    
                    analysis.totalItems += orderItems.length;
                    
                } catch (error) {
                    analysis.files.push({
                        filename: file.originalname,
                        size: file.size,
                        itemCount: 0,
                        error: error.message,
                        status: 'error'
                    });
                }
            }

            // Estimate processing time (rough calculation)
            analysis.estimatedProcessingTime = Math.ceil(analysis.totalItems * 0.1); // ~0.1 seconds per item

            // Clean up uploaded files
            files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.warn(`Failed to cleanup file ${file.path}:`, err.message);
                }
            });

            sendSuccessResponse(req, res, analysis);

        } catch (error) {
            console.error('Error analyzing CSV files:', error);
            
            // Clean up uploaded files on error
            files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.warn(`Failed to cleanup file ${file.path}:`, err.message);
                }
            });

            throw error; // Re-throw to be handled by enhanced error handler
        }
    })
);

/**
 * GET /api/multi-csv/templates
 * Get information about supported CSV formats
 */
router.get('/templates', enhancedAsyncHandler(async (req, res) => {
    const templates = [
        {
            id: 'ebay',
            name: 'eBay Order Export',
            description: 'Standard eBay order export format',
            requiredColumns: ['quantity', 'title'],
            sampleColumns: ['Order Number', 'Quantity', 'Title', 'Price', 'Buyer'],
            example: 'quantity,title\n2,OPI Nail Polish Red\n1,DND Gel Base Coat'
        },
        {
            id: 'generic',
            name: 'Generic CSV',
            description: 'Generic CSV format with quantity and item columns',
            requiredColumns: ['quantity/qty', 'item/product/name/title'],
            sampleColumns: ['qty', 'product', 'price'],
            example: 'qty,product,price\n3,Essie Nail Polish Blue,5.99\n1,Sally Hansen Top Coat,3.99'
        },
        {
            id: 'inventory',
            name: 'Inventory Format',
            description: 'Inventory-style format with SKU and descriptions',
            requiredColumns: ['quantity/amount', 'description/sku/part'],
            sampleColumns: ['amount', 'sku', 'description', 'supplier'],
            example: 'amount,description,sku\n5,CND Base Coat 0.5oz,CND-BASE-001\n2,OPI Top Coat,OPI-TOP-002'
        }
    ];

    sendSuccessResponse(req, res, {
        templates,
        notes: [
            'Column names are case-insensitive and flexible',
            'CSV files should have headers in the first row',
            'Quantity columns: quantity, qty, amount, count, pieces, pcs',
            'Item columns: title, item, product, name, description, sku, part',
            'Supports both single CSV file and multiple CSV files',
            'Multiple CSV files will be automatically consolidated',
            'Maximum 10 files per upload, 10MB per file',
            'Uses advanced database matching with user preference support'
        ]
    });
}));

module.exports = router;