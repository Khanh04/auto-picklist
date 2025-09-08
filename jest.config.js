module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/frontend/src'],
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  collectCoverageFrom: [
    'frontend/src/**/*.{js,jsx}',
    '!frontend/src/main.jsx',
    '!frontend/src/index.js',
    '!**/node_modules/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/public/',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testTimeout: 10000,
  globals: {
    'import.meta': {
      env: {
        MODE: 'test'
      }
    }
  }
};