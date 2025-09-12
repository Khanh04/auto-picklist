const request = require('supertest');
const { 
  createTestApp, 
  validateSuccessResponse, 
  validateErrorResponse,
  createTestFile,
  cleanupTestFiles,
  testCSV
} = require('../helpers/testHelpers');

// Mock the MultiCsvProcessor
jest.mock('../../src/services/MultiCsvProcessor');

const MultiCsvProcessor = require('../../src/services/MultiCsvProcessor');

describe('Multi-CSV Routes', () => {
  let app;
  let mockMultiCsvProcessor;

  beforeEach(() => {
    app = createTestApp();

    // Mock MultiCsvProcessor
    mockMultiCsvProcessor = {
      processMultipleCsvFiles: jest.fn(),
      validateFiles: jest.fn(),
      combinePicklists: jest.fn(),
      generateAnalytics: jest.fn()
    };
    MultiCsvProcessor.mockImplementation(() => mockMultiCsvProcessor);

    // Import and use the multiCsv route
    const multiCsvRouter = require('../../src/routes/multiCsv');
    app.use('/api/multi-csv', multiCsvRouter);
    
    // Add enhanced error handling middleware
    const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
    app.use(enhancedErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanupTestFiles();
  });

  describe('POST /api/multi-csv/upload', () => {
    const mockProcessingResult = {
      combinedPicklist: [
        { item: 'Item A', quantity: 10, selectedSupplier: 'Supplier 1' },
        { item: 'Item B', quantity: 5, selectedSupplier: 'Supplier 2' }
      ],
      files: [
        { filename: 'file1.csv', itemCount: 5, status: 'processed' },
        { filename: 'file2.csv', itemCount: 3, status: 'processed' }
      ],
      overallSummary: {
        totalFiles: 2,
        totalItems: 15,
        totalUniqueItems: 8,
        totalQuantity: 25
      },
      analytics: {
        supplierAnalysis: {
          totalSuppliers: 3,
          supplierBreakdown: { 'Supplier 1': 10, 'Supplier 2': 5 }
        },
        itemAnalysis: {
          duplicateItems: ['Item A'],
          uniqueItems: ['Item B']
        }
      },
      metadata: {
        filesProcessed: 2,
        totalOriginalItems: 15,
        totalUniqueItems: 8,
        processingTime: 1500
      },
      individualSummaries: [
        { filename: 'file1.csv', itemCount: 5, totalQuantity: 15 },
        { filename: 'file2.csv', itemCount: 3, totalQuantity: 10 }
      ]
    };

    it('should process multiple CSV files successfully', async () => {
      const file1Path = createTestFile('file1.csv', testCSV);
      const file2Path = createTestFile('file2.csv', 'Item,Quantity\nItem D,2\nItem E,8');

      mockMultiCsvProcessor.validateFiles.mockResolvedValue({ valid: true, errors: [] });
      mockMultiCsvProcessor.processMultipleCsvFiles.mockResolvedValue(mockProcessingResult);

      const response = await request(app)
        .post('/api/multi-csv/upload')
        .attach('files', file1Path)
        .attach('files', file2Path)
        .field('useDatabase', 'true')
        .expect(200);

      validateSuccessResponse(response, [
        'combinedPicklist', 
        'files', 
        'overallSummary', 
        'analytics', 
        'metadata',
        'individualSummaries'
      ]);
      
      expect(response.body.data.combinedPicklist).toHaveLength(2);
      expect(response.body.data.files).toHaveLength(2);
      expect(response.body.data.overallSummary.totalFiles).toBe(2);
      expect(response.body.meta.message).toContain('CSV files processed successfully');
    });

    it('should validate multiple files are uploaded', async () => {
      const response = await request(app)
        .post('/api/multi-csv/upload')
        .field('useDatabase', 'true')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
      expect(response.body.error.message).toContain('No files uploaded');
    });

    it('should require at least 2 files for multi-CSV processing', async () => {
      const filePath = createTestFile('single.csv', testCSV);

      const response = await request(app)
        .post('/api/multi-csv/upload')
        .attach('files', filePath)
        .field('useDatabase', 'true')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
      expect(response.body.error.message).toContain('At least 2 CSV files required');
    });

    it('should validate file types are CSV', async () => {
      const csvPath = createTestFile('file1.csv', testCSV);
      const txtPath = createTestFile('file2.txt', 'not csv');

      mockMultiCsvProcessor.validateFiles.mockResolvedValue({ 
        valid: false, 
        errors: ['file2.txt is not a valid CSV file'] 
      });

      const response = await request(app)
        .post('/api/multi-csv/upload')
        .attach('files', csvPath)
        .attach('files', txtPath)
        .field('useDatabase', 'true')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should handle processing errors', async () => {
      const file1Path = createTestFile('file1.csv', testCSV);
      const file2Path = createTestFile('file2.csv', testCSV);

      mockMultiCsvProcessor.validateFiles.mockResolvedValue({ valid: true, errors: [] });
      mockMultiCsvProcessor.processMultipleCsvFiles.mockRejectedValue(
        new Error('Processing failed')
      );

      const response = await request(app)
        .post('/api/multi-csv/upload')
        .attach('files', file1Path)
        .attach('files', file2Path)
        .field('useDatabase', 'true')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });

    it('should handle file size limit errors', async () => {
      // Create a large mock file
      const largeCsv = 'Item,Quantity\n' + 'Large Item,1\n'.repeat(10000);
      const largePath = createTestFile('large.csv', largeCsv);
      const normalPath = createTestFile('normal.csv', testCSV);

      mockMultiCsvProcessor.validateFiles.mockResolvedValue({ 
        valid: false, 
        errors: ['File large.csv exceeds size limit'] 
      });

      const response = await request(app)
        .post('/api/multi-csv/upload')
        .attach('files', largePath)
        .attach('files', normalPath)
        .field('useDatabase', 'true')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should process with legacy mode when useDatabase is false', async () => {
      const file1Path = createTestFile('file1.csv', testCSV);
      const file2Path = createTestFile('file2.csv', testCSV);

      mockMultiCsvProcessor.validateFiles.mockResolvedValue({ valid: true, errors: [] });
      mockMultiCsvProcessor.processMultipleCsvFiles.mockResolvedValue(mockProcessingResult);

      const response = await request(app)
        .post('/api/multi-csv/upload')
        .attach('files', file1Path)
        .attach('files', file2Path)
        .field('useDatabase', 'false')
        .expect(200);

      validateSuccessResponse(response);
      expect(mockMultiCsvProcessor.processMultipleCsvFiles).toHaveBeenCalledWith(
        expect.any(Array),
        { useDatabase: false }
      );
    });
  });

  describe('GET /api/multi-csv/templates', () => {
    it('should return CSV processing templates', async () => {
      const response = await request(app)
        .get('/api/multi-csv/templates')
        .expect(200);

      validateSuccessResponse(response, ['templates']);
      expect(response.body.data.templates).toBeInstanceOf(Array);
      expect(response.body.data.templates.length).toBeGreaterThan(0);
      
      const template = response.body.data.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('headers');
    });
  });

  describe('POST /api/multi-csv/validate', () => {
    it('should validate multiple CSV files without processing', async () => {
      const file1Path = createTestFile('file1.csv', testCSV);
      const file2Path = createTestFile('file2.csv', testCSV);

      mockMultiCsvProcessor.validateFiles.mockResolvedValue({ 
        valid: true, 
        errors: [],
        warnings: ['File2 has duplicate items'],
        fileInfo: [
          { filename: 'file1.csv', rows: 3, columns: 2 },
          { filename: 'file2.csv', rows: 3, columns: 2 }
        ]
      });

      const response = await request(app)
        .post('/api/multi-csv/validate')
        .attach('files', file1Path)
        .attach('files', file2Path)
        .expect(200);

      validateSuccessResponse(response, ['validation']);
      expect(response.body.data.validation.valid).toBe(true);
      expect(response.body.data.validation.fileInfo).toHaveLength(2);
    });

    it('should return validation errors for invalid files', async () => {
      const invalidPath = createTestFile('invalid.csv', 'Invalid,CSV\nMissing,');

      mockMultiCsvProcessor.validateFiles.mockResolvedValue({ 
        valid: false, 
        errors: ['Missing required columns in invalid.csv'],
        warnings: []
      });

      const response = await request(app)
        .post('/api/multi-csv/validate')
        .attach('files', invalidPath)
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });
  });
});