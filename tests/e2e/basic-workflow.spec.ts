/**
 * Basic E2E Test Workflow
 * Tests core user journey from pantry management to meal planning
 */

import { test, expect } from '@playwright/test';

test.describe('Fridge to Fork Basic Workflow', () => {
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
    await page.waitForSelector('.recipe-suggestion', { timeout: 10000 });
    
    // Verify suggestions are displayed
    await expect(page.locator('.recipe-suggestion')).toHaveCount.greaterThan(0);
  });

  test('should add recipe to meal plan', async ({ page }) => {
    // Add ingredients
    await page.fill('#new-ingredient', 'pasta');
    await page.click('#add-ingredient-btn');
    await page.fill('#new-ingredient', 'tomatoes');
    await page.click('#add-ingredient-btn');
    
    // Wait for recipe suggestions
    await page.waitForSelector('.recipe-suggestion', { timeout: 10000 });
    
    // Click on first recipe suggestion
    await page.locator('.recipe-suggestion').first().click();
    
    // Add to meal plan
    await page.click('#add-to-meal-plan');
    
    // Verify recipe was added to meal plan
    await expect(page.locator('#meal-plan .meal-item')).toHaveCount.greaterThan(0);
  });

  test('should generate shopping list', async ({ page }) => {
    // Add ingredients to pantry
    await page.fill('#new-ingredient', 'flour');
    await page.click('#add-ingredient-btn');
    await page.fill('#new-ingredient', 'eggs');
    await page.click('#add-ingredient-btn');
    
    // Navigate to shopping list
    await page.click('#nav-shopping');
    
    // Generate shopping list
    await page.click('#generate-shopping-list');
    
    // Wait for shopping list to generate
    await page.waitForSelector('#shopping-list-items', { timeout: 10000 });
    
    // Verify shopping list contains items
    await expect(page.locator('#shopping-list-items .shopping-item')).toHaveCount.greaterThan(0);
  });

  test('should handle recipe search', async ({ page }) => {
    // Navigate to recipes section
    await page.click('#nav-recipes');
    
    // Search for specific recipe
    await page.fill('#recipe-search', 'chicken');
    await page.click('#search-btn');
    
    // Wait for search results
    await page.waitForSelector('.recipe-card', { timeout: 10000 });
    
    // Verify search results
    await expect(page.locator('.recipe-card')).toHaveCount.greaterThan(0);
    
    // Verify results contain search term
    await expect(page.locator('.recipe-card').first()).toContainText('chicken');
  });

  test('should handle meal plan editing', async ({ page }) => {
    // Add ingredients and create meal plan
    await page.fill('#new-ingredient', 'beef');
    await page.click('#add-ingredient-btn');
    
    // Wait for suggestions and add to meal plan
    await page.waitForSelector('.recipe-suggestion', { timeout: 10000 });
    await page.locator('.recipe-suggestion').first().click();
    await page.click('#add-to-meal-plan');
    
    // Edit meal plan item
    await page.click('.meal-item .edit-btn');
    
    // Change meal date
    await page.fill('#meal-date', '2024-01-15');
    await page.click('#save-meal');
    
    // Verify meal was updated
    await expect(page.locator('.meal-item')).toContainText('2024-01-15');
  });

  test('should handle offline functionality', async ({ page }) => {
    // Add ingredients while online
    await page.fill('#new-ingredient', 'potatoes');
    await page.click('#add-ingredient-btn');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to add ingredient while offline
    await page.fill('#new-ingredient', 'carrots');
    await page.click('#add-ingredient-btn');
    
    // Verify ingredient was added (should work offline)
    await expect(page.locator('#pantry-list')).toContainText('carrots');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Verify data syncs when back online
    await page.waitForTimeout(2000);
    await expect(page.locator('#sync-status')).toContainText('synced');
  });

  test('should handle user preferences', async ({ page }) => {
    // Navigate to preferences
    await page.click('#nav-settings');
    
    // Set dietary preferences
    await page.selectOption('#dietary-preferences', 'vegetarian');
    await page.checkOption('#enable-notifications');
    
    // Save preferences
    await page.click('#save-preferences');
    
    // Verify preferences were saved
    await expect(page.locator('#preferences-saved')).toBeVisible();
    
    // Navigate back to main
    await page.click('#nav-home');
    
    // Verify preferences affect suggestions
    await page.fill('#new-ingredient', 'cheese');
    await page.click('#add-ingredient-btn');
    
    await page.waitForSelector('.recipe-suggestion', { timeout: 10000 });
    
    // Should show vegetarian recipes
    const recipes = page.locator('.recipe-suggestion');
    const recipeTexts = await recipes.allTextContents();
    
    // Verify no meat recipes (basic check)
    recipeTexts.forEach(text => {
      expect(text.toLowerCase()).not.toContain('chicken');
      expect(text.toLowerCase()).not.toContain('beef');
      expect(text.toLowerCase()).not.toContain('pork');
    });
  });
});
