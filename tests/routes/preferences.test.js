const request = require('supertest');
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

describe('Unified Preferences Routes', () => {
  let app;
  let mockClient;

  const unifiedTestData = {
    unified_preferences: [
      {
        id: 1,
        original_item: 'Test Item 1',
        product_id: 1,
        supplier_id: 1,
        frequency: 5,
        last_used: '2023-01-01T00:00:00.000Z',
        product_description: 'Test Product 1',
        supplier_name: 'Test Supplier 1'
      },
      {
        id: 2,
        original_item: 'Test Item 2',
        product_id: 2,
        supplier_id: 2,
        frequency: 3,
        last_used: '2023-01-02T00:00:00.000Z',
        product_description: 'Test Product 2',
        supplier_name: 'Test Supplier 2'
      }
    ]
  };

  beforeEach(() => {
    app = createTestApp();
    mockClient = createMockClient({
      unified_preferences: unifiedTestData.unified_preferences
    });

    pool.connect.mockResolvedValue(mockClient);

    // Import and use the preferences route
    const preferencesRouter = require('../../src/routes/preferences');
    app.use('/api/preferences', preferencesRouter);

    // Add enhanced error handling middleware
    const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
    app.use(enhancedErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/preferences/unified', () => {
    it('should return all unified preferences', async () => {
      const response = await request(app)
        .get('/api/preferences/unified')
        .expect(200);

      validateSuccessResponse(response, ['preferences']);
      expect(response.body.data.preferences).toHaveLength(2);
      expect(response.body.data.preferences[0]).toMatchObject({
        id: 1,
        original_item: 'Test Item 1',
        product_id: 1,
        supplier_id: 1,
        frequency: 5
      });
    });

    it('should return empty array when no unified preferences exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/preferences/unified')
        .expect(200);

      validateSuccessResponse(response, ['preferences']);
      expect(response.body.data.preferences).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/preferences/unified')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('GET /api/preferences/unified/:originalItem', () => {
    it('should return specific unified preference by original item', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [unifiedTestData.unified_preferences[0]]
      });

      const response = await request(app)
        .get('/api/preferences/unified/Test%20Item%201')
        .expect(200);

      validateSuccessResponse(response, ['preference']);
      expect(response.body.data.preference).toMatchObject({
        id: 1,
        original_item: 'Test Item 1',
        product_id: 1,
        supplier_id: 1
      });
    });

    it('should return 404 when unified preference not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/preferences/unified/Non%20Existent%20Item')
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
    });
  });

  describe('POST /api/preferences/unified', () => {
    it('should create multiple unified preferences', async () => {
      const newPreferences = [
        {
          originalItem: 'New Item 1',
          productId: 1,
          supplierId: 1
        },
        {
          originalItem: 'New Item 2',
          productId: 2,
          supplierId: 2
        }
      ];

      mockClient.query.mockResolvedValueOnce({
        rows: newPreferences.map((pref, index) => ({
          id: index + 10,
          original_item: pref.originalItem,
          product_id: pref.productId,
          supplier_id: pref.supplierId,
          frequency: 1,
          last_used: new Date().toISOString()
        }))
      });

      const response = await request(app)
        .post('/api/preferences/unified')
        .send({ preferences: newPreferences })
        .expect(201);

      validateSuccessResponse(response, ['saved']);
      expect(response.body.data.saved).toBe(2);
    });

    it('should validate unified preferences data structure', async () => {
      const response = await request(app)
        .post('/api/preferences/unified')
        .send({})
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should validate required fields for unified preferences', async () => {
      const invalidPreferences = [
        { originalItem: 'Test Item' } // Missing productId and supplierId
      ];

      const response = await request(app)
        .post('/api/preferences/unified')
        .send({ preferences: invalidPreferences })
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });
  });
});