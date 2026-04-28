/**
 * Basic E2E Test Workflow
 * Tests core user journey from pantry management to meal planning
 */

import { test, expect } from '@playwright/test';

test.describe('Pantry AI Basic Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:8080');
    
    // Wait for app to initialize
    await page.waitForSelector('#_appInitialized', { state: 'attached' });
    await page.waitForLoadState('networkidle');
  });

  test('should load the main application', async ({ page }) => {
    // Check main elements are present
    await expect(page.locator('h1')).toContainText('Fridge to Fork');
    await expect(page.locator('#new-ingredient')).toBeVisible();
    await expect(page.locator('#pantry-list')).toBeVisible();
    await expect(page.locator('#meal-plan')).toBeVisible();
  });

  test('should add ingredients to pantry', async ({ page }) => {
    // Add a new ingredient
    await page.fill('#new-ingredient', 'tomatoes');
    await page.click('#add-ingredient-btn');
    
    // Verify ingredient was added
    await expect(page.locator('#pantry-list')).toContainText('tomatoes');
    
    // Add another ingredient
    await page.fill('#new-ingredient', 'onions');
    await page.click('#add-ingredient-btn');
    
    // Verify both ingredients are present
    await expect(page.locator('#pantry-list')).toContainText('tomatoes');
    await expect(page.locator('#pantry-list')).toContainText('onions');
  });

  test('should generate meal suggestions', async ({ page }) => {
    // Add ingredients first
    await page.fill('#new-ingredient', 'chicken');
    await page.click('#add-ingredient-btn');
    await page.fill('#new-ingredient', 'rice');
    await page.click('#add-ingredient-btn');
    
    // Wait for AI suggestions to load
    await page.waitForSelector('.ai-suggestions', { timeout: 10000 });
    
    // Check if suggestions are displayed
    const suggestions = page.locator('.ai-suggestions .list-item');
    await expect(suggestions.first()).toBeVisible();
  });

  test('should add meals to plan', async ({ page }) => {
    // Add ingredients
    await page.fill('#new-ingredient', 'pasta');
    await page.click('#add-ingredient-btn');
    await page.fill('#new-ingredient', 'tomato sauce');
    await page.click('#add-ingredient-btn');
    
    // Generate suggestions
    await page.waitForSelector('.ai-suggestions', { timeout: 10000 });
    
    // Click on a suggestion to add to meal plan
    const firstSuggestion = page.locator('.ai-suggestions .list-item').first();
    await firstSuggestion.click();
    
    // Verify meal was added to plan
    await expect(page.locator('#meal-plan')).toContainText('pasta');
  });

  test('should handle ingredient quantities', async ({ page }) => {
    // Add ingredient with quantity
    await page.fill('#new-ingredient', '2 cups flour');
    await page.click('#add-ingredient-btn');
    
    // Verify quantity is preserved
    await expect(page.locator('#pantry-list')).toContainText('2 cups flour');
    
    // Edit quantity
    await page.click('[data-action="edit"]:first-child');
    await page.fill('[data-field="quantity"]', '3 cups');
    await page.click('[data-action="save"]');
    
    // Verify updated quantity
    await expect(page.locator('#pantry-list')).toContainText('3 cups flour');
  });

  test('should delete ingredients', async ({ page }) => {
    // Add ingredient
    await page.fill('#new-ingredient', 'test ingredient');
    await page.click('#add-ingredient-btn');
    
    // Verify it exists
    await expect(page.locator('#pantry-list')).toContainText('test ingredient');
    
    // Delete it
    await page.click('[data-action="delete"]:first-child');
    
    // Verify it's gone
    await expect(page.locator('#pantry-list')).not.toContainText('test ingredient');
  });

  test('should persist data across page reloads', async ({ page }) => {
    // Add some ingredients
    await page.fill('#new-ingredient', 'milk');
    await page.click('#add-ingredient-btn');
    await page.fill('#new-ingredient', 'eggs');
    await page.click('#add-ingredient-btn');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify data persisted
    await expect(page.locator('#pantry-list')).toContainText('milk');
    await expect(page.locator('#pantry-list')).toContainText('eggs');
  });

  test('should handle offline mode', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to add ingredient
    await page.fill('#new-ingredient', 'offline ingredient');
    await page.click('#add-ingredient-btn');
    
    // Should still work (offline queue)
    await expect(page.locator('#pantry-list')).toContainText('offline ingredient');
    
    // Check for offline indicator
    await expect(page.locator('#offline-indicator')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Offline indicator should disappear
    await expect(page.locator('#offline-indicator')).toBeHidden();
  });

  test('should be accessible via keyboard', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('#new-ingredient')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#add-ingredient-btn')).toBeFocused();
    
    // Test keyboard activation
    await page.focus('#new-ingredient');
    await page.keyboard.type('keyboard test');
    await page.keyboard.press('Enter');
    
    // Verify ingredient was added
    await expect(page.locator('#pantry-list')).toContainText('keyboard test');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Try to add empty ingredient
    await page.fill('#new-ingredient', '');
    await page.click('#add-ingredient-btn');
    
    // Should not add empty ingredient
    const pantryItems = page.locator('#pantry-list .list-item');
    const initialCount = await pantryItems.count();
    
    // Try again with valid ingredient
    await page.fill('#new-ingredient', 'valid ingredient');
    await page.click('#add-ingredient-btn');
    
    // Should add valid ingredient
    await expect(page.locator('#pantry-list')).toContainText('valid ingredient');
  });

  test('should display nutrition information', async ({ page }) => {
    // Add ingredients
    await page.fill('#new-ingredient', 'chicken breast');
    await page.click('#add-ingredient-btn');
    await page.fill('#new-ingredient', 'broccoli');
    await page.click('#add-ingredient-btn');
    
    // Add to meal plan
    await page.waitForSelector('.ai-suggestions', { timeout: 10000 });
    await page.click('.ai-suggestions .list-item').first();
    
    // Check nutrition section
    await expect(page.locator('#nutrition-info')).toBeVisible();
    
    // Should show some nutrition data
    const nutritionContent = page.locator('#nutrition-info').textContent();
    expect(nutritionContent?.length || 0).toBeGreaterThan(0);
  });
});

test.describe('Pantry AI Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    // Test mobile interactions
    await page.fill('#new-ingredient', 'mobile test');
    await page.tap('#add-ingredient-btn');
    
    await expect(page.locator('#pantry-list')).toContainText('mobile test');
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    // Test tablet interactions
    await page.fill('#new-ingredient', 'tablet test');
    await page.click('#add-ingredient-btn');
    
    await expect(page.locator('#pantry-list')).toContainText('tablet test');
  });
});

test.describe('Pantry AI Performance', () => {
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should respond quickly to interactions', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    const startTime = Date.now();
    
    await page.fill('#new-ingredient', 'performance test');
    await page.click('#add-ingredient-btn');
    
    await expect(page.locator('#pantry-list')).toContainText('performance test');
    
    const responseTime = Date.now() - startTime;
    
    // Should respond within 1 second
    expect(responseTime).toBeLessThan(1000);
  });
});
