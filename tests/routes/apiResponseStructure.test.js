const request = require('supertest');
const express = require('express');

// Mock the database
jest.mock('../../src/database/config', () => ({
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    query: jest.fn(),
    end: jest.fn()
  }
}));

const { pool } = require('../../src/database/config');

describe('API Response Structure and Data Validation', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock client with realistic test data
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);

    // Import routes and enhanced error handling
    const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
    const suppliersRouter = require('../../src/routes/suppliers');
    const sessionRouter = require('../../src/routes/session');

    app.use('/api/suppliers', suppliersRouter);
    app.use('/api/session', sessionRouter);
    app.use(enhancedErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Suppliers Route - Data Structure Validation', () => {
    const mockSuppliers = [
      { 
        id: 1, 
        name: 'Test Supplier A', 
        contact_info: 'contact@suppliera.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      { 
        id: 2, 
        name: 'Test Supplier B', 
        contact_info: 'info@supplierb.com',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }
    ];

    it('should return properly structured supplier list response', async () => {
      mockClient.query.mockResolvedValue({ rows: mockSuppliers });

      const response = await request(app)
        .get('/api/suppliers')
        .expect(200);

      // Validate response structure
      expect(response.body).toMatchObject({
        success: true,
        data: {
          suppliers: expect.any(Array)
        },
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        requestId: expect.stringMatching(/^req_[a-z0-9]+_[a-f0-9]+$/)
      });

      // Validate meta information
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toMatchObject({
        count: 2,
        message: 'Suppliers retrieved successfully'
      });

      // Validate supplier data structure
      expect(response.body.data.suppliers).toHaveLength(2);
      response.body.data.suppliers.forEach(supplier => {
        expect(supplier).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          contact_info: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String)
        });
      });

      // Validate specific data values
      expect(response.body.data.suppliers[0]).toMatchObject({
        id: 1,
        name: 'Test Supplier A',
        contact_info: 'contact@suppliera.com'
      });
    });

    it('should return proper error structure for not found supplier', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/suppliers/999')
        .expect(404);

      // Validate error response structure
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RESOURCE_001',
          message: 'Supplier not found',
          type: 'NotFoundError',
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          requestId: expect.stringMatching(/^req_[a-z0-9]+_[a-f0-9]+$/),
          path: '/api/suppliers/999',
          details: {
            resource: 'Supplier',
            identifier: '999'
          }
        }
      });

      // Validate headers
      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['x-request-id']).toBe(response.body.error.requestId);
    });

    it('should return validation error with proper structure', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .send({}) // Empty body to trigger validation error
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_003',
          message: expect.any(String),
          type: 'ValidationError',
          timestamp: expect.any(String),
          requestId: expect.any(String),
          details: {
            fields: expect.arrayContaining(['name'])
          }
        }
      });
    });

    it('should create supplier with proper response structure', async () => {
      const newSupplier = {
        name: 'New Test Supplier',
        contact_info: 'new@supplier.com'
      };

      const createdSupplier = { id: 3, ...newSupplier };
      mockClient.query.mockResolvedValue({ rows: [createdSupplier] });

      const response = await request(app)
        .post('/api/suppliers')
        .send(newSupplier)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          supplier: {
            id: 3,
            name: 'New Test Supplier',
            contact_info: 'new@supplier.com'
          }
        },
        meta: {
          message: 'Supplier created successfully'
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Session Route - Data Structure Validation', () => {
    const mockPicklist = [
      {
        quantity: 5,
        item: 'Test Item 1',
        originalItem: 'Test Item 1',
        selectedSupplier: 'Test Supplier A',
        unitPrice: 10.99,
        totalPrice: 54.95,
        matchedItemId: 1,
        matchedDescription: 'Test product description'
      },
      {
        quantity: 3,
        item: 'Test Item 2',
        originalItem: 'Test Item 2',
        selectedSupplier: 'Test Supplier B',
        unitPrice: 8.50,
        totalPrice: 25.50,
        matchedItemId: 2,
        matchedDescription: 'Another test product'
      }
    ];

    // Mock session middleware for testing
    const mockSession = (sessionData = {}) => (req, res, next) => {
      req.session = {
        picklist: null,
        ...sessionData,
        save: jest.fn((callback) => callback && callback()),
        destroy: jest.fn((callback) => callback && callback())
      };
      next();
    };

    it('should return saved picklist with proper structure', async () => {
      app.use(mockSession({ picklist: mockPicklist }));

      const response = await request(app)
        .get('/api/session/picklist')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          picklist: expect.any(Array)
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });

      // Validate picklist item structure
      expect(response.body.data.picklist).toHaveLength(2);
      response.body.data.picklist.forEach(item => {
        expect(item).toMatchObject({
          quantity: expect.any(Number),
          item: expect.any(String),
          originalItem: expect.any(String),
          selectedSupplier: expect.any(String),
          unitPrice: expect.any(Number),
          totalPrice: expect.any(Number),
          matchedItemId: expect.any(Number),
          matchedDescription: expect.any(String)
        });
      });
    });

    it('should return null when no picklist saved', async () => {
      app.use(mockSession({}));

      const response = await request(app)
        .get('/api/session/picklist')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          picklist: null
        },
        meta: {
          message: 'No saved picklist found'
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should save picklist with confirmation response', async () => {
      const mockSave = jest.fn((callback) => callback());
      app.use(mockSession({ save: mockSave }));

      const response = await request(app)
        .post('/api/session/picklist')
        .send({ picklist: mockPicklist })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {},
        meta: {
          message: 'Picklist saved to session'
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });

      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('Request Tracking and Logging', () => {
    it('should maintain consistent request ID across success response', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/suppliers')
        .expect(200);

      const requestId = response.body.requestId;
      expect(requestId).toBeDefined();
      expect(response.headers['x-request-id']).toBe(requestId);
    });

    it('should maintain consistent request ID across error response', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/suppliers/999')
        .expect(404);

      const requestId = response.body.error.requestId;
      expect(requestId).toBeDefined();
      expect(response.headers['x-request-id']).toBe(requestId);
    });

    it('should generate unique request IDs for concurrent requests', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const responses = await Promise.all([
        request(app).get('/api/suppliers'),
        request(app).get('/api/suppliers'),
        request(app).get('/api/suppliers')
      ]);

      const requestIds = responses.map(r => r.body.requestId);
      const uniqueIds = new Set(requestIds);
      
      expect(uniqueIds.size).toBe(3); // All should be unique
      requestIds.forEach(id => {
        expect(id).toMatch(/^req_[a-z0-9]+_[a-f0-9]+$/);
      });
    });
  });

  describe('Timestamp Consistency', () => {
    it('should use valid ISO 8601 timestamps', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/suppliers')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it's a valid date
      const date = new Date(timestamp);
      expect(date.toISOString()).toBe(timestamp);
      
      // Verify it's recent (within last 5 seconds)
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      expect(diff).toBeLessThan(5000);
    });
  });

  describe('Error Classification and Details', () => {
    it('should properly classify validation errors', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .send({ name: '' }) // Empty name should trigger validation
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_003',
        type: 'ValidationError',
        category: 'client',
        retryable: false,
        recoverable: true
      });
    });

    it('should properly classify not found errors', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/suppliers/999')
        .expect(404);

      expect(response.body.error).toMatchObject({
        code: 'RESOURCE_001',
        type: 'NotFoundError',
        category: 'business',
        retryable: false,
        recoverable: true
      });
    });

    it('should properly classify system errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/suppliers')
        .expect(500);

      expect(response.body.error).toMatchObject({
        code: 'SYSTEM_999',
        type: 'UnclassifiedError',
        category: 'system',
        retryable: true,
        recoverable: false
      });
    });
  });
});