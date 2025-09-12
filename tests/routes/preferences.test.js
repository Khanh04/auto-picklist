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

describe('Preferences Routes', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = createTestApp();
    mockClient = createMockClient({
      preferences: testData.preferences
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

  describe('GET /api/preferences', () => {
    it('should return all preferences with enhanced response format', async () => {
      const response = await request(app)
        .get('/api/preferences')
        .expect(200);

      validateSuccessResponse(response, ['preferences']);
      expect(response.body.data.preferences).toHaveLength(2);
      expect(response.body.data.preferences[0]).toMatchObject({
        id: 1,
        item_name: 'Test Item 1',
        supplier_id: 1,
        priority: 1
      });
      expect(response.body.meta).toHaveProperty('count', 2);
    });

    it('should return empty array when no preferences exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/preferences')
        .expect(200);

      validateSuccessResponse(response, ['preferences']);
      expect(response.body.data.preferences).toHaveLength(0);
      expect(response.body.meta).toHaveProperty('count', 0);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/preferences')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('GET /api/preferences/:id', () => {
    it('should return specific preference by ID', async () => {
      mockClient.query.mockResolvedValueOnce({ 
        rows: [testData.preferences[0]] 
      });

      const response = await request(app)
        .get('/api/preferences/1')
        .expect(200);

      validateSuccessResponse(response, ['preference']);
      expect(response.body.data.preference).toMatchObject({
        id: 1,
        item_name: 'Test Item 1',
        supplier_id: 1,
        priority: 1
      });
    });

    it('should return 404 when preference not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/preferences/999')
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
      expect(response.body.error.message).toBe('Preference not found');
    });

    it('should validate preference ID parameter', async () => {
      const response = await request(app)
        .get('/api/preferences/invalid')
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });
  });

  describe('POST /api/preferences', () => {
    it('should create new preference with valid data', async () => {
      const newPreference = {
        item_name: 'New Test Item',
        supplier_id: 1,
        priority: 1
      };

      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ id: 3, ...newPreference }] 
      });

      const response = await request(app)
        .post('/api/preferences')
        .send(newPreference)
        .expect(201);

      validateSuccessResponse(response, ['preference']);
      expect(response.body.data.preference).toMatchObject(newPreference);
      expect(response.body.meta.message).toBe('Preference created successfully');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/preferences')
        .send({})
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
      expect(response.body.error.details.fields).toContain('item_name');
    });

    it('should validate supplier_id exists', async () => {
      const newPreference = {
        item_name: 'Test Item',
        supplier_id: 999,
        priority: 1
      };

      // Mock foreign key constraint error
      const constraintError = new Error('foreign key constraint violation');
      constraintError.code = '23503';
      mockClient.query.mockRejectedValueOnce(constraintError);

      const response = await request(app)
        .post('/api/preferences')
        .send(newPreference)
        .expect(409);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_004');
    });

    it('should validate priority is positive integer', async () => {
      const newPreference = {
        item_name: 'Test Item',
        supplier_id: 1,
        priority: -1
      };

      const response = await request(app)
        .post('/api/preferences')
        .send(newPreference)
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });
  });

  describe('PUT /api/preferences/:id', () => {
    it('should update existing preference', async () => {
      const updateData = { priority: 5 };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [testData.preferences[0]] }) // Check exists
        .mockResolvedValueOnce({ rows: [{ ...testData.preferences[0], ...updateData }] }); // Update

      const response = await request(app)
        .put('/api/preferences/1')
        .send(updateData)
        .expect(200);

      validateSuccessResponse(response, ['preference']);
      expect(response.body.data.preference.priority).toBe(5);
      expect(response.body.meta.message).toBe('Preference updated successfully');
    });

    it('should return 404 for non-existent preference', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/preferences/999')
        .send({ priority: 2 })
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
    });

    it('should validate foreign key constraints on supplier_id', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [testData.preferences[0]] })
        .mockRejectedValueOnce(Object.assign(new Error('Foreign key violation'), { code: '23503' }));

      const response = await request(app)
        .put('/api/preferences/1')
        .send({ supplier_id: 999 })
        .expect(409);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_004');
    });
  });

  describe('DELETE /api/preferences/:id', () => {
    it('should delete existing preference', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [testData.preferences[0]] }) // Check exists
        .mockResolvedValueOnce({ rowCount: 1 }); // Delete

      const response = await request(app)
        .delete('/api/preferences/1')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.meta.message).toBe('Preference deleted successfully');
    });

    it('should return 404 for non-existent preference', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/preferences/999')
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
    });
  });

  describe('GET /api/preferences/item/:itemName', () => {
    it('should return preferences for specific item', async () => {
      const itemPreferences = testData.preferences.filter(p => p.item_name === 'Test Item 1');
      mockClient.query.mockResolvedValueOnce({ rows: itemPreferences });

      const response = await request(app)
        .get('/api/preferences/item/Test%20Item%201')
        .expect(200);

      validateSuccessResponse(response, ['preferences']);
      expect(response.body.data.preferences).toHaveLength(1);
      expect(response.body.data.preferences[0].item_name).toBe('Test Item 1');
    });

    it('should return empty array for item with no preferences', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/preferences/item/Non%20Existent%20Item')
        .expect(200);

      validateSuccessResponse(response, ['preferences']);
      expect(response.body.data.preferences).toHaveLength(0);
    });

    it('should handle URL-encoded item names', async () => {
      const response = await request(app)
        .get('/api/preferences/item/Test%20Item%20With%20Spaces')
        .expect(200);

      // Verify the query was called with decoded item name
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['Test Item With Spaces'])
      );
    });
  });

  describe('POST /api/preferences/bulk', () => {
    it('should create multiple preferences at once', async () => {
      const bulkPreferences = [
        { item_name: 'Bulk Item 1', supplier_id: 1, priority: 1 },
        { item_name: 'Bulk Item 2', supplier_id: 2, priority: 2 }
      ];

      mockClient.query.mockResolvedValueOnce({
        rows: bulkPreferences.map((pref, index) => ({ id: index + 10, ...pref }))
      });

      const response = await request(app)
        .post('/api/preferences/bulk')
        .send({ preferences: bulkPreferences })
        .expect(201);

      validateSuccessResponse(response, ['preferences']);
      expect(response.body.data.preferences).toHaveLength(2);
      expect(response.body.meta.message).toBe('Preferences created successfully');
      expect(response.body.meta.count).toBe(2);
    });

    it('should validate bulk preferences data', async () => {
      const response = await request(app)
        .post('/api/preferences/bulk')
        .send({})
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should validate preferences array is not empty', async () => {
      const response = await request(app)
        .post('/api/preferences/bulk')
        .send({ preferences: [] })
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });
  });
});