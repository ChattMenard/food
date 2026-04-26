/**
 * Playwright Configuration
 * Configuration for end-to-end integration testing
 */

import { defineConfig, devices } from '@playwright/test';

const projects = [
    {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] }
    },
    {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] }
    },
    {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] }
    },
    {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] }
    },
    {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 12'] }
    }
];

if (process.env.PLAYWRIGHT_EDGE === '1') {
    projects.push({
        name: 'edge',
        use: { ...devices['Desktop Edge'], channel: 'msedge' }
    });
}

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:8080',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects,
    webServer: {
        command: 'npm start',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    }
});
