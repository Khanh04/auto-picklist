const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AutoPicklistApp = require('./src/app');

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint for Coolify/Docker
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const { pool } = require('./src/database/config');
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

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

// Get all items for a specific supplier
app.get('/api/suppliers/:id/items', async (req, res) => {
    try {
        const { id } = req.params;
        const { pool } = require('./src/database/config');
        
        const result = await pool.query(`
            SELECT sp.id as supplier_price_id, p.id as product_id, p.description, sp.price, s.name as supplier_name
            FROM supplier_prices sp
            JOIN products p ON sp.product_id = p.id
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE sp.supplier_id = $1
            ORDER BY p.description
        `, [id]);
        
        res.json({
            success: true,
            items: result.rows
        });
    } catch (error) {
        console.error('Error fetching supplier items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch supplier items'
        });
    }
});

// Update item price for a supplier
app.put('/api/suppliers/:supplierId/items/:supplierPriceId', async (req, res) => {
    try {
        const { supplierId, supplierPriceId } = req.params;
        const { price } = req.body;
        
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid positive price is required'
            });
        }
        
        const { pool } = require('./src/database/config');
        
        const result = await pool.query(
            'UPDATE supplier_prices SET price = $1 WHERE id = $2 AND supplier_id = $3 RETURNING *',
            [parseFloat(price), supplierPriceId, supplierId]
        );
        
        if (result.rows.length > 0) {
            res.json({
                success: true,
                message: 'Price updated successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }
    } catch (error) {
        console.error('Error updating item price:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update item price'
        });
    }
});

// Delete item from supplier
app.delete('/api/suppliers/:supplierId/items/:supplierPriceId', async (req, res) => {
    try {
        const { supplierId, supplierPriceId } = req.params;
        const { pool } = require('./src/database/config');
        
        const result = await pool.query(
            'DELETE FROM supplier_prices WHERE id = $1 AND supplier_id = $2 RETURNING *',
            [supplierPriceId, supplierId]
        );
        
        if (result.rows.length > 0) {
            res.json({
                success: true,
                message: 'Item removed from supplier'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }
    } catch (error) {
        console.error('Error deleting supplier item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete supplier item'
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

// Get all items for matching
app.get('/api/items', async (req, res) => {
    try {
        const { pool } = require('./src/database/config');
        
        const result = await pool.query(`
            SELECT DISTINCT p.id, p.description,
                   s.name as supplier_name,
                   sp.price,
                   ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY sp.price ASC) as price_rank
            FROM products p
            JOIN supplier_prices sp ON p.id = sp.product_id
            JOIN suppliers s ON sp.supplier_id = s.id
            ORDER BY p.description
        `);
        
        // Group by product and get the best price for each
        const itemsMap = new Map();
        result.rows.forEach(row => {
            if (!itemsMap.has(row.id) || row.price_rank === 1) {
                itemsMap.set(row.id, {
                    id: row.id,
                    description: row.description,
                    bestSupplier: row.supplier_name,
                    bestPrice: row.price
                });
            }
        });
        
        res.json({
            success: true,
            items: Array.from(itemsMap.values())
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch items'
        });
    }
});

// Find best match for item
app.post('/api/match-item', async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Item description is required'
            });
        }
        
        const { findBestSupplier } = require('./src/modules/databaseLoader');
        const result = await findBestSupplier(description.trim());
        
        if (result.supplier && result.price) {
            res.json({
                success: true,
                match: {
                    supplier: result.supplier,
                    price: result.price,
                    productId: result.productId,
                    description: result.description
                }
            });
        } else {
            res.json({
                success: false,
                message: 'No matching item found'
            });
        }
    } catch (error) {
        console.error('Error matching item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to match item'
        });
    }
});

// Get all supplier options for a specific product
app.get('/api/products/:id/suppliers', async (req, res) => {
    try {
        const { id } = req.params;
        const { pool } = require('./src/database/config');
        
        const result = await pool.query(`
            SELECT s.name as supplier_name, sp.price, sp.id as supplier_price_id
            FROM supplier_prices sp
            JOIN suppliers s ON sp.supplier_id = s.id
            WHERE sp.product_id = $1
            ORDER BY sp.price ASC
        `, [id]);
        
        res.json({
            success: true,
            suppliers: result.rows
        });
    } catch (error) {
        console.error('Error fetching product suppliers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch product suppliers'
        });
    }
});

// Store user matching preferences for machine learning
app.post('/api/store-preferences', async (req, res) => {
    try {
        const { preferences } = req.body;
        
        if (!preferences || !Array.isArray(preferences)) {
            return res.status(400).json({
                success: false,
                error: 'Preferences array is required'
            });
        }
        
        const { pool } = require('./src/database/config');
        
        // Create matching_preferences table (product matching only)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS matching_preferences (
                id SERIAL PRIMARY KEY,
                original_item TEXT NOT NULL,
                matched_product_id INTEGER NOT NULL,
                frequency INTEGER DEFAULT 1,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (matched_product_id) REFERENCES products(id),
                UNIQUE(original_item, matched_product_id)
            )
        `);
        
        // Remove supplier columns if they exist (cleanup for existing databases)
        try {
            await pool.query('ALTER TABLE matching_preferences DROP COLUMN IF EXISTS preferred_supplier');
            await pool.query('ALTER TABLE matching_preferences DROP COLUMN IF EXISTS preferred_price');
        } catch (alterError) {
            // Columns might not exist, that's OK
            console.log('Note: Supplier columns may not exist to remove');
        }
        
        // Store each product matching preference (no supplier data)
        for (const pref of preferences) {
            await pool.query(`
                INSERT INTO matching_preferences (original_item, matched_product_id, frequency, last_used)
                VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (original_item, matched_product_id)
                DO UPDATE SET 
                    frequency = matching_preferences.frequency + 1,
                    last_used = CURRENT_TIMESTAMP
            `, [pref.originalItem, pref.matchedProductId]);
        }
        
        res.json({
            success: true,
            message: `Stored ${preferences.length} matching preferences`
        });
    } catch (error) {
        console.error('Error storing preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store matching preferences'
        });
    }
});

// Get all matching preferences
app.get('/api/preferences', async (req, res) => {
    try {
        const { pool } = require('./src/database/config');
        
        const result = await pool.query(`
            SELECT mp.id, mp.original_item, mp.frequency, mp.last_used, mp.created_at,
                   p.description as matched_description
            FROM matching_preferences mp
            JOIN products p ON mp.matched_product_id = p.id
            ORDER BY mp.last_used DESC, mp.frequency DESC
        `);
        
        res.json({
            success: true,
            preferences: result.rows
        });
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch preferences'
        });
    }
});

// Delete a matching preference
app.delete('/api/preferences/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { pool } = require('./src/database/config');
        
        const result = await pool.query(
            'DELETE FROM matching_preferences WHERE id = $1 RETURNING original_item',
            [id]
        );
        
        if (result.rows.length > 0) {
            res.json({
                success: true,
                message: `Preference for "${result.rows[0].original_item}" deleted successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Preference not found'
            });
        }
    } catch (error) {
        console.error('Error deleting preference:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete preference'
        });
    }
});

// Get matching preferences for an item
app.get('/api/get-preference/:originalItem', async (req, res) => {
    try {
        const { originalItem } = req.params;
        const { pool } = require('./src/database/config');
        
        // Get the product preference (no supplier data stored)
        let result = await pool.query(`
            SELECT mp.matched_product_id, mp.frequency, p.description
            FROM matching_preferences mp
            JOIN products p ON mp.matched_product_id = p.id
            WHERE LOWER(mp.original_item) = LOWER($1)
            ORDER BY mp.frequency DESC, mp.last_used DESC
            LIMIT 1
        `, [originalItem]);
        
        if (result.rows.length > 0) {
            res.json({
                success: true,
                preference: {
                    productId: result.rows[0].matched_product_id,
                    description: result.rows[0].description,
                    frequency: result.rows[0].frequency
                }
            });
        } else {
            res.json({
                success: false,
                message: 'No preference found'
            });
        }
    } catch (error) {
        console.error('Error getting preference:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get preference'
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
    console.log(`Auto Picklist Web App running on http://localhost:${port}`);
    console.log('Upload CSV files to generate optimized pick lists');
    
    // Clean up old files on startup
    cleanupOldFiles();
    
    // Set up periodic cleanup (every hour)
    setInterval(cleanupOldFiles, 60 * 60 * 1000);
});

module.exports = app;