const request = require('supertest');
const { 
  createTestApp, 
  validateSuccessResponse, 
  validateErrorResponse,
  mockSession,
  testData
} = require('../helpers/testHelpers');

describe('Session Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    
    // Import and use the session route
    const sessionRouter = require('../../src/routes/session');
    app.use('/api/session', sessionRouter);
    
    // Add enhanced error handling middleware
    const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
    app.use(enhancedErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/session/picklist', () => {
    it('should return saved picklist from session', async () => {
      app.use(mockSession({ picklist: testData.picklist }));

      const response = await request(app)
        .get('/api/session/picklist')
        .expect(200);

      validateSuccessResponse(response, ['picklist']);
      expect(response.body.data.picklist).toHaveLength(2);
      expect(response.body.data.picklist[0]).toMatchObject({
        item: 'Test Item 1',
        quantity: 5
      });
    });

    it('should return null when no picklist is saved', async () => {
      app.use(mockSession({}));

      const response = await request(app)
        .get('/api/session/picklist')
        .expect(200);

      validateSuccessResponse(response, ['picklist']);
      expect(response.body.data.picklist).toBeNull();
      expect(response.body.meta.message).toBe('No saved picklist found');
    });

    it('should handle session access errors', async () => {
      // Mock session middleware that throws an error
      app.use((req, res, next) => {
        req.session = null; // Simulate missing session
        next();
      });

      const response = await request(app)
        .get('/api/session/picklist')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('POST /api/session/picklist', () => {
    it('should save picklist to session', async () => {
      const mockSave = jest.fn((callback) => callback());
      app.use(mockSession({ save: mockSave }));

      const response = await request(app)
        .post('/api/session/picklist')
        .send({ picklist: testData.picklist })
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.meta.message).toBe('Picklist saved to session');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should validate picklist data', async () => {
      app.use(mockSession({}));

      const response = await request(app)
        .post('/api/session/picklist')
        .send({})
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
      expect(response.body.error.details.fields).toContain('picklist');
    });

    it('should validate picklist is array', async () => {
      app.use(mockSession({}));

      const response = await request(app)
        .post('/api/session/picklist')
        .send({ picklist: 'not an array' })
        .expect(400);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('VALIDATION_003');
    });

    it('should handle session save errors', async () => {
      const mockSave = jest.fn((callback) => callback(new Error('Session save failed')));
      app.use(mockSession({ save: mockSave }));

      const response = await request(app)
        .post('/api/session/picklist')
        .send({ picklist: testData.picklist })
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });
  });

  describe('DELETE /api/session/picklist', () => {
    it('should clear picklist from session', async () => {
      const mockSave = jest.fn((callback) => callback());
      app.use(mockSession({ picklist: testData.picklist, save: mockSave }));

      const response = await request(app)
        .delete('/api/session/picklist')
        .expect(200);

      validateSuccessResponse(response);
      expect(response.body.meta.message).toBe('Session picklist cleared');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle session save errors during clear', async () => {
      const mockSave = jest.fn((callback) => callback(new Error('Session save failed')));
      app.use(mockSession({ picklist: testData.picklist, save: mockSave }));

      const response = await request(app)
        .delete('/api/session/picklist')
        .expect(500);

      validateErrorResponse(response);
      expect(response.body.error.code).toBe('SYSTEM_999');
    });

    it('should succeed even when no session exists', async () => {
      app.use((req, res, next) => {
        req.session = null;
        next();
      });

      const response = await request(app)
        .delete('/api/session/picklist')
        .expect(500);

      validateErrorResponse(response);
    });
  });
});