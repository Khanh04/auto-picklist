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