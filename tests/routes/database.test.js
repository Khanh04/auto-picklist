const request = require('supertest');
const path = require('path');
const { 
  createTestApp, 
  createMockClient, 
  validateSuccessResponse, 
  validateErrorResponse,
  createTestFile,
  cleanupTestFiles
} = require('../helpers/testHelpers');

// Mock the database
jest.mock('../../src/database/config', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }
}));

// Mock Excel processing
jest.mock('../../src/services/ExcelProcessor');

const { pool } = require('../../src/database/config');
const ExcelProcessor = require('../../src/services/ExcelProcessor');

describe('Database Routes', () => {
  let app;
  let mockClient;
  let mockExcelProcessor;

  beforeEach(() => {
    app = createTestApp();
    mockClient = createMockClient();
    pool.connect.mockResolvedValue(mockClient);

    // Mock ExcelProcessor
    mockExcelProcessor = {
      importProducts: jest.fn(),
      importSuppliers: jest.fn(),
      importPrices: jest.fn(),
      exportData: jest.fn(),
      validateFile: jest.fn()
    };
    ExcelProcessor.mockImplementation(() => mockExcelProcessor);

    // Import and use the database route
    const databaseRouter = require('../../src/routes/database');
    app.use('/api/database', databaseRouter);
    
    // Add enhanced error handling middleware
    const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
    app.use(enhancedErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanupTestFiles();
  });

  describe('POST /api/database/import', () => {
    it('should import Excel file successfully', async () => {
      const excelPath = createTestFile('test.xlsx', 'mock excel content');
      
      mockExcelProcessor.validateFile.mockResolvedValue({ valid: true });
      mockExcelProcessor.importProducts.mockResolvedValue({ imported: 10, errors: [] });
      mockExcelProcessor.importSuppliers.mockResolvedValue({ imported: 5, errors: [] });
      mockExcelProcessor.importPrices.mockResolvedValue({ imported: 25, errors: [] });

      const response = await request(app)
        .post('/api/database/import')
        .attach('file', excelPath)
        .expect(200);

      validateSuccessResponse(response, ['importResults']);
      expect(response.body.data.importResults).toHaveProperty('products');
      expect(response.body.data.importResults).toHaveProperty('suppliers');
      expect(response.body.data.importResults).toHaveProperty('prices');
    });

    it('should validate file upload', async () => {
      const response = await request(app)
        .post('/api/database/import')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should validate Excel file format', async () => {
      const txtPath = createTestFile('test.txt', 'not excel');
      
      mockExcelProcessor.validateFile.mockResolvedValue({ 
        valid: false, 
        errors: ['Invalid file format'] 
      });

      const response = await request(app)
        .post('/api/database/import')
        .attach('file', txtPath)
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should handle import processing errors', async () => {
      const excelPath = createTestFile('test.xlsx', 'mock excel content');
      
      mockExcelProcessor.validateFile.mockResolvedValue({ valid: true });
      mockExcelProcessor.importProducts.mockRejectedValue(new Error('Import failed'));

      const response = await request(app)
        .post('/api/database/import')
        .attach('file', excelPath)
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('GET /api/database/export', () => {
    it('should export database data as Excel', async () => {
      const mockExcelBuffer = Buffer.from('mock excel data');
      mockExcelProcessor.exportData.mockResolvedValue(mockExcelBuffer);

      const response = await request(app)
        .get('/api/database/export')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="database_export_\d+\.xlsx"/);
    });

    it('should handle export errors', async () => {
      mockExcelProcessor.exportData.mockRejectedValue(new Error('Export failed'));

      const response = await request(app)
        .get('/api/database/export')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('GET /api/database/stats', () => {
    it('should return database statistics', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // products
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })  // suppliers
        .mockResolvedValueOnce({ rows: [{ count: '500' }] }) // prices
        .mockResolvedValueOnce({ rows: [{ count: '20' }] }); // preferences

      const response = await request(app)
        .get('/api/database/stats')
        .expect(200);

      validateSuccessResponse(response, ['stats']);
      expect(response.body.data.stats).toMatchObject({
        products: 100,
        suppliers: 10,
        prices: 500,
        preferences: 20
      });
    });

    it('should handle database errors when getting stats', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/database/stats')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('DELETE /api/database/reset', () => {
    it('should reset database successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rowCount: 20 })  // preferences
        .mockResolvedValueOnce({ rowCount: 500 }) // prices
        .mockResolvedValueOnce({ rowCount: 100 }) // products
        .mockResolvedValueOnce({ rowCount: 10 }); // suppliers

      const response = await request(app)
        .delete('/api/database/reset')
        .expect(200);

      validateSuccessResponse(response, ['resetResults']);
      expect(response.body.data.resetResults).toMatchObject({
        preferences: 20,
        prices: 500,
        products: 100,
        suppliers: 10
      });
      expect(response.body.meta.message).toBe('Database reset successfully');
    });

    it('should handle database errors during reset', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Reset failed'));

      const response = await request(app)
        .delete('/api/database/reset')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });
});