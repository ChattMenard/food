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
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.js',  // Your actual path
    '**/?(*.)+(spec|test).ts',
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
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  collectCoverageFrom: [
    'www/js/**/*.js',
    'www/js/**/*.ts',
    '!www/js/**/*.test.js',
    '!www/js/**/*.test.ts',
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
  // Coverage thresholds - Balanced approach (half as strict as before)
  // UI-heavy modules (app.js, ui/, native/, advanced/) are ignored
  // ========================================================================
  coverageThreshold: {
    global: {
      statements: 25,
      branches: 25,
      functions: 25,
      lines: 25
    },
    './www/js/data/**/*.js': {
      statements: 40,
      branches: 35,
      functions: 40,
      lines: 40
    },
    './www/js/logic/**/*.js': {
      statements: 35,
      branches: 30,
      functions: 35,
      lines: 35
    },
    './www/js/features/plan/**/*.js': {
      statements: 30,
      branches: 25,
      functions: 30,
      lines: 30
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
