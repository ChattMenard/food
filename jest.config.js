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
    '!www/js/config.example.js',
    '!www/js/main.js',
    '!www/js/app.js',
    '!www/js/ui/**',
    '!www/js/native/**',
    '!www/js/advanced/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/platforms/**'
  ],

  // ========================================================================
  // Coverage thresholds - per-file for core modules only
  // UI-heavy modules (app.js, ui/, native/, advanced/) are ignored
  // ========================================================================
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50
    },
    './www/js/data/**/*.js': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    './www/js/logic/**/*.js': {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75
    },
    './www/js/features/plan/**/*.js': {
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70
    }
  },
  // ========================================================================
  
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
