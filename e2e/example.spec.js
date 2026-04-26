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
        await page.click('.tab[data-tab="meals"]');
        await expect(page.locator('#tab-meals')).toBeVisible();
        
        // Click on Plan tab
        await page.click('.tab[data-tab="plan"]');
        await expect(page.locator('#tab-plan')).toBeVisible();
        
        // Click on Shop tab
        await page.click('.tab[data-tab="shop"]');
        await expect(page.locator('#tab-shop')).toBeVisible();
    });
    
    test('adds ingredient to pantry', async ({ page }) => {
        // Pantry tab is active by default
        await page.click('.tab[data-tab="pantry"]');
        
        // Fill the always-visible ingredient form
        await page.fill('#new-ingredient', 'Tomato');
        
        // Submit via the Add button
        await page.locator('#new-ingredient').blur();
        await page.click('#add-button');
        
        // App normalizes ingredient names to lowercase
        await expect(page.locator('#pantry-list')).toContainText('tomato');
    });
    
    test('shows recipe cards after adding ingredients', async ({ page }) => {
        // Wait for recipe JSON to be fully fetched and processed (flag set in dataManager callback)
        await page.waitForFunction(() => window._recipesLoaded === true, { timeout: 15000 });
        
        // Back to Pantry - add multiple common ingredients.
        // Engine requires matched >= 2 AND ratio >= 0.25, so 4 common items covers both.
        await page.click('.tab[data-tab="pantry"]');
        for (const name of ['chicken', 'garlic', 'onion', 'butter']) {
            await page.fill('#new-ingredient', name);
            await page.locator('#new-ingredient').blur();
            await page.click('#add-button');
        }
        
        // Switch to Meals (triggers updateMeals() with now-loaded recipes + populated pantry)
        await page.click('.tab[data-tab="meals"]');
        
        // Wait for recipe cards to render (data-recipe-index is set per card)
        await page.waitForSelector('[data-recipe-index]', { timeout: 10000 });
        
        const cards = await page.locator('[data-recipe-index]').count();
        expect(cards).toBeGreaterThan(0);
    });
    
    test('displays meals list container', async ({ page }) => {
        await page.click('.tab[data-tab="meals"]');
        
        // The meals list container should always be present
        await expect(page.locator('#meals-list')).toBeVisible();
    });
});
