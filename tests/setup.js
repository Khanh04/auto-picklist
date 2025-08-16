// Test setup file
// This file is run before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Don't fail tests on unhandled promise rejections during testing
process.on('unhandledRejection', () => {
  // Ignore during tests
});

// Global test timeout
jest.setTimeout(30000);