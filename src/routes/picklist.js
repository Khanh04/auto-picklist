const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const PicklistService = require('../services/PicklistService');
const AutoPicklistApp = require('../app');
const { enhancedAsyncHandler, createValidationError } = require('../middleware/enhancedErrorHandler');
const { sendSuccessResponse } = require('../utils/errorResponse');
const { validateFileUpload, validateBody } = require('../middleware/validation');

const picklistService = new PicklistService();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 // 5MB default
    }
});

/**
 * POST /api/picklist/upload
 * Upload file and generate picklist
 */
router.post('/upload',
    upload.single('file'),
    validateFileUpload({
        required: true,
        allowedTypes: ['text/csv', 'application/pdf'],
        maxSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024
    }),
    enhancedAsyncHandler(async (req, res) => {
        const file = req.file;
        const useDatabase = req.body.useDatabase === 'true';

        if (!file) {
            throw createValidationError(['file'], 'No file uploaded');
        }

        const app = new AutoPicklistApp();
        let result;

        if (useDatabase) {
            // Use database matching
            if (file.mimetype === 'application/pdf') {
                const orderItems = await app.parsePDF(file.path);
                result = await picklistService.createPicklistFromDatabase(orderItems);
            } else if (file.mimetype === 'text/csv') {
                const orderItems = await app.parseCSV(file.path);
                result = await picklistService.createPicklistFromDatabase(orderItems);
            } else {
                throw createValidationError(['file'], 'Unsupported file type');
            }

            const summary = picklistService.calculateSummary(result);
            const validation = picklistService.validatePicklist(result);

            sendSuccessResponse(req, res, {
                picklist: result,
                summary,
                validation,
                filename: file.originalname,
                useDatabase: true
            }, {
                message: 'Picklist generated successfully using database matching'
            });

        } else {
            // Use legacy price list matching
            if (file.mimetype === 'application/pdf') {
                result = await app.processPDF(file.path);
            } else if (file.mimetype === 'text/csv') {
                result = await app.processCSV(file.path);
            } else {
                throw createValidationError(['file'], 'Unsupported file type');
            }

            sendSuccessResponse(req, res, {
                ...result,
                filename: file.originalname,
                useDatabase: false
            }, {
                message: 'Picklist generated successfully using price list matching'
            });
        }
    })
);

/**
 * POST /api/picklist/validate
 * Validate picklist data
 */
router.post('/validate',
    validateBody({
        picklist: { required: true, type: 'array' }
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { picklist } = req.body;
        
        const validation = picklistService.validatePicklist(picklist);
        const summary = picklistService.calculateSummary(picklist);

        sendSuccessResponse(req, res, {
            validation,
            summary
        });
    })
);

/**
 * POST /api/picklist/export
 * Export picklist to different formats
 */
router.post('/export',
    validateBody({
        picklist: { required: true, type: 'array' },
        format: { type: 'string', custom: (value) => {
            if (value && !['csv', 'json'].includes(value.toLowerCase())) {
                return 'must be either "csv" or "json"';
            }
            return null;
        }}
    }),
    enhancedAsyncHandler(async (req, res) => {
        const { picklist, format = 'csv' } = req.body;
        
        const exportedData = picklistService.exportPicklist(picklist, format);
        
        const contentType = format === 'json' ? 'application/json' : 'text/csv';
        const filename = `picklist_${Date.now()}.${format}`;
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportedData);
    })
);

/**
 * GET /api/picklist/templates
 * Get available picklist templates
 */
router.get('/templates', enhancedAsyncHandler(async (req, res) => {
    const templates = [
        {
            id: 'standard',
            name: 'Standard Picklist',
            description: 'Basic picklist with item, quantity, supplier, and pricing',
            fields: ['item', 'quantity', 'supplier', 'unitPrice', 'totalPrice']
        },
        {
            id: 'detailed',
            name: 'Detailed Picklist',
            description: 'Comprehensive picklist with all available fields',
            fields: ['item', 'quantity', 'supplier', 'unitPrice', 'totalPrice', 'description', 'category']
        },
        {
            id: 'summary',
            name: 'Summary View',
            description: 'Condensed view for quick overview',
            fields: ['item', 'quantity', 'totalPrice']
        }
    ];

    sendSuccessResponse(req, res, { templates });
}));

module.exports = router;