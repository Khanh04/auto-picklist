const request = require('supertest');

// Test against the live server to validate actual API responses
const SERVER_URL = 'http://localhost:3000';

describe('Live API Response Structure Tests', () => {
  
  describe('Suppliers Endpoint Response Structure', () => {
    it('should return properly structured response from GET /api/suppliers', async () => {
      const response = await request(SERVER_URL)
        .get('/api/suppliers')
        .expect(200);

      // Test the enhanced response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
      
      // Test data structure
      expect(response.body.data).toHaveProperty('suppliers');
      expect(Array.isArray(response.body.data.suppliers)).toBe(true);
      
      // Test meta information
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('count');
      expect(response.body.meta).toHaveProperty('message');
      
      // Test timestamp format (ISO 8601)
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Test request ID format
      expect(response.body.requestId).toMatch(/^req_[a-z0-9]+_[a-f0-9]+$/);
      
      // Test headers
      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['x-request-id']).toBe(response.body.requestId);
      
      // If suppliers exist, test their structure (actual database schema)
      if (response.body.data.suppliers.length > 0) {
        const supplier = response.body.data.suppliers[0];
        expect(supplier).toHaveProperty('id');
        expect(supplier).toHaveProperty('name');
        expect(supplier).toHaveProperty('created_at');
        expect(typeof supplier.id).toBe('number');
        expect(typeof supplier.name).toBe('string');
        expect(typeof supplier.created_at).toBe('string');
        
        // Optional fields that may exist
        if (supplier.product_count) {
          expect(typeof supplier.product_count).toBe('string');
        }
      }
      
      console.log('✅ Suppliers Response Structure:', {
        success: response.body.success,
        dataKeys: Object.keys(response.body.data),
        metaKeys: Object.keys(response.body.meta),
        supplierCount: response.body.data.suppliers.length,
        timestamp: response.body.timestamp,
        requestId: response.body.requestId
      });
    });
    
    it('should return error response with proper structure for non-existent supplier', async () => {
      const response = await request(SERVER_URL)
        .get('/api/suppliers/999999')
        .expect(404);

      // Test enhanced error response structure
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      
      // Test error object structure
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('type');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
      expect(response.body.error).toHaveProperty('path');
      
      // Test error classification
      expect(response.body.error.code).toBe('RESOURCE_001');
      expect(response.body.error.type).toBe('NotFoundError');
      expect(response.body.error.path).toBe('/api/suppliers/999999');
      
      // Test details
      if (response.body.error.details) {
        expect(response.body.error.details).toHaveProperty('resource');
        expect(response.body.error.details).toHaveProperty('identifier');
      }
      
      // Test headers
      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['x-request-id']).toBe(response.body.error.requestId);
      
      console.log('✅ Error Response Structure:', {
        success: response.body.success,
        errorCode: response.body.error.code,
        errorType: response.body.error.type,
        hasDetails: !!response.body.error.details,
        timestamp: response.body.error.timestamp,
        requestId: response.body.error.requestId
      });
    });
  });
  
  describe('Items Endpoint Response Structure', () => {
    it('should return properly structured response from GET /api/items', async () => {
      const response = await request(SERVER_URL)
        .get('/api/items')
        .expect(200);

      // Test enhanced response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
      
      // Test data structure
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      
      // If items exist, test their structure (actual database schema)
      if (response.body.data.items.length > 0) {
        const item = response.body.data.items[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('description');
        expect(typeof item.id).toBe('number');
        expect(typeof item.description).toBe('string');
        
        // Optional fields that may exist
        if (item.bestPrice) {
          expect(typeof item.bestPrice).toBe('string');
        }
        if (item.bestSupplier) {
          expect(typeof item.bestSupplier).toBe('string');
        }
      }
      
      console.log('✅ Items Response Structure:', {
        success: response.body.success,
        itemCount: response.body.data.items.length,
        timestamp: response.body.timestamp,
        requestId: response.body.requestId
      });
    });
  });
  
  describe('Session Endpoint Response Structure', () => {
    it('should return properly structured response from GET /api/session/picklist', async () => {
      const response = await request(SERVER_URL)
        .get('/api/session/picklist')
        .expect(200);

      // Test enhanced response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('requestId');
      
      // Test data structure
      expect(response.body.data).toHaveProperty('picklist');
      
      // Test meta information
      if (response.body.meta) {
        expect(response.body.meta).toHaveProperty('message');
      }
      
      // If picklist exists, test its structure
      if (response.body.data.picklist && Array.isArray(response.body.data.picklist)) {
        response.body.data.picklist.forEach(item => {
          expect(typeof item).toBe('object');
        });
      }
      
      console.log('✅ Session Response Structure:', {
        success: response.body.success,
        hasPicklist: !!response.body.data.picklist,
        picklistType: typeof response.body.data.picklist,
        timestamp: response.body.timestamp,
        requestId: response.body.requestId
      });
    });
  });
  
  describe('Request ID Uniqueness and Format', () => {
    it('should generate unique request IDs for concurrent requests', async () => {
      const responses = await Promise.all([
        request(SERVER_URL).get('/api/suppliers'),
        request(SERVER_URL).get('/api/items'),
        request(SERVER_URL).get('/api/session/picklist')
      ]);

      const requestIds = responses.map(r => r.body.requestId);
      
      // Test uniqueness
      expect(new Set(requestIds).size).toBe(3);
      
      // Test format
      requestIds.forEach(id => {
        expect(id).toMatch(/^req_[a-z0-9]+_[a-f0-9]+$/);
      });
      
      console.log('✅ Request ID Uniqueness:', {
        requestIds: requestIds,
        allUnique: new Set(requestIds).size === requestIds.length
      });
    });
  });
  
  describe('Response Time and Headers', () => {
    it('should include proper headers and reasonable response times', async () => {
      const startTime = Date.now();
      
      const response = await request(SERVER_URL)
        .get('/api/suppliers')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Test headers
      expect(response.headers).toHaveProperty('content-type');
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers).toHaveProperty('x-request-id');
      
      // Test reasonable response time (should be under 5 seconds for simple query)
      expect(responseTime).toBeLessThan(5000);
      
      console.log('✅ Performance and Headers:', {
        responseTime: `${responseTime}ms`,
        contentType: response.headers['content-type'],
        hasRequestId: !!response.headers['x-request-id']
      });
    });
  });
});