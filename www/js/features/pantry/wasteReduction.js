// @ts-check
/**
 * Waste Reduction Module
 * Provides suggestions to reduce food waste based on pantry items and expiry dates
 */

export class WasteReductionManager {
    constructor() {
        this.suggestions = [];
    }
    
    /**
     * Analyze pantry for waste reduction opportunities
     * @param {Array} pantry - Pantry items
     * @returns {Array} Waste reduction suggestions
     */
    analyzePantry(pantry) {
        const suggestions = [];
        const today = new Date();
        
        // Find items expiring soon
        const expiringSoon = pantry.filter(item => {
            if (!item.expiryDate) return false;
            const expiry = new Date(item.expiryDate);
            const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 3;
        });
        
        expiringSoon.forEach(item => {
            const daysUntilExpiry = Math.ceil((new Date(item.expiryDate) - today) / (1000 * 60 * 60 * 24));
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
            return expiry < today;
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
            const daysSincePurchase = Math.ceil((today - purchase) / (1000 * 60 * 60 * 24));
            return daysSincePurchase > 14;
        });
        
        staleItems.forEach(item => {
            const daysSincePurchase = Math.ceil((today - new Date(item.purchaseDate)) / (1000 * 60 * 60 * 24));
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
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
        this.suggestions = suggestions;
        return suggestions;
    }
    
    /**
     * Get recipes using specific ingredients with enhanced matching
     * @param {Array} ingredients - Ingredient names
     * @param {Array} recipes - Available recipes
     * @returns {Array} Matching recipes sorted by ingredient match ratio
     */
    findRecipesForIngredients(ingredients, recipes) {
        // Build enhanced ingredient set with substitutions and groups
        const enhancedIngredientSet = new Set();
        
        ingredients.forEach(ingredient => {
            const normalized = ingredient.toLowerCase().trim();
            enhancedIngredientSet.add(normalized);
            
            // Add related ingredients (groups, substitutions, etc.)
            const related = this.getRelatedIngredients ? 
                this.getRelatedIngredients(normalized) : 
                [normalized];
            
            related.forEach(rel => enhancedIngredientSet.add(rel.toLowerCase()));
        });
        
        const scored = recipes.map(recipe => {
            const recipeIngredients = (recipe.ingredients || [])
                .map(i => i.toLowerCase().trim());
            
            // Enhanced matching with partial includes and normalization
            const matches = recipeIngredients.filter(ing => {
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
     * @returns {Array} - Array of related ingredients
     */
    getRelatedIngredients(ingredient) {
        // Import from budgetMealPlanner if available
        if (typeof getRelatedIngredients === 'function') {
            return getRelatedIngredients(ingredient);
        }
        
        // Fallback to basic normalization
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
        
        return Array.from(related);
    }
    
    /**
     * Calculate potential waste cost
     * @param {Array} pantry - Pantry items
     * @param {Object} costEstimates - Estimated costs per item
     * @returns {Object} Waste cost analysis
     */
    calculateWasteCost(pantry, costEstimates = {}) {
        const expired = pantry.filter(item => {
            if (!item.expiryDate) return false;
            return new Date(item.expiryDate) < new Date();
        });
        
        let totalCost = 0;
        const itemCosts = [];
        
        expired.forEach(item => {
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
     * @param {Object} item - Pantry item
     * @returns {number} Estimated cost
     */
    estimateCost(item) {

        // Simple estimation based on category
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
        const baseCost = categoryCosts[category] || 3;
        
        // Adjust by quantity
        const quantity = item.quantity || 1;
        return baseCost * quantity;
    }
    
    /**
     * Get waste reduction tips
     * @returns {Array} Tips for reducing waste
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
     * @param {Array} pantry - Pantry items
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
