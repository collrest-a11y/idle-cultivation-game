/**
 * Jest Configuration for Idle Cultivation Game Testing
 * Supports unit testing, integration testing, and test coverage
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '<rootDir>/testing/unit/**/*.test.js',
    '<rootDir>/testing/integration/**/*.test.js',
    '<rootDir>/js/**/*.test.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'testing/coverage',
  coverageReporters: ['html', 'text', 'lcov', 'json'],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.test.js',
    '!js/**/test-*.js',
    '!**/node_modules/**',
    '!testing/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'js/core/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'js/systems/': {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/testing/setup/jest-setup.js'
  ],

  // Module paths
  modulePaths: [
    '<rootDir>/js'
  ],

  // Mock patterns
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/js/$1'
  },

  // Globals for browser environment
  globals: {
    'window': {},
    'document': {},
    'localStorage': {},
    'sessionStorage': {}
  },

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true
};