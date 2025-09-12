const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;

const { asyncHandler } = require('../middleware/errorHandler');
const { pool } = require('../database/config');
const { ExcelImportService } = require('../services/ExcelImportService');
const { 
    secureValidateFileUpload, 
    preventRequestBombing 
} = require('../middleware/secureValidation');
const { secureQuery } = require('../utils/secureDb');

// Configure multer for file uploads with enhanced security
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1, // Only allow single file upload
        fieldSize: 1024 * 1024, // 1MB field size limit
        fieldNameSize: 100, // Limit field name size
        headerPairs: 20 // Limit header pairs
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
        }
    }
});

/**
 * POST /api/database/import-excel
 * Import suppliers and items from Excel file using centralized service
 */
router.post('/import-excel', 
    preventRequestBombing({ maxBodySize: 15 * 1024 * 1024 }), // 15MB for file uploads
    upload.single('file'), 
    secureValidateFileUpload({
        required: true,
        allowedTypes: [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
            'text/csv'
        ],
        maxSize: 10 * 1024 * 1024,
        allowedExtensions: ['xlsx', 'xls', 'csv'],
        checkMagicNumbers: false // Disable for Excel files as they're complex
    }),
    asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No file uploaded'
        });
    }

    const filePath = req.file.path;
    
    try {
        console.log('📊 Starting Excel data import from web upload...');
        
        const importService = new ExcelImportService();
        const result = await importService.importExcelFile(filePath, {
            preserveData: true, // Use additive import by default for web uploads
            progressCallback: (progress) => {
                // Could emit WebSocket events for real-time progress here
                console.log(`Progress: ${progress.processedRows}/${progress.totalRows}`);
            }
        });
        
        // Clean up uploaded file
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            console.error('Failed to delete uploaded file:', unlinkError);
        }

        // Return success response with adjusted format for existing frontend
        res.json({
            success: true,
            message: 'Excel file imported successfully',
            summary: {
                totalRows: result.summary.totalRows,
                suppliersAdded: result.summary.suppliers,
                itemsAdded: result.summary.totalProducts,
                pricesAdded: result.summary.totalPrices,
                errors: result.summary.errors,
                // Additional info for new additive approach
                newProducts: result.summary.newProducts,
                updatedProducts: result.summary.updatedProducts,
                newPrices: result.summary.newPrices,
                updatedPrices: result.summary.updatedPrices
            },
            errors: result.errors,
            warnings: result.warnings
        });
        
    } catch (error) {
        // Clean up uploaded file on error
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            console.error('Failed to delete uploaded file:', unlinkError);
        }
        
        console.error('Excel import error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to import Excel file'
        });
    }
}));

/**
 * GET /api/database/export-excel
 * Export database data as Excel file
 */
router.get('/export-excel', asyncHandler(async (req, res) => {
    const client = await pool.connect();
    
    try {
        console.log('📤 Starting Excel data export...');
        
        // Get all suppliers
        const suppliersResult = await client.query('SELECT * FROM suppliers ORDER BY name');
        const suppliers = suppliersResult.rows;
        
        if (suppliers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No suppliers found to export'
            });
        }
        
        // Get all products with their prices
        const productsQuery = `
            SELECT 
                p.description,
                s.name as supplier_name,
                sp.price
            FROM products p
            LEFT JOIN supplier_prices sp ON p.id = sp.product_id
            LEFT JOIN suppliers s ON sp.supplier_id = s.id
            ORDER BY p.description, s.name
        `;
        const productsResult = await client.query(productsQuery);
        const productData = productsResult.rows;
        
        // Group products by description
        const productMap = new Map();
        productData.forEach(row => {
            if (!productMap.has(row.description)) {
                productMap.set(row.description, {});
            }
            if (row.supplier_name && row.price) {
                productMap.get(row.description)[row.supplier_name] = row.price;
            }
        });
        
        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        
        // Prepare data in price matrix format
        const excelData = [];
        const supplierNames = suppliers.map(s => s.name).sort();
        
        // Add header row
        excelData.push(['Item/Product/Description', ...supplierNames]);
        
        // Add product rows
        for (const [description, prices] of productMap.entries()) {
            const row = [description];
            for (const supplierName of supplierNames) {
                row.push(prices[supplierName] || '');
            }
            excelData.push(row);
        }
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        
        // Auto-size columns
        const colWidths = [];
        excelData[0].forEach((header, index) => {
            let maxLength = header.length;
            excelData.forEach(row => {
                if (row[index] && row[index].toString().length > maxLength) {
                    maxLength = row[index].toString().length;
                }
            });
            colWidths.push({ width: Math.min(maxLength + 2, 50) });
        });
        worksheet['!cols'] = colWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Price List');
        
        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx',
            compression: true
        });
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `database-export-${timestamp}.xlsx`;
        
        console.log(`✅ Export completed: ${productMap.size} products, ${suppliers.length} suppliers`);
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        
        // Send the Excel file
        res.end(excelBuffer);
        
    } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export database'
        });
    } finally {
        client.release();
    }
}));

module.exports = router;