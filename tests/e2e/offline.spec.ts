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
    await page.evaluate(() => (window as any).addIngredient());
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

    // Verify graceful failure message appears
    await expect(page.locator('.error-message')).toContainText('offline');
  });

  test('syncs data when back online', async ({ page, context }) => {
    // Load and add data online
    await page.goto('http://localhost:8080');
    await page.fill('#new-ingredient', 'banana');
    await page.evaluate(() => (window as any).addIngredient());
    await page.waitForTimeout(1000);

    // Go offline and add more data
    await context.setOffline(true);
    await page.fill('#new-ingredient', 'orange');
    await page.evaluate(() => (window as any).addIngredient());
    await page.waitForTimeout(1000);

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(2000);

    // Verify sync status
    await expect(page.locator('.sync-status')).toContainText('synced');
  });

  test('handles offline recipe search', async ({ page, context }) => {
    // Load recipes online
    await page.goto('http://localhost:8080');
    await page.waitForFunction(() => (window as any)._recipesLoaded === true, { timeout: 45000 });

    // Go offline
    await context.setOffline(true);

    // Search for recipes
    await page.fill('#recipe-search', 'chicken');
    await page.press('#recipe-search', 'Enter');
    await page.waitForTimeout(1000);

    // Verify cached search results
    await expect(page.locator('.recipe-card')).toHaveCount.greaterThan(0);
  });

  test('offline meal planning works', async ({ page, context }) => {
    // Load data online
    await page.goto('http://localhost:8080');
    await page.waitForFunction(() => (window as any)._appInitialized === true, { timeout: 45000 });

    // Add ingredients
    await page.fill('#new-ingredient', 'rice');
    await page.evaluate(() => (window as any).addIngredient());
    await page.waitForTimeout(500);

    // Go offline
    await context.setOffline(true);

    // Navigate to meals
    await page.click('#nav-meals');
    await page.waitForTimeout(1000);

    // Generate meal suggestions
    await page.click('#generate-suggestions');
    await page.waitForTimeout(2000);

    // Verify suggestions appear (from cached data)
    await expect(page.locator('.recipe-suggestion')).toHaveCount.greaterThan(0);
  });

  test('offline shopping list generation', async ({ page, context }) => {
    // Load data online
    await page.goto('http://localhost:8080');
    await page.waitForFunction(() => (window as any)._appInitialized === true, { timeout: 45000 });

    // Add items to meal plan
    await page.fill('#new-ingredient', 'flour');
    await page.evaluate(() => (window as any).addIngredient());
    await page.waitForTimeout(500);

    await page.click('#nav-meals');
    await page.waitForTimeout(1000);
    await page.click('.recipe-card');
    await page.click('#add-to-meal-plan');
    await page.waitForTimeout(500);

    // Go offline
    await context.setOffline(true);

    // Generate shopping list
    await page.click('#nav-shop');
    await page.click('#generate-shopping-list');
    await page.waitForTimeout(2000);

    // Verify shopping list appears
    await expect(page.locator('#shopping-list-items')).toBeVisible();
    await expect(page.locator('.shopping-item')).toHaveCount.greaterThan(0);
  });

  test('handles offline user preferences', async ({ page, context }) => {
    // Load online and set preferences
    await page.goto('http://localhost:8080');
    await page.click('#nav-settings');
    await page.selectOption('#dietary-preferences', 'vegetarian');
    await page.click('#save-preferences');
    await page.waitForTimeout(500);

    // Go offline
    await context.setOffline(true);
    await page.reload();

    // Verify preferences persist
    await page.click('#nav-settings');
    await expect(page.locator('#dietary-preferences')).toHaveValue('vegetarian');
  });

  test('offline error handling', async ({ page, context }) => {
    // Load online
    await page.goto('http://localhost:8080');

    // Go offline
    await context.setOffline(true);

    // Try to trigger network-dependent operations
    await page.click('#sync-data');
    await page.waitForTimeout(1000);

    // Verify error handling
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('offline');
  });

  test('offline data persistence across sessions', async ({ page, context }) => {
    // Load and add data
    await page.goto('http://localhost:8080');
    await page.fill('#new-ingredient', 'milk');
    await page.evaluate(() => (window as any).addIngredient());
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);

    // Close and reopen page (simulate new session)
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('http://localhost:8080');
    await newPage.waitForTimeout(2000);

    // Verify data persists
    await expect(newPage.locator('#pantry-list')).toContainText('milk');
  });
});
