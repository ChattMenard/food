/**
 * Jest Configuration
 * Configuration for automated unit testing
 */

export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/$1'
    },
    collectCoverageFrom: [
        'www/js/**/*.js',
        '!www/js/**/*.test.js',
        '!www/js/vendor/**'
    ],
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/e2e/'
    ],
    transform: {},
    verbose: true
};
