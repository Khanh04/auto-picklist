const request = require('supertest');
const express = require('express');
const path = require('path');

/**
 * Test utilities for enhanced error handling and route testing
 */

/**
 * Create a test app with enhanced error handling middleware
 */
function createTestApp() {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Import enhanced error handling middleware
  const { enhancedErrorHandler } = require('../../src/middleware/enhancedErrorHandler');
  
  return app;
}

/**
 * Mock database pool for testing
 */
const createMockPool = () => ({
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn()
  }),
  query: jest.fn(),
  end: jest.fn()
});

/**
 * Mock database client for testing
 */
const createMockClient = (queryResults = {}) => ({
  query: jest.fn().mockImplementation((text, params) => {
    // Return specific results based on query type - check more specific patterns first
    if (text.includes('SELECT') && text.includes('matching_preferences')) {
      return { rows: queryResults.preferences || [] };
    }
    if (text.includes('SELECT') && text.includes('suppliers') && !text.includes('preferences')) {
      return { rows: queryResults.suppliers || [] };
    }
    if (text.includes('SELECT') && text.includes('products') && !text.includes('preferences')) {
      return { rows: queryResults.products || [] };
    }
    if (text.includes('INSERT')) {
      return { rows: [{ id: 1 }], insertId: 1 };
    }
    if (text.includes('UPDATE')) {
      return { rowCount: 1 };
    }
    if (text.includes('DELETE')) {
      return { rowCount: 1 };
    }
    return { rows: [] };
  }),
  release: jest.fn()
});

/**
 * Validate enhanced error response format
 */
function validateErrorResponse(response) {
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toHaveProperty('code');
  expect(response.body.error).toHaveProperty('message');
  expect(response.body.error).toHaveProperty('timestamp');
  expect(response.body.error).toHaveProperty('requestId');
}

/**
 * Validate enhanced success response format
 */
function validateSuccessResponse(response, expectedDataKeys = []) {
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('timestamp');
  expect(response.body).toHaveProperty('requestId');
  
  if (expectedDataKeys.length > 0) {
    expectedDataKeys.forEach(key => {
      expect(response.body.data).toHaveProperty(key);
    });
  }
}

/**
 * Create test file for upload testing
 */
function createTestFile(filename, content) {
  const fs = require('fs');
  const testFilePath = path.join(__dirname, '..', 'fixtures', filename);
  
  // Ensure fixtures directory exists
  const fixturesDir = path.dirname(testFilePath);
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  fs.writeFileSync(testFilePath, content);
  return testFilePath;
}

/**
 * Clean up test files
 */
function cleanupTestFiles() {
  const fs = require('fs');
  const fixturesDir = path.join(__dirname, '..', 'fixtures');
  
  if (fs.existsSync(fixturesDir)) {
    fs.rmSync(fixturesDir, { recursive: true, force: true });
  }
}

/**
 * Mock session middleware
 */
const mockSession = (sessionData = {}) => (req, res, next) => {
  req.session = {
    picklist: null,
    ...sessionData,
    save: jest.fn((callback) => callback && callback()),
    destroy: jest.fn((callback) => callback && callback())
  };
  next();
};

/**
 * Common test data
 */
const testData = {
  suppliers: [
    { id: 1, name: 'Test Supplier 1', contact_info: 'test1@example.com' },
    { id: 2, name: 'Test Supplier 2', contact_info: 'test2@example.com' }
  ],
  products: [
    { id: 1, name: 'Test Product 1', description: 'Test description 1' },
    { id: 2, name: 'Test Product 2', description: 'Test description 2' }
  ],
  preferences: [
    { id: 1, item_name: 'Test Item 1', supplier_id: 1, priority: 1 },
    { id: 2, item_name: 'Test Item 2', supplier_id: 2, priority: 2 }
  ],
  picklist: [
    { 
      quantity: 5, 
      item: 'Test Item 1', 
      originalItem: 'Test Item 1',
      selectedSupplier: 'Test Supplier 1',
      unitPrice: 10.50,
      totalPrice: 52.50
    },
    { 
      quantity: 3, 
      item: 'Test Item 2', 
      originalItem: 'Test Item 2',
      selectedSupplier: 'Test Supplier 2',
      unitPrice: 8.75,
      totalPrice: 26.25
    }
  ]
};

/**
 * CSV test content
 */
const testCSV = `Item,Quantity
Test Item 1,5
Test Item 2,3
Test Item 3,7`;

module.exports = {
  createTestApp,
  createMockPool,
  createMockClient,
  validateErrorResponse,
  validateSuccessResponse,
  createTestFile,
  cleanupTestFiles,
  mockSession,
  testData,
  testCSV
};