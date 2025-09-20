import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Establish API mocking before all tests.
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error'
  })
})

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => {
  server.resetHandlers()
})

// Clean up after the tests are finished.
afterAll(() => {
  server.close()
})

// Mock window.alert and console methods for clean test output
global.alert = jest.fn()
global.console.warn = jest.fn()
global.console.error = jest.fn()

// Mock fetch for tests that don't use MSW
global.fetch = jest.fn()

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}))

// Mock useWebSocket hook for all tests
jest.mock('./hooks/useWebSocket', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isConnected: true,
    connectionError: null,
    subscribe: jest.fn(() => jest.fn()), // returns an unsubscribe function
    broadcastUpdate: jest.fn(),
    updateItem: jest.fn(),
    toggleCompleted: jest.fn(),
    switchSupplier: jest.fn(),
    disconnect: jest.fn()
  }))
}))