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

describe('Shopping List Routes', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = createTestApp();
    mockClient = createMockClient();
    pool.connect.mockResolvedValue(mockClient);

    // Import and use the shopping list route
    const shoppingListRouter = require('../../src/routes/shoppingList');
    app.use('/api/shopping-list', shoppingListRouter);
    
    // Add enhanced error handling middleware
    const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
    app.use(enhancedErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/shopping-list/share', () => {
    it('should create a shared shopping list', async () => {
      const shareData = {
        picklist: testData.picklist,
        title: 'Test Shopping List'
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ share_id: 'test-share-123' }]
      });

      const response = await request(app)
        .post('/api/shopping-list/share')
        .send(shareData)
        .expect(201);

      validateSuccessResponse(response, ['shareId', 'title']);
      expect(response.body.data.shareId).toBe('test-share-123');
      expect(response.body.data.title).toBe('Test Shopping List');
      expect(response.body.meta.message).toBe('Shopping list created successfully');
    });

    it('should create shared list with default title', async () => {
      const shareData = {
        picklist: testData.picklist
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{ share_id: 'test-share-456' }]
      });

      const response = await request(app)
        .post('/api/shopping-list/share')
        .send(shareData)
        .expect(201);

      validateSuccessResponse(response, ['shareId', 'title']);
      expect(response.body.data.title).toBe('Shopping List');
    });

    it('should validate required picklist field', async () => {
      const response = await request(app)
        .post('/api/shopping-list/share')
        .send({})
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
      expect(response.body.error.details.fields).toContain('picklist');
    });

    it('should validate picklist is an array', async () => {
      const response = await request(app)
        .post('/api/shopping-list/share')
        .send({ picklist: 'not an array' })
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/shopping-list/share')
        .send({ picklist: testData.picklist })
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('GET /api/shopping-list/share/:shareId', () => {
    it('should get shared shopping list by ID', async () => {
      const mockSharedList = {
        share_id: 'test-share-123',
        title: 'Test Shopping List',
        picklist: JSON.stringify(testData.picklist),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockSharedList]
      });

      const response = await request(app)
        .get('/api/shopping-list/share/test-share-123')
        .expect(200);

      validateSuccessResponse(response, ['shareId', 'title', 'picklist']);
      expect(response.body.data.shareId).toBe('test-share-123');
      expect(response.body.data.title).toBe('Test Shopping List');
      expect(response.body.data.picklist).toHaveLength(2);
    });

    it('should return 404 for non-existent share ID', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/shopping-list/share/non-existent')
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
      expect(response.body.error.message).toBe('Shared shopping list not found');
    });

    it('should validate share ID parameter', async () => {
      const response = await request(app)
        .get('/api/shopping-list/share/')
        .expect(404); // Express route won't match without parameter

      // This test verifies the route parameter is required by Express routing
    });

    it('should handle JSON parsing errors in picklist', async () => {
      const mockSharedList = {
        share_id: 'test-share-123',
        title: 'Test Shopping List',
        picklist: 'invalid json',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockSharedList]
      });

      const response = await request(app)
        .get('/api/shopping-list/share/test-share-123')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('PUT /api/shopping-list/share/:shareId/picklist', () => {
    it('should update picklist for shared shopping list', async () => {
      const updatedPicklist = [
        ...testData.picklist,
        { item: 'New Item', quantity: 2, selectedSupplier: 'New Supplier' }
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ share_id: 'test-share-123' }] }) // Check exists
        .mockResolvedValueOnce({ rowCount: 1 }); // Update

      const response = await request(app)
        .put('/api/shopping-list/share/test-share-123/picklist')
        .send({ picklist: updatedPicklist })
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.meta.message).toBe('Shopping list updated successfully');
    });

    it('should return 404 for non-existent share ID', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/shopping-list/share/non-existent/picklist')
        .send({ picklist: testData.picklist })
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
    });

    it('should validate picklist data', async () => {
      const response = await request(app)
        .put('/api/shopping-list/share/test-share-123/picklist')
        .send({})
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should handle database update errors', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ share_id: 'test-share-123' }] })
        .mockRejectedValueOnce(new Error('Update failed'));

      const response = await request(app)
        .put('/api/shopping-list/share/test-share-123/picklist')
        .send({ picklist: testData.picklist })
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('DELETE /api/shopping-list/share/:shareId', () => {
    it('should delete shared shopping list', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ share_id: 'test-share-123' }] }) // Check exists
        .mockResolvedValueOnce({ rowCount: 1 }); // Delete

      const response = await request(app)
        .delete('/api/shopping-list/share/test-share-123')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.meta.message).toBe('Shopping list deleted successfully');
    });

    it('should return 404 for non-existent share ID', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/shopping-list/share/non-existent')
        .expect(404);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('RESOURCE_001');
    });

    it('should handle database deletion errors', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ share_id: 'test-share-123' }] })
        .mockRejectedValueOnce(new Error('Delete failed'));

      const response = await request(app)
        .delete('/api/shopping-list/share/test-share-123')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('GET /api/shopping-list/share', () => {
    it('should get list of all shared shopping lists', async () => {
      const mockLists = [
        {
          share_id: 'test-share-1',
          title: 'List 1',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          share_id: 'test-share-2',
          title: 'List 2',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockClient.query.mockResolvedValueOnce({ rows: mockLists });

      const response = await request(app)
        .get('/api/shopping-list/share')
        .expect(200);

      validateSuccessResponse(response, ['sharedLists']);
      expect(response.body.data.sharedLists).toHaveLength(2);
      expect(response.body.data.sharedLists[0]).toHaveProperty('shareId', 'test-share-1');
      expect(response.body.data.sharedLists[0]).toHaveProperty('title', 'List 1');
    });

    it('should return empty array when no shared lists exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/shopping-list/share')
        .expect(200);

      validateSuccessResponse(response, ['sharedLists']);
      expect(response.body.data.sharedLists).toHaveLength(0);
    });
  });
});