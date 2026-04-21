/**
 * Offline E2E Tests
 * Validates offline behavior and IndexedDB persistence
 */

import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test('loads cached app shell when offline', async ({ page, context }) => {
    // First load online to populate cache
    await page.goto('http://localhost:8080');

    // Go offline
    await context.setOffline(true);

    // Reload while offline
    await page.reload();

    // Verify app still renders
    await expect(page.locator('body')).toBeVisible();
  });

  test('uses cached data when offline', async ({ page, context }) => {
    // Load and populate data
    await page.goto('http://localhost:8080');

    // Example: add pantry item (adjust selector)
    await page.fill('#new-ingredient', 'apple');
    await page.evaluate(() => window.addIngredient());
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);

    // Reload
    await page.reload();

    // Verify item still exists (comes from IndexedDB)
    await expect(page.locator('#pantry-list')).toContainText('apple');
  });

  test('AI gracefully fails offline', async ({ page, context }) => {
    await page.goto('http://localhost:8080');

    // Go offline before AI call
    await context.setOffline(true);

    // Trigger AI query via chat
    await page.fill('#chat-input', 'How do I cook salmon?');
    await page.press('#chat-input', 'Enter');

    // Expect fallback message
    await expect(page.locator('text=/offline|unavailable|try again/i')).toBeVisible();
  });
});
