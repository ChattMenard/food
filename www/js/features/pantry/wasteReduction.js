// @ts-check
/**
 * Waste Reduction Module
 * Provides suggestions to reduce food waste based on pantry items and expiry dates
 */

import { BUDGET_SUBSTITUTIONS } from '../plan/budgetMealPlanner.js';

/** @typedef {import('../../types/domain.d').PantryItem} PantryItem */
/** @typedef {import('../../types/domain.d').RecipeSchema} RecipeSchema */
/** @typedef {import('../../types/domain.d').RecipeIngredient} RecipeIngredient */

/**
 * @typedef {Object} WasteSuggestion
 * @property {string} type
 * @property {string} priority
 * @property {string} item
 * @property {string} message
 * @property {string} action
 * @property {string} actionText
 * @property {string[]} [matchedIngredients]
 * @property {number} [matchScore]
 */

/**
 * @typedef {PantryItem & Record<string, unknown>} AnyPantryItem
 */

export class WasteReductionManager {
    constructor() {
        /** @type {WasteSuggestion[]} */
        this.suggestions = [];
    }
    
    /**
     * @param {Date} date
     * @returns {boolean}
     */
    static isValidDate(date) {
        return Number.isFinite(date.getTime());
    }

    /**
     * Analyze pantry for waste reduction opportunities
     * @param {AnyPantryItem[]} pantry - Pantry items
     * @returns {WasteSuggestion[]} Waste reduction suggestions
     */
    analyzePantry(pantry) {
        /** @type {WasteSuggestion[]} */
        const suggestions = [];
        const today = new Date();
        
        // Find items expiring soon
        const expiringSoon = pantry.filter(item => {
            if (!item.expiryDate) return false;
            const expiry = new Date(item.expiryDate);
            if (!WasteReductionManager.isValidDate(expiry)) return false;
            const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 3;
        });
        
        expiringSoon.forEach(item => {
            if (!item.expiryDate) {
                return;
            }
            const expiryDate = new Date(item.expiryDate);
            if (!WasteReductionManager.isValidDate(expiryDate)) {
                return;
            }
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            suggestions.push({
                type: 'expiring-soon',
                priority: 'high',
                item: item.name,
                message: `Use ${item.name} within ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
                action: 'find-recipes',
                actionText: 'Find recipes'
            });
        });
        
        // Find items past expiry
        const expired = pantry.filter(item => {
            if (!item.expiryDate) return false;
            const expiry = new Date(item.expiryDate);
            return WasteReductionManager.isValidDate(expiry) && expiry < today;
        });
        
        expired.forEach(item => {
            suggestions.push({
                type: 'expired',
                priority: 'urgent',
                item: item.name,
                message: `${item.name} has expired`,
                action: 'remove',
                actionText: 'Remove from pantry'
            });
        });
        
        // Find items with low quantity
        const lowQuantity = pantry.filter(item => {
            return item.quantity && item.quantity < 2;
        });
        
        lowQuantity.forEach(item => {
            suggestions.push({
                type: 'low-quantity',
                priority: 'medium',
                item: item.name,
                message: `Low quantity of ${item.name}`,
                action: 'add-to-list',
                actionText: 'Add to shopping list'
            });
        });
        
        // Find items that haven't been used recently
        const staleItems = pantry.filter(item => {
            if (!item.purchaseDate) return false;
            const purchase = new Date(item.purchaseDate);
            if (!WasteReductionManager.isValidDate(purchase)) return false;
            const daysSincePurchase = Math.ceil((today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
            return daysSincePurchase > 14;
        });
        
        staleItems.forEach(item => {
            if (!item.purchaseDate) {
                return;
            }
            const purchase = new Date(item.purchaseDate);
            if (!WasteReductionManager.isValidDate(purchase)) {
                return;
            }
            const daysSincePurchase = Math.ceil((today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
            suggestions.push({
                type: 'stale',
                priority: 'low',
                item: item.name,
                message: `${item.name} hasn't been used in ${daysSincePurchase} days`,
                action: 'find-recipes',
                actionText: 'Find recipes'
            });
        });
        
        // Sort by priority
        /** @type {Record<string, number>} */
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        suggestions.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
        
        this.suggestions = suggestions;
        return suggestions;
    }
    
    /**
     * Get recipes using specific ingredients with enhanced matching
     * @param {string[]} ingredients - Ingredient names
     * @param {RecipeSchema[]} recipes - Available recipes
     * @returns {RecipeSchema[]} Matching recipes sorted by ingredient match ratio
     */
    findRecipesForIngredients(ingredients, recipes) {
        // Build enhanced ingredient set with substitutions and groups
        /** @type {Set<string>} */
        const enhancedIngredientSet = new Set();

        ingredients.forEach((ingredient /** @type {string} */) => {
            const normalized = ingredient.toLowerCase().trim();
            enhancedIngredientSet.add(normalized);

            // Add related ingredients (groups, substitutions, etc.)
            const related = this.getRelatedIngredients(normalized);

            related.forEach((rel /** @type {string} */) => enhancedIngredientSet.add(rel.toLowerCase()));
        });

        const scored = recipes.map((recipe /** @type {RecipeSchema} */) => {
            const recipeIngredients = (recipe.ingredients || [])
                .map((i /** @type {string | RecipeIngredient} */) => (typeof i === 'string' ? i : i.name || '')
                    .toLowerCase()
                    .trim());
            
            // Enhanced matching with partial includes and normalization
            const matches = recipeIngredients.filter((ing /** @type {string} */) => {
                // Direct match
                if (enhancedIngredientSet.has(ing)) return true;
                
                // Partial match - check if recipe ingredient contains any of our ingredients
                for (const setIng of enhancedIngredientSet) {
                    if (ing.includes(setIng) || setIng.includes(ing)) {
                        return true;
                    }
                }
                
                return false;
            });
            
            return {
                recipe,
                matchCount: matches.length,
                matchRatio: matches.length / Math.max(1, recipeIngredients.length),
                matchedIngredients: matches
            };
        });
        
        return scored
            .filter(s => s.matchCount > 0)
            .sort((a, b) => {
                // Primary sort by match ratio
                if (b.matchRatio !== a.matchRatio) {
                    return b.matchRatio - a.matchRatio;
                }
                // Secondary sort by absolute match count
                return b.matchCount - a.matchCount;
            })
            .slice(0, 15) // Increased from 10 to show more options
            .map(s => ({
                ...s.recipe,
                matchScore: Math.round(s.matchRatio * 100),
                matchedIngredients: s.matchedIngredients
            }));
    }
    
    /**
     * Get related ingredients for enhanced matching
     * @param {string} ingredient - Base ingredient
     * @returns {string[]} Related ingredients
     */
    getRelatedIngredients(ingredient) {
        const normalized = ingredient.toLowerCase().trim();
        const related = new Set([ingredient, normalized]);
        
        // Basic pasta family
        if (normalized.includes('pasta') || normalized.includes('noodle') || 
            ['spaghetti', 'linguini', 'penne', 'fettuccine', 'macaroni'].some(p => normalized.includes(p))) {
            ['pasta', 'noodles', 'spaghetti', 'linguini', 'penne', 'fettuccine', 'macaroni', 'rotini', 'orzo'].forEach(ing => related.add(ing));
        }
        
        // Basic cheese family
        if (normalized.includes('cheese') || 
            ['cheddar', 'mozzarella', 'provolone', 'swiss', 'gouda'].some(c => normalized.includes(c))) {
            ['cheese', 'cheddar', 'mozzarella', 'provolone', 'swiss', 'gouda', 'parmesan', 'romano'].forEach(ing => related.add(ing));
        }
        
        // Basic oil family
        if (normalized.includes('oil') || 
            ['olive', 'vegetable', 'canola', 'coconut', 'avocado'].some(o => normalized.includes(o))) {
            ['oil', 'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'avocado oil'].forEach(ing => related.add(ing));
        }

        if (BUDGET_SUBSTITUTIONS[normalized]) {
            BUDGET_SUBSTITUTIONS[normalized].forEach((ing /** @type {string} */) => related.add(ing));
        }
        Object.entries(BUDGET_SUBSTITUTIONS).forEach(([base, subs]) => {
            if (subs.some(sub => sub === normalized)) {
                related.add(base);
                (BUDGET_SUBSTITUTIONS[base] || []).forEach((ing /** @type {string} */) => related.add(ing));
            }
        });

        return Array.from(related);
    }

    /**
     * Calculate potential waste cost
     * @param {AnyPantryItem[]} pantry - Pantry items
     * @param {Record<string, number>} costEstimates - Estimated costs per item
     * @returns {{ totalCost: number; itemCount: number; items: Array<{ item: string; cost: number }> }} Waste cost analysis
     */
    calculateWasteCost(pantry, costEstimates = /** @type {Record<string, number>} */ ({})) {
        const expired = pantry.filter(item => {
            if (!item.expiryDate) return false;
            return new Date(item.expiryDate) < new Date();
        });
        
        let totalCost = 0;
        /** @type {Array<{ item: string; cost: number }>} */
        const itemCosts = [];
        
        expired.forEach((item) => {
            const cost = costEstimates[item.name] || this.estimateCost(item);
            totalCost += cost;
            itemCosts.push({
                item: item.name,
                cost
            });
        });
        
        return {
            totalCost,
            itemCount: expired.length,
            items: itemCosts.sort((a, b) => b.cost - a.cost)
        };
    }
    
    /**
     * Estimate cost of an item
     * @param {PantryItem} item - Pantry item
     * @returns {number} Estimated cost
     */
    estimateCost(item) {

        // Simple estimation based on category
        /** @type {Record<string, number>} */
        const categoryCosts = {
            'vegetables': 2,
            'fruits': 3,
            'dairy': 4,
            'meat': 8,
            'grains': 3,
            'spices': 1,
            'other': 3
        };
        
        const category = item.category || 'other';
        const baseCost = categoryCosts[category] ?? 3;
        
        // Adjust by quantity
        const quantity = item.quantity || 1;
        return baseCost * quantity;
    }
    
    /**
     * Get waste reduction tips
     * @returns {Array<{ title: string; description: string; icon: string }>} Tips for reducing waste
     */
    getTips() {
        return [
            {
                title: 'First In, First Out',
                description: 'Use older items before newer ones to prevent spoilage',
                icon: '🔄'
            },
            {
                title: 'Proper Storage',
                description: 'Store fruits and vegetables separately to slow ripening',
                icon: '🥬'
            },
            {
                title: 'Freeze Excess',
                description: 'Freeze items that are about to expire for later use',
                icon: '❄️'
            },
            {
                title: 'Meal Planning',
                description: 'Plan meals around ingredients that will expire soon',
                icon: '📋'
            },
            {
                title: 'Portion Control',
                description: 'Cook only what you need to avoid leftovers',
                icon: '⚖️'
            },
            {
                title: 'Compost',
                description: 'Compost unavoidable food waste to reduce environmental impact',
                icon: '🌱'
            }
        ];
    }
    
    /**
     * Generate weekly waste report
     * @param {AnyPantryItem[]} pantry - Pantry items
     * @returns {Object} Weekly waste report
     */
    generateWeeklyReport(pantry) {
        const suggestions = this.analyzePantry(pantry);
        const wasteCost = this.calculateWasteCost(pantry);
        const tips = this.getTips();
        
        return {
            date: new Date().toISOString(),
            suggestions,
            wasteCost,
            tips,
            summary: {
                expiringSoon: suggestions.filter(s => s.type === 'expiring-soon').length,
                expired: suggestions.filter(s => s.type === 'expired').length,
                lowQuantity: suggestions.filter(s => s.type === 'low-quantity').length,
                potentialSavings: wasteCost.totalCost
            }
        };
    }
}

// Global waste reduction manager instance
/** @type {WasteReductionManager | null} */
let globalWasteReductionManager = null;

/**
 * Get or create the global waste reduction manager
 * @returns {WasteReductionManager}
 */
export function getWasteReductionManager() {
    if (!globalWasteReductionManager) {
        globalWasteReductionManager = new WasteReductionManager();
    }
    return globalWasteReductionManager;
}
