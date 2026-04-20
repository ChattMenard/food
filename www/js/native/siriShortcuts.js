import { registerPlugin } from '@capacitor/core';

/**
 * Siri Shortcuts Manager - Donates and manages iOS Siri shortcuts
 */
const SiriShortcuts = registerPlugin('SiriShortcutsManager');

/**
 * Donate a Siri shortcut for adding an ingredient
 * Call this when user frequently adds the same ingredient
 */
export async function donateAddIngredientShortcut(ingredient) {
    try {
        if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'ios') {
            await SiriShortcuts.donateAddIngredient({ ingredient });
            console.log('[Siri] Donated shortcut for ingredient:', ingredient);
        }
    } catch (error) {
        console.error('[Siri] Failed to donate ingredient shortcut:', error);
    }
}

/**
 * Donate a Siri shortcut for adding a meal to the plan
 * Call this when user frequently adds the same meal
 */
export async function donateAddMealShortcut(meal) {
    try {
        if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'ios') {
            await SiriShortcuts.donateAddMeal({ meal });
            console.log('[Siri] Donated shortcut for meal:', meal);
        }
    } catch (error) {
        console.error('[Siri] Failed to donate meal shortcut:', error);
    }
}

/**
 * Convenience: donate shortcuts for frequently used ingredients
 */
export async function donateFrequentIngredients(pantry) {
    // Find ingredients added more than 3 times
    const ingredientCounts = {};
    pantry.forEach(item => {
        const name = item.name.toLowerCase();
        ingredientCounts[name] = (ingredientCounts[name] || 0) + 1;
    });

    for (const [ingredient, count] of Object.entries(ingredientCounts)) {
        if (count >= 3) {
            await donateAddIngredientShortcut(ingredient);
        }
    }
}

/**
 * Convenience: donate shortcuts for frequently planned meals
 */
export async function donateFrequentMeals(mealPlan) {
    // This would need historical data - for now just donate current meals
    for (const meal of Object.values(mealPlan)) {
        if (meal) {
            await donateAddMealShortcut(meal);
        }
    }
}
