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
        await page.waitForFunction(() => (window as any)._appInitialized === true, { timeout: 45000 });
        
        await page.getByTestId('nav-meals').click();
        await expect(page.locator('#tab-meals')).toBeVisible();
        
        await page.getByTestId('nav-plan').click();
        await expect(page.locator('#tab-plan')).toBeVisible();
        
        await page.getByTestId('nav-shop').click();
        await expect(page.locator('#tab-shop')).toBeVisible();
    });
    
    test('adds ingredient to pantry', async ({ page }) => {
        await page.waitForFunction(() => (window as any)._appInitialized === true, { timeout: 45000 });
        await page.getByTestId('nav-pantry').click();
        
        await page.fill('#new-ingredient', 'Tomato');
        await page.press('#new-ingredient', 'Enter');
        await page.waitForTimeout(500);
        
        await expect(page.locator('#pantry-list')).toContainText('tomato');
    });
    
    test('shows recipe cards after adding ingredients', async ({ page }) => {
        // Wait for recipe JSON to be fully fetched and processed
        await page.waitForFunction(() => (window as any)._recipesLoaded === true, { timeout: 50000 });
        
        await page.getByTestId('nav-pantry').click();
        for (const name of ['chicken', 'garlic', 'onion', 'butter']) {
            await page.fill('#new-ingredient', name);
            await page.press('#new-ingredient', 'Enter');
            await page.waitForTimeout(300);
        }
        
        await page.getByTestId('nav-meals').click();
        await expect(page.locator('.recipe-card')).toBeVisible({ timeout: 10000 });
    });
    
    test('searches for recipes', async ({ page }) => {
        await page.waitForFunction(() => (window as any)._recipesLoaded === true, { timeout: 50000 });
        
        await page.fill('#recipe-search', 'pasta');
        await page.waitForTimeout(500);
        
        const recipeCards = page.locator('.recipe-card');
        await expect(recipeCards.first()).toBeVisible();
    });
    
    test('adds recipe to meal plan', async ({ page }) => {
        await page.waitForFunction(() => (window as any)._appInitialized === true, { timeout: 45000 });
        
        await page.getByTestId('nav-meals').click();
        await page.waitForSelector('.recipe-card', { timeout: 10000 });
        
        const firstRecipe = page.locator('.recipe-card').first();
        await firstRecipe.click();
        
        await page.getByTestId('add-to-meal-plan').click();
        await expect(page.getByText('Added to meal plan')).toBeVisible({ timeout: 5000 });
    });
    
    test('generates shopping list', async ({ page }) => {
        await page.waitForFunction(() => (window as any)._appInitialized === true, { timeout: 45000 });
        
        await page.getByTestId('nav-shop').click();
        await page.getByTestId('generate-shopping-list').click();
        
        await expect(page.locator('#shopping-list')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('.shopping-item')).toHaveCount.greaterThan(0);
    });
});
