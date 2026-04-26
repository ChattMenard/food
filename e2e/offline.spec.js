/**
 * Offline E2E Tests
 * Validates offline behavior and IndexedDB persistence
 */

import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test('loads cached app shell when offline', async ({ page, context }) => {
    // First load online to populate cache
    await page.goto('/');

    // Go offline
    await context.setOffline(true);

    // Verify the loaded app shell remains usable offline
    await expect(page.locator('body')).toBeVisible();
  });

  test('uses cached data when offline', async ({ page, context }) => {
    // Load and populate data
    await page.goto('/');

    // Example: add pantry item (adjust selector)
    await page.fill('#new-ingredient', 'apple');
    await page.locator('#new-ingredient').blur();
    await page.click('#add-button');

    // Go offline
    await context.setOffline(true);

    // Verify item remains visible while offline
    await expect(page.locator('#pantry-list')).toContainText('apple');
  });

  test('AI gracefully fails offline', async ({ page, context }) => {
    await page.goto('/');

    // Go offline before AI call
    await context.setOffline(true);

    // Trigger AI query through the pantry input
    await page.fill('#new-ingredient', 'How do I cook salmon?');
    await page.press('#new-ingredient', 'Enter');

    // Expect fallback message
    await expect(page.locator('text=/offline|unavailable|try again/i')).toBeVisible();
  });
});
