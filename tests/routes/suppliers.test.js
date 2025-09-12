const request = require('supertest');
const express = require('express');
const { 
  createTestApp, 
  createMockClient, 
  validateSuccessResponse, 
  validateErrorResponse, 
  testData 
} = require('../helpers/testHelpers');

// Mock the database
jest.mock('../../src/database/config', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }
}));

const { pool } = require('../../src/database/config');

describe('Suppliers Routes', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = createTestApp();
    mockClient = createMockClient({
      suppliers: testData.suppliers
    });
    
    pool.connect.mockResolvedValue(mockClient);
    
    // Import and use the suppliers route
    const suppliersRouter = require('../../src/routes/suppliers');
    app.use('/api/suppliers', suppliersRouter);
    
    // Add enhanced error handling middleware
    const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
    app.use(enhancedErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/suppliers', () => {
    it('should return all suppliers with enhanced response format', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .expect(200);

      validateSuccessResponse(response, ['suppliers']);
      expect(response.body.data.suppliers).toHaveLength(2);
      expect(response.body.data.suppliers[0]).toMatchObject({
        id: 1,
        name: 'Test Supplier 1',
        contact_info: 'test1@example.com'
      });
      expect(response.body.meta).toHaveProperty('count', 2);
    });

    it('should return empty array when no suppliers exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/suppliers')
        .expect(200);

      validateSuccessResponse(response, ['suppliers']);
      expect(response.body.data.suppliers).toHaveLength(0);
      expect(response.body.meta).toHaveProperty('count', 0);
    });

    it('should handle database errors with enhanced error handling', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/suppliers')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('GET /api/suppliers/:id', () => {
    it('should return specific supplier by ID', async () => {
      mockClient.query.mockResolvedValueOnce({ 
        rows: [testData.suppliers[0]] 
      });

      const response = await request(app)
        .get('/api/suppliers/1')
        .expect(200);

      validateSuccessResponse(response, ['supplier']);
      expect(response.body.data.supplier).toMatchObject({
        id: 1,
        name: 'Test Supplier 1',
        contact_info: 'test1@example.com'
      });
    });

    it('should return 404 when supplier not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/suppliers/999')
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
      expect(response.body.error.message).toBe('Supplier not found');
      expect(response.body.error.details).toMatchObject({
        resource: 'Supplier',
        identifier: '999'
      });
    });

    it('should validate supplier ID parameter', async () => {
      const response = await request(app)
        .get('/api/suppliers/invalid')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });
  });

  describe('POST /api/suppliers', () => {
    it('should create new supplier with valid data', async () => {
      const newSupplier = {
        name: 'New Test Supplier',
        contact_info: 'new@example.com'
      };

      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 3, ...newSupplier }] 
      });

      const response = await request(app)
        .post('/api/suppliers')
        .send(newSupplier)
        .expect(201);

      validateSuccessResponse(response, ['supplier']);
      expect(response.body.data.supplier).toMatchObject(newSupplier);
      expect(response.body.meta.message).toBe('Supplier created successfully');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .send({})
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
      expect(response.body.error.details.fields).toContain('name');
    });

    it('should validate supplier name uniqueness', async () => {
      const existingSupplier = { name: 'Test Supplier 1', contact_info: 'test@example.com' };
      
      // Mock constraint violation error
      const constraintError = new Error('duplicate key value violates unique constraint');
      constraintError.code = '23505';
      mockClient.query.mockRejectedValueOnce(constraintError);

      const response = await request(app)
        .post('/api/suppliers')
        .send(existingSupplier)
        .expect(409);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_003');
    });
  });

  describe('PUT /api/suppliers/:id', () => {
    it('should update existing supplier', async () => {
      const updateData = { name: 'Updated Supplier Name' };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [testData.suppliers[0]] }) // Check exists
        .mockResolvedValueOnce({ rows: [{ ...testData.suppliers[0], ...updateData }] }); // Update

      const response = await request(app)
        .put('/api/suppliers/1')
        .send(updateData)
        .expect(200);

      validateSuccessResponse(response, ['supplier']);
      expect(response.body.data.supplier.name).toBe('Updated Supplier Name');
      expect(response.body.meta.message).toBe('Supplier updated successfully');
    });

    it('should return 404 for non-existent supplier', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/suppliers/999')
        .send({ name: 'Updated Name' })
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
    });
  });

  describe('DELETE /api/suppliers/:id', () => {
    it('should delete existing supplier', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [testData.suppliers[0]] }) // Check exists
        .mockResolvedValueOnce({ rowCount: 1 }); // Delete

      const response = await request(app)
        .delete('/api/suppliers/1')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.meta.message).toBe('Supplier deleted successfully');
    });

    it('should return 404 for non-existent supplier', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/suppliers/999')
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
    });

    it('should handle foreign key constraint violations', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [testData.suppliers[0]] }) // Check exists
        .mockRejectedValueOnce(Object.assign(new Error('Foreign key violation'), { code: '23503' }));

      const response = await request(app)
        .delete('/api/suppliers/1')
        .expect(409);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_004');
    });
  });
});