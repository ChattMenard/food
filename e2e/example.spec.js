/**
 * Example Playwright E2E Test
 * Basic end-to-end test for main
 */

import { test, expect } from '@playwright/test';

test.describe('main E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });
    
    test('loads homepage', async ({ page }) => {
        await expect(page).toHaveTitle(/main/);
    });
    
    test('navigates between tabs', async ({ page }) => {
        // Click on Meals tab
        await page.click('button:has-text("Meals")');
        await expect(page.locator('#tab-meals')).toBeVisible();
        
        // Click on Plan tab
        await page.click('button:has-text("Plan")');
        await expect(page.locator('#tab-plan')).toBeVisible();
        
        // Click on Shop tab
        await page.click('button:has-text("Shop")');
        await expect(page.locator('#tab-shop')).toBeVisible();
    });
    
    test('adds ingredient to pantry', async ({ page }) => {
        // Pantry tab is active by default
        await page.click('button:has-text("Pantry")');
        
        // Fill the always-visible ingredient form
        await page.fill('#new-ingredient', 'Tomato');
        await page.fill('#new-quantity', '5');
        
        // Submit via the Add button
        await page.click('#add-button');
        
        // App normalizes ingredient names to lowercase
        await expect(page.locator('#pantry-list')).toContainText('tomato');
    });
    
    test('shows recipe cards after adding ingredients', async ({ page }) => {
        // Wait for recipe JSON to be fully fetched and processed (flag set in dataManager callback)
        await page.waitForFunction(() => window._recipesLoaded === true, { timeout: 15000 });
        
        // Back to Pantry - add multiple common ingredients.
        // Engine requires matched >= 2 AND ratio >= 0.25, so 4 common items covers both.
        await page.click('button:has-text("Pantry")');
        for (const name of ['chicken', 'garlic', 'onion', 'butter']) {
            await page.fill('#new-ingredient', name);
            await page.fill('#new-quantity', '1');
            await page.click('#add-button');
        }
        
        // Switch to Meals (triggers updateMeals() with now-loaded recipes + populated pantry)
        await page.click('button:has-text("Meals")');
        
        // Wait for recipe cards to render (data-recipe-index is set per card)
        await page.waitForSelector('[data-recipe-index]', { timeout: 10000 });
        
        const cards = await page.locator('[data-recipe-index]').count();
        expect(cards).toBeGreaterThan(0);
    });
    
    test('displays meals list container', async ({ page }) => {
        await page.click('button:has-text("Meals")');
        
        // The meals list container should always be present
        await expect(page.locator('#meals-list')).toBeVisible();
    });
});
