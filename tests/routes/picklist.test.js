const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { 
  createTestApp, 
  createMockClient, 
  validateSuccessResponse, 
  validateErrorResponse,
  createTestFile,
  cleanupTestFiles,
  testCSV
} = require('../helpers/testHelpers');

// Mock the database
jest.mock('../../src/database/config', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }
}));

// Mock the PicklistService and AutoPicklistApp
jest.mock('../../src/services/PicklistService');
jest.mock('../../src/app');

const { pool } = require('../../src/database/config');
const PicklistService = require('../../src/services/PicklistService');
const AutoPicklistApp = require('../../src/app');

describe('Picklist Routes', () => {
  let app;
  let mockClient;
  let mockPicklistService;
  let mockAutoPicklistApp;
  let testFilePath;

  beforeEach(() => {
    app = createTestApp();
    mockClient = createMockClient();
    pool.connect.mockResolvedValue(mockClient);

    // Mock PicklistService
    mockPicklistService = {
      createPicklistFromDatabase: jest.fn(),
      calculateSummary: jest.fn(),
      validatePicklist: jest.fn(),
      exportPicklist: jest.fn()
    };
    PicklistService.mockImplementation(() => mockPicklistService);

    // Mock AutoPicklistApp
    mockAutoPicklistApp = {
      parseCSV: jest.fn(),
      parsePDF: jest.fn(),
      processCSV: jest.fn(),
      processPDF: jest.fn()
    };
    AutoPicklistApp.mockImplementation(() => mockAutoPicklistApp);

    // Create test file
    testFilePath = createTestFile('test.csv', testCSV);

    // Import and use the picklist route
    const picklistRouter = require('../../src/routes/picklist');
    app.use('/api/picklist', picklistRouter);
    
    // Add enhanced error handling middleware
    const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
    app.use(enhancedErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanupTestFiles();
  });

  describe('POST /api/picklist/upload', () => {
    const mockPicklist = [
      { item: 'Test Item 1', quantity: 5, selectedSupplier: 'Test Supplier' },
      { item: 'Test Item 2', quantity: 3, selectedSupplier: 'Test Supplier' }
    ];
    const mockSummary = { totalItems: 2, totalQuantity: 8 };
    const mockValidation = { isValid: true, errors: [], warnings: [] };

    it('should upload CSV file and generate picklist using database', async () => {
      mockAutoPicklistApp.parseCSV.mockResolvedValue(['Item1', 'Item2']);
      mockPicklistService.createPicklistFromDatabase.mockResolvedValue(mockPicklist);
      mockPicklistService.calculateSummary.mockReturnValue(mockSummary);
      mockPicklistService.validatePicklist.mockReturnValue(mockValidation);

      const response = await request(app)
        .post('/api/picklist/upload')
        .attach('file', testFilePath)
        .field('useDatabase', 'true')
        .expect(200);

      validateSuccessResponse(response, ['picklist', 'summary', 'validation']);
      expect(response.body.data.picklist).toHaveLength(2);
      expect(response.body.data.useDatabase).toBe(true);
      expect(response.body.meta.message).toContain('database matching');
    });

    it('should upload PDF file and generate picklist using database', async () => {
      const pdfPath = createTestFile('test.pdf', 'PDF content');
      
      mockAutoPicklistApp.parsePDF.mockResolvedValue(['Item1', 'Item2']);
      mockPicklistService.createPicklistFromDatabase.mockResolvedValue(mockPicklist);
      mockPicklistService.calculateSummary.mockReturnValue(mockSummary);
      mockPicklistService.validatePicklist.mockReturnValue(mockValidation);

      const response = await request(app)
        .post('/api/picklist/upload')
        .attach('file', pdfPath)
        .field('useDatabase', 'true')
        .expect(200);

      validateSuccessResponse(response, ['picklist', 'summary', 'validation']);
      expect(mockAutoPicklistApp.parsePDF).toHaveBeenCalled();
    });

    it('should use legacy price list matching when useDatabase is false', async () => {
      const legacyResult = {
        picklist: mockPicklist,
        summary: mockSummary,
        validation: mockValidation
      };
      
      mockAutoPicklistApp.processCSV.mockResolvedValue(legacyResult);

      const response = await request(app)
        .post('/api/picklist/upload')
        .attach('file', testFilePath)
        .field('useDatabase', 'false')
        .expect(200);

      validateSuccessResponse(response, ['picklist', 'summary', 'validation']);
      expect(response.body.data.useDatabase).toBe(false);
      expect(response.body.meta.message).toContain('price list matching');
      expect(mockAutoPicklistApp.processCSV).toHaveBeenCalled();
    });

    it('should return validation error when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/picklist/upload')
        .field('useDatabase', 'true')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
      expect(response.body.error.message).toContain('No file uploaded');
    });

    it('should return validation error for unsupported file type', async () => {
      const txtPath = createTestFile('test.txt', 'Plain text content');

      const response = await request(app)
        .post('/api/picklist/upload')
        .attach('file', txtPath)
        .field('useDatabase', 'true')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
      expect(response.body.error.message).toContain('Unsupported file type');
    });

    it('should handle file processing errors', async () => {
      mockAutoPicklistApp.parseCSV.mockRejectedValue(new Error('File processing failed'));

      const response = await request(app)
        .post('/api/picklist/upload')
        .attach('file', testFilePath)
        .field('useDatabase', 'true')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('POST /api/picklist/validate', () => {
    it('should validate picklist data', async () => {
      const testPicklist = [
        { item: 'Test Item', quantity: 1, selectedSupplier: 'Test Supplier' }
      ];
      const mockValidation = { isValid: true, errors: [], warnings: [] };
      const mockSummary = { totalItems: 1, totalQuantity: 1 };

      mockPicklistService.validatePicklist.mockReturnValue(mockValidation);
      mockPicklistService.calculateSummary.mockReturnValue(mockSummary);

      const response = await request(app)
        .post('/api/picklist/validate')
        .send({ picklist: testPicklist })
        .expect(200);

      validateSuccessResponse(response, ['validation', 'summary']);
      expect(response.body.data.validation.isValid).toBe(true);
    });

    it('should return validation error for missing picklist', async () => {
      const response = await request(app)
        .post('/api/picklist/validate')
        .send({})
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should return validation error for invalid picklist type', async () => {
      const response = await request(app)
        .post('/api/picklist/validate')
        .send({ picklist: 'not an array' })
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });
  });

  describe('POST /api/picklist/export', () => {
    it('should export picklist as CSV', async () => {
      const testPicklist = [
        { item: 'Test Item', quantity: 1, selectedSupplier: 'Test Supplier' }
      ];
      const csvData = 'Item,Quantity,Supplier\nTest Item,1,Test Supplier';
      
      mockPicklistService.exportPicklist.mockReturnValue(csvData);

      const response = await request(app)
        .post('/api/picklist/export')
        .send({ picklist: testPicklist, format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="picklist_\d+\.csv"/);
      expect(response.text).toBe(csvData);
    });

    it('should export picklist as JSON', async () => {
      const testPicklist = [
        { item: 'Test Item', quantity: 1, selectedSupplier: 'Test Supplier' }
      ];
      const jsonData = JSON.stringify(testPicklist);
      
      mockPicklistService.exportPicklist.mockReturnValue(jsonData);

      const response = await request(app)
        .post('/api/picklist/export')
        .send({ picklist: testPicklist, format: 'json' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="picklist_\d+\.json"/);
    });

    it('should default to CSV format', async () => {
      const testPicklist = [
        { item: 'Test Item', quantity: 1, selectedSupplier: 'Test Supplier' }
      ];
      
      mockPicklistService.exportPicklist.mockReturnValue('csv data');

      const response = await request(app)
        .post('/api/picklist/export')
        .send({ picklist: testPicklist })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(mockPicklistService.exportPicklist).toHaveBeenCalledWith(testPicklist, 'csv');
    });

    it('should validate export format', async () => {
      const testPicklist = [
        { item: 'Test Item', quantity: 1, selectedSupplier: 'Test Supplier' }
      ];

      const response = await request(app)
        .post('/api/picklist/export')
        .send({ picklist: testPicklist, format: 'xml' })
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });
  });

  describe('GET /api/picklist/templates', () => {
    it('should return available picklist templates', async () => {
      const response = await request(app)
        .get('/api/picklist/templates')
        .expect(200);

      validateSuccessResponse(response, ['templates']);
      expect(response.body.data.templates).toBeInstanceOf(Array);
      expect(response.body.data.templates.length).toBeGreaterThan(0);
      
      const template = response.body.data.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('fields');
    });
  });
});