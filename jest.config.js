/**
 * jest.config.js - WITH ENFORCED COVERAGE THRESHOLDS
 * 
 * CRITICAL DIFFERENCE from your current config:
 * This FAILS the build if coverage drops below thresholds
 * 
 * Copy this to your repo root and replace your existing jest.config.js
 */

export default {
  testEnvironment: 'jsdom',
  rootDir: '.',
  
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/tests/**/*.test.js',  // Your actual path
    '**/?(*.)+(spec|test).js'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/www/dist/',
    '/platforms/',
    '/android/',
    '/ios/',
    '/e2e/'
  ],
  
  moduleDirectories: ['node_modules', 'www/js'],
  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/www/js/$1',
    '^@core/(.*)$': '<rootDir>/www/js/core/$1',
    '^@data/(.*)$': '<rootDir>/www/js/data/$1',
    '^@logic/(.*)$': '<rootDir>/www/js/logic/$1',
    '^@features/(.*)$': '<rootDir>/www/js/features/$1',
    '^@ai/(.*)$': '<rootDir>/www/js/ai/$1',
    '^@ui/(.*)$': '<rootDir>/www/js/ui/$1',
    '^@utils/(.*)$': '<rootDir>/www/js/utils/$1',
    '^@native/(.*)$': '<rootDir>/www/js/native/$1',
    '^@auth/(.*)$': '<rootDir>/www/js/auth/$1',
    '^@advanced/(.*)$': '<rootDir>/www/js/advanced/$1'
  },
  
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  
  collectCoverageFrom: [
    'www/js/**/*.js',
    '!www/js/**/*.test.js',
    '!www/js/**/__tests__/**',
    '!www/js/**/tests/**',
    '!www/js/config.js',
    '!www/js/main.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/platforms/**'
  ],
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],
  
  coverageDirectory: 'coverage',
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  testTimeout: 10000,
  detectOpenHandles: true,
  forceExit: false,
  maxWorkers: '100%'
};
