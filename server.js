const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AutoPicklistApp = require('./src/app');

const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        // Keep original filename with timestamp prefix
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept only CSV files
        if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('Processing uploaded file:', req.file.filename);

        // Create picklist app instance with uploaded file (using database)
        const picklistApp = new AutoPicklistApp({
            inputType: 'ebay',
            ebayInputPath: req.file.path,
            useDatabase: true, // Use PostgreSQL database
            csvOutputPath: `uploads/output-${Date.now()}.csv`,
            pdfOutputPath: `uploads/output-${Date.now()}.pdf`
        });

        // Process the picklist
        const result = await picklistApp.run();

        if (result.success) {
            console.log('📋 Server: Picklist items:', result.picklist ? result.picklist.length : 'none');
            console.log('📋 Server: Has picklistData:', !!result.picklistData);
            console.log('📋 Server: Result keys:', Object.keys(result));
            
            // Include the picklist data in the response for preview
            if (result.picklistData) {
                result.picklist = result.picklistData;
            }
            
            const responseData = {
                success: true,
                picklist: result.picklist,
                summary: result.summary,
                csvPath: result.files.csv,
                pdfPath: result.files.pdf,
                message: 'Picklist generated successfully!'
            };
            
            console.log('📋 Server: Response picklist items:', responseData.picklist ? responseData.picklist.length : 'none');
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            res.json(responseData);
        } else {
            // Clean up uploaded file on error
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ 
                success: false, 
                error: result.error || 'Failed to process picklist'
            });
        }

    } catch (error) {
        console.error('Upload processing error:', error);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Server error processing file'
        });
    }
});

// Get all suppliers for database management
app.get('/api/suppliers', async (req, res) => {
    try {
        const { pool } = require('./src/database/config');
        
        const result = await pool.query(`
            SELECT s.id, s.name, COUNT(sp.product_id) as product_count
            FROM suppliers s
            LEFT JOIN supplier_prices sp ON s.id = sp.supplier_id
            GROUP BY s.id, s.name
            ORDER BY s.name
        `);
        
        res.json({
            success: true,
            suppliers: result.rows
        });
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch suppliers'
        });
    }
});

// Add new supplier
app.post('/api/suppliers', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Supplier name is required'
            });
        }
        
        const { pool } = require('./src/database/config');
        
        // Check if supplier already exists
        const existingResult = await pool.query(
            'SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );
        
        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Supplier already exists'
            });
        }
        
        // Insert new supplier
        const result = await pool.query(
            'INSERT INTO suppliers (name) VALUES ($1) RETURNING id, name',
            [name.trim()]
        );
        
        res.json({
            success: true,
            supplier: result.rows[0],
            message: 'Supplier added successfully'
        });
    } catch (error) {
        console.error('Error adding supplier:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add supplier'
        });
    }
});

// Add new item with supplier and price
app.post('/api/items', async (req, res) => {
    try {
        const { description, supplier, price } = req.body;
        
        if (!description || !supplier || !price) {
            return res.status(400).json({
                success: false,
                error: 'Description, supplier, and price are required'
            });
        }
        
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Price must be a valid positive number'
            });
        }
        
        const { pool } = require('./src/database/config');
        
        // Start transaction
        await pool.query('BEGIN');
        
        try {
            // Get supplier ID
            const supplierResult = await pool.query(
                'SELECT id FROM suppliers WHERE name = $1',
                [supplier]
            );
            
            if (supplierResult.rows.length === 0) {
                throw new Error('Supplier not found');
            }
            
            const supplierId = supplierResult.rows[0].id;
            
            // Check if product already exists
            let productId;
            const existingProduct = await pool.query(
                'SELECT id FROM products WHERE LOWER(description) = LOWER($1)',
                [description.trim()]
            );
            
            if (existingProduct.rows.length > 0) {
                productId = existingProduct.rows[0].id;
                
                // Check if this supplier already has this product
                const existingPrice = await pool.query(
                    'SELECT id FROM supplier_prices WHERE product_id = $1 AND supplier_id = $2',
                    [productId, supplierId]
                );
                
                if (existingPrice.rows.length > 0) {
                    throw new Error('This supplier already has this product');
                }
            } else {
                // Insert new product
                const productResult = await pool.query(
                    'INSERT INTO products (description) VALUES ($1) RETURNING id',
                    [description.trim()]
                );
                productId = productResult.rows[0].id;
            }
            
            // Insert supplier price
            await pool.query(
                'INSERT INTO supplier_prices (product_id, supplier_id, price) VALUES ($1, $2, $3)',
                [productId, supplierId, numericPrice]
            );
            
            await pool.query('COMMIT');
            
            res.json({
                success: true,
                message: 'Item added successfully'
            });
        } catch (err) {
            await pool.query('ROLLBACK');
            throw err;
        }
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to add item'
        });
    }
});

// Export edited picklist
app.post('/export', async (req, res) => {
    try {
        const { picklist, summary } = req.body;

        if (!picklist || !Array.isArray(picklist)) {
            return res.status(400).json({ error: 'Invalid picklist data' });
        }

        const timestamp = Date.now();
        const csvOutputPath = `uploads/output-${timestamp}.csv`;
        const pdfOutputPath = `uploads/output-${timestamp}.pdf`;

        // Convert picklist to CSV
        const csvHeaders = 'quantity,item,selectedSupplier,unitPrice,totalPrice\n';
        const csvRows = picklist.map(row => {
            const values = [
                row.quantity,
                `"${(row.item || '').replace(/"/g, '""')}"`, // Escape quotes
                row.selectedSupplier || '',
                row.unitPrice || '',
                row.totalPrice || ''
            ];
            return values.join(',');
        });
        const csvContent = csvHeaders + csvRows.join('\n');
        
        fs.writeFileSync(csvOutputPath, csvContent);

        // Generate PDF using existing module
        const { generatePDF } = require('./src/modules/pdfGenerator');
        generatePDF(picklist, pdfOutputPath);

        res.json({
            success: true,
            message: 'Picklist exported successfully!',
            csvPath: csvOutputPath,
            pdfPath: pdfOutputPath,
            summary: summary
        });

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Server error during export'
        });
    }
});

app.get('/download/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
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
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }, 1000); // 1 second delay to ensure download completes
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Clean up old files on startup
function cleanupOldFiles() {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour

        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
                console.log('Cleaned up old file:', file);
            }
        });
    }
}

// Start server
app.listen(port, () => {
    console.log(`🚀 Auto Picklist Web App running on http://localhost:${port}`);
    console.log('📁 Upload CSV files to generate optimized pick lists');
    
    // Clean up old files on startup
    cleanupOldFiles();
    
    // Set up periodic cleanup (every hour)
    setInterval(cleanupOldFiles, 60 * 60 * 1000);
});

module.exports = app;