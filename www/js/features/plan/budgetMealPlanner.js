// @ts-check
/**
 * Budget Meal Planner
 * Multi-tier budget meal planning with cost-aware recipe selection
 * Integrates with CostTracker and NutritionDashboard
 */

import db from '../../data/db.js';

// Budget tiers with per-meal cost targets (USD)
const BUDGET_TIERS = {
    low: {
        id: 'low',
        name: 'Budget-Conscious',
        description: 'Under $3 per serving',
        maxPerServing: 3.00,
        weeklyBudget: 60,  // ~20 meals
        icon: '💰'
    },
    medium: {
        id: 'medium',
        name: 'Moderate',
        description: '$3-6 per serving',
        maxPerServing: 6.00,
        weeklyBudget: 120,
        icon: '💰💰'
    },
    high: {
        id: 'high',
        name: 'Premium',
        description: '$6-10 per serving',
        maxPerServing: 10.00,
        weeklyBudget: 200,
        icon: '💰💰💰'
    }
};

// Ingredient normalization groups - base words for families
const INGREDIENT_GROUPS = {
    // Pasta/Noodles family
    'pasta': ['pasta', 'noodles', 'macaroni', 'spaghetti', 'linguini', 'penne', 'fettuccine', 'rotini', 'orzo', 'elbows', 'shells', 'farfalle', 'rigatoni', 'ziti', 'cavatappi', 'campanelle', 'gemelli'],
    'rice': ['rice', 'white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'arborio rice', 'sushi rice', 'wild rice', 'black rice', 'red rice'],
    
    // Cheese family
    'cheese': ['cheese', 'cheddar', 'mozzarella', 'provolone', 'swiss', 'gouda', 'brie', 'feta', 'goat cheese', 'cream cheese', 'parmesan', 'romano', 'asiago', 'colby', 'monterey jack', 'havarti', 'muenster', 'blue cheese', 'gorgonzola', 'ricotta', 'cottage cheese'],
    'hard cheese': ['parmesan', 'romano', 'asiago', 'pecorino', 'grana padano'],
    'soft cheese': ['cream cheese', 'ricotta', 'cottage cheese', 'mascarpone', 'neufchatel', 'farmer cheese'],
    'melting cheese': ['mozzarella', 'provolone', 'monterey jack', 'cheddar', 'colby', 'muenster', 'havarti'],
    
    // Oil family
    'oil': ['oil', 'olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'avocado oil', 'sesame oil', 'sunflower oil', 'grapeseed oil', 'peanut oil', 'walnut oil', 'corn oil', 'safflower oil'],
    'cooking oil': ['olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'avocado oil', 'sunflower oil', 'grapeseed oil'],
    'specialty oil': ['sesame oil', 'peanut oil', 'walnut oil', 'truffle oil', 'chili oil'],
    
    // Onion family
    'onion': ['onion', 'yellow onion', 'white onion', 'red onion', 'sweet onion', 'vidalia', 'shallot', 'leek', 'scallion', 'green onion', 'chive', 'pearl onion', 'cippolini'],
    'allium': ['onion', 'garlic', 'shallot', 'leek', 'scallion', 'chive'],
    
    // Pepper family
    'pepper': ['pepper', 'bell pepper', 'green pepper', 'red pepper', 'yellow pepper', 'orange pepper', 'jalapeno', 'habanero', 'serrano', 'poblano', 'anaheim', 'cayenne', 'chili pepper', 'paprika'],
    'sweet pepper': ['bell pepper', 'green pepper', 'red pepper', 'yellow pepper', 'orange pepper', 'pimento'],
    'hot pepper': ['jalapeno', 'habanero', 'serrano', 'poblano', 'anaheim', 'cayenne', 'chili pepper'],
    
    // Squash family
    'squash': ['squash', 'zucchini', 'yellow squash', 'butternut squash', 'acorn squash', 'spaghetti squash', 'delicata squash', 'kabocha', 'pumpkin'],
    'summer squash': ['zucchini', 'yellow squash', 'pattypan squash'],
    'winter squash': ['butternut squash', 'acorn squash', 'spaghetti squash', 'delicata squash', 'kabocha', 'pumpkin', 'hubbard'],
    
    // Tomato family
    'tomato': ['tomato', 'roma tomato', 'cherry tomato', 'grape tomato', 'plum tomato', 'heirloom tomato', 'campari tomato', 'beefsteak tomato'],
    
    // Protein cuts
    'chicken': ['chicken', 'chicken breast', 'chicken thigh', 'chicken leg', 'chicken wing', 'whole chicken'],
    'beef': ['beef', 'ground beef', 'steak', 'roast beef', 'brisket', 'chuck', 'sirloin', 'ribeye'],
    'pork': ['pork', 'pork chop', 'pork shoulder', 'pork loin', 'pork belly', 'bacon', 'ham'],
    'fish': ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'snapper', 'mahi mahi', 'swordfish'],
    
    // Flour family
    'flour': ['flour', 'all-purpose flour', 'bread flour', 'cake flour', 'whole wheat flour', 'pastry flour', 'self-rising flour'],
    'gluten-free flour': ['almond flour', 'coconut flour', 'rice flour', 'oat flour', 'buckwheat flour'],
    
    // Sugar family
    'sugar': ['sugar', 'white sugar', 'brown sugar', 'powdered sugar', 'raw sugar', 'turbinado', 'demerara', 'cane sugar'],
    'liquid sweetener': ['honey', 'maple syrup', 'agave', 'corn syrup', 'molasses'],
    
    // Vinegar family
    'vinegar': ['vinegar', 'white vinegar', 'apple cider vinegar', 'red wine vinegar', 'balsamic vinegar', 'rice vinegar', 'malt vinegar'],
    
    // Milk family
    'milk': ['milk', 'whole milk', '2% milk', 'skim milk', 'buttermilk', 'evaporated milk', 'sweetened condensed milk'],
    'plant milk': ['almond milk', 'soy milk', 'oat milk', 'coconut milk', 'rice milk']
};

// Budget-friendly ingredient substitutions
const BUDGET_SUBSTITUTIONS = {
    // Proteins (expensive → cheaper)
    'beef': ['chicken', 'pork', 'beans', 'lentils', 'eggs', 'turkey', 'tofu'],
    'steak': ['chicken thigh', 'pork chop', 'tofu', 'mushrooms', 'portobello', 'seitan'],
    'salmon': ['canned tuna', 'mackerel', 'sardines', 'chicken', 'trout', 'cod'],
    'shrimp': ['chicken', 'tofu', 'white fish', 'eggs', 'scallops', 'calamari'],
    'lamb': ['pork', 'chicken', 'turkey', 'mushrooms', 'beef', 'seitan'],
    'veal': ['chicken', 'pork', 'turkey', 'mushrooms', 'beef'],
    
    // Dairy
    'heavy cream': ['milk', 'evaporated milk', 'coconut milk', 'greek yogurt', 'cashew cream', 'silken tofu'],
    'butter': ['oil', 'margarine', 'shortening', 'ghee', 'coconut oil', 'applesauce'],
    'cheese': ['nutritional yeast', 'eggs', 'beans', 'cashew cheese', 'nut cheese'],
    'parmesan': ['nutritional yeast', 'romano', 'asiago', 'pecorino', 'grana padano'],
    'mozzarella': ['provolone', 'monterey jack', 'cheddar', 'havarti', 'cashew cheese'],
    'cheddar': ['provolone', 'swiss', 'gouda', 'colby', 'monterey jack', 'cheddar alternative'],
    'cream cheese': ['neufchatel', 'mascarpone', 'ricotta', 'greek yogurt', 'cashew cream'],
    'sour cream': ['greek yogurt', 'creme fraiche', 'buttermilk', 'cashew cream'],
    
    // Pasta/Grains
    'pasta': ['noodles', 'rice', 'quinoa', 'barley', 'couscous', 'orzo', 'potatoes'],
    'quinoa': ['rice', 'bulgur', 'barley', 'oats', 'farro', 'millet'],
    'couscous': ['rice', 'orzo', 'quinoa', 'barley', 'bulgur'],
    'arborio rice': ['sushi rice', 'short grain rice', 'risotto rice', 'pearl barley'],
    'wild rice': ['brown rice', 'mixed rice', 'black rice', 'barley'],
    'bread': ['tortillas', 'pita', 'naan', 'rolls', 'crackers'],
    
    // Oils
    'olive oil': ['vegetable oil', 'canola oil', 'butter', 'coconut oil', 'avocado oil'],
    'coconut oil': ['butter', 'vegetable oil', 'avocado oil', 'olive oil'],
    'avocado oil': ['olive oil', 'grapeseed oil', 'canola oil', 'vegetable oil'],
    'sesame oil': ['peanut oil', 'walnut oil', 'toasted sesame seeds', 'chili oil'],
    'truffle oil': ['mushroom oil', 'olive oil + mushrooms', 'truffle seasoning'],
    
    // Produce
    'fresh herbs': ['dried herbs', 'frozen herbs', 'herb paste', 'herb oil'],
    'basil': ['oregano', 'thyme', 'marjoram', 'italian seasoning'],
    'rosemary': ['thyme', 'oregano', 'marjoram', 'sage'],
    'cilantro': ['parsley', 'culantro', 'coriander seeds', 'mint'],
    'mint': ['basil', 'oregano', 'marjoram'],
    'out-of-season': ['frozen', 'canned', 'seasonal alternative'],
    'pine nuts': ['sunflower seeds', 'peanuts', 'pumpkin seeds', 'walnuts', 'almonds'],
    'avocado': ['hummus', 'peanut butter', 'mashed beans', 'guacamole mix'],
    'zucchini': ['yellow squash', 'cucumber', 'eggplant', 'carrots'],
    'bell pepper': ['poblano', 'anaheim', 'cubanelle', 'banana pepper'],
    
    // Onions/Alliums
    'shallot': ['onion', 'garlic', 'leek', 'scallion', 'chive'],
    'leek': ['onion', 'shallot', 'scallion', 'green onion'],
    'scallion': ['green onion', 'chive', 'shallot', 'leek'],
    
    // Pantry
    'saffron': ['turmeric', 'paprika', 'safflower', 'annatto'],
    'vanilla bean': ['vanilla extract', 'maple syrup', 'almond extract'],
    'maple syrup': ['honey', 'brown sugar + water', 'molasses', 'agave'],
    'balsamic vinegar': ['red wine vinegar + sugar', 'apple cider vinegar', 'red wine vinegar'],
    'worcestershire': ['soy sauce + vinegar', 'tamari', 'mushroom sauce'],
    'fish sauce': ['soy sauce', 'miso', 'salt', 'anchovy paste'],
    'sriracha': ['sambal oelek', 'chili garlic sauce', 'hot sauce + garlic'],
    
    // Specialty items
    'gochujang': ['sriracha + miso', 'chili paste', 'gochugaru + miso'],
    'miso': ['soy sauce', 'salt + umami seasoning', 'tamari', 'fish sauce'],
    'tahini': ['peanut butter', 'sunflower seed butter', 'almond butter', 'sesame paste'],
    'hummus': ['bean dip', 'white bean puree', 'baba ganoush'],
    'pesto': ['herb oil', 'green sauce', 'arugula pesto', 'walnut pesto'],
    
    // Canned/Convenience
    'coconut milk': ['milk + coconut extract', 'evaporated milk', 'cream + coconut'],
    'curry paste': ['curry powder + yogurt', 'spice blend', 'curry sauce'],
    'harissa': ['hot sauce + spices', 'sambal oelek', 'chili garlic paste'],
    'sambal oelek': ['sriracha', 'chili flakes + vinegar', 'red pepper paste'],
    'dashi': ['chicken broth', 'vegetable broth', 'mushroom broth'],
    
    // Baking
    'cake flour': ['all-purpose flour + cornstarch', 'pastry flour'],
    'pastry flour': ['all-purpose flour + cake flour', 'low-gluten flour'],
    'self-rising flour': ['all-purpose flour + baking powder + salt'],
    'cornstarch': ['arrowroot', 'tapioca starch', 'potato starch'],
    'gelatin': ['agar-agar', 'pectin', 'carrageenan'],
    
    // Sweeteners
    'brown sugar': ['white sugar + molasses', 'maple sugar', 'coconut sugar'],
    'powdered sugar': ['white sugar + cornstarch', 'blended sugar'],
    'honey': ['maple syrup', 'agave', 'brown sugar + water'],
    'molasses': ['brown sugar', 'maple syrup', 'treacle'],
    
    // Legumes
    'lentils': ['beans', 'split peas', 'chickpeas', 'edamame'],
    'chickpeas': ['garbanzo beans', 'white beans', 'cannellini beans', 'great northern beans'],
    'black beans': ['kidney beans', 'pinto beans', 'navy beans'],
    
    // Nuts/Seeds
    'almonds': ['walnuts', 'pecans', 'cashews', 'sunflower seeds'],
    'walnuts': ['pecans', 'almonds', 'cashews', 'pumpkin seeds'],
    'cashews': ['almonds', 'macadamia nuts', 'sunflower seeds', 'peanuts']
};

// Cheap base ingredients by category
const BUDGET_BASES = {
    proteins: ['eggs', 'beans', 'lentils', 'chicken thighs', 'pork shoulder', 'tofu'],
    grains: ['rice', 'pasta', 'oats', 'potatoes', 'bread', 'tortillas'],
    vegetables: ['carrots', 'onions', 'cabbage', 'potatoes', 'seasonal greens'],
    flavor: ['garlic', 'ginger', 'spices', 'soy sauce', 'vinegar', 'lemon']
};

/**
 * Normalize ingredient to base form using ingredient groups
 * @param {string} ingredient - Ingredient name to normalize
 * @returns {string} - Base ingredient name
 */
function normalizeIngredient(ingredient) {
    const normalized = ingredient.toLowerCase().trim();
    
    // Check if ingredient matches any group
    for (const [baseName, variants] of Object.entries(INGREDIENT_GROUPS)) {
        if (variants.some(variant => 
            normalized === variant || 
            normalized.includes(variant) || 
            variant.includes(normalized)
        )) {
            return baseName;
        }
    }
    
    return normalized;
}

/**
 * Get all related ingredients for a given ingredient (including substitutions)
 * @param {string} ingredient - Base ingredient
 * @returns {string[]} - Array of related ingredients
 */
export function getRelatedIngredients(ingredient) {
    const normalized = normalizeIngredient(ingredient);
    const related = new Set([ingredient, normalized]);
    
    // Add group members
    if (INGREDIENT_GROUPS[normalized]) {
        INGREDIENT_GROUPS[normalized].forEach(ing => related.add(ing));
    }
    
    // Add substitutions
    if (BUDGET_SUBSTITUTIONS[normalized]) {
        BUDGET_SUBSTITUTIONS[normalized].forEach(sub => related.add(sub));
    }
    
    // Check if ingredient is a substitution for something else
    for (const [key, subs] of Object.entries(BUDGET_SUBSTITUTIONS)) {
        if (subs.some(sub => sub === normalized || sub === ingredient)) {
            related.add(key);
            if (INGREDIENT_GROUPS[key]) {
                INGREDIENT_GROUPS[key].forEach(ing => related.add(ing));
            }
        }
    }
    
    return Array.from(related);
}

/**
 * Export normalization function for use in other modules
 */
export { normalizeIngredient, INGREDIENT_GROUPS };

class BudgetMealPlanner {
    constructor() {
        this.currentTier = 'medium';
        this.currentTierData = BUDGET_TIERS.medium;
        this.storageKey = 'budget-tier';
        this.listeners = [];
    }

    /**
     * Load saved budget tier from IndexedDB
     */
    async loadTier() {
        await db.ready;
        
        const stored = await db.get('preferences', this.storageKey);
        
        if (stored && stored.value && BUDGET_TIERS[stored.value]) {
            this.currentTier = stored.value;
            this.currentTierData = BUDGET_TIERS[stored.value];
        }
        
        console.log('[BudgetPlanner] Loaded tier:', this.currentTier);
        return this.getCurrentTier();
    }

    /**
     * Save budget tier to IndexedDB
     */
    async setTier(tierId) {
        if (!BUDGET_TIERS[tierId]) {
            throw new Error(`Unknown budget tier: ${tierId}`);
        }
        
        this.currentTier = tierId;
        this.currentTierData = BUDGET_TIERS[tierId];
        
        await db.put('preferences', {
            key: this.storageKey,
            value: tierId,
            updatedAt: Date.now()
        });
        
        this.notifyListeners();
        console.log('[BudgetPlanner] Set tier:', tierId);
        return this.getCurrentTier();
    }

    /**
     * Get current budget tier details
     */
    getCurrentTier() {
        return BUDGET_TIERS[this.currentTier];
    }

    /**
     * Get all available tiers
     */
    getAllTiers() {
        return Object.values(BUDGET_TIERS);
    }

    /**
     * Estimate recipe cost per serving
     * @param {Object} recipe - Recipe object with ingredients
     * @returns {{perServing: number, total: number, confidence: string, breakdown: Array}} Cost estimate with confidence
     */
    estimateRecipeCost(recipe) {
        if (!recipe || !recipe.ingredients) {
            return { perServing: 0, total: 0, confidence: 0, breakdown: [] };
        }
        
        const servings = recipe.servings || 4;
        let totalCost = 0;
        const breakdown = [];
        let knownCount = 0;
        
        recipe.ingredients.forEach(ing => {
            const name = ing.name || ing;
            const quantity = ing.quantity || 1;
            
            // Simple cost estimation based on ingredient category
            let cost = this.estimateSimpleCost(name);
            let confidence = 'estimated';
            
            const itemCost = cost * quantity;
            totalCost += itemCost;
            
            breakdown.push({
                name,
                quantity,
                costPerUnit: cost,
                total: itemCost,
                confidence
            });
        });
        
        const perServing = totalCost / servings;
        const confidenceScore = recipe.ingredients.length > 0 
            ? (knownCount / recipe.ingredients.length) * 100 
            : 0;
        
        return {
            perServing: Math.round(perServing * 100) / 100,
            total: Math.round(totalCost * 100) / 100,
            confidence: Math.round(confidenceScore),
            breakdown,
            servings
        };
    }

    /**
     * Guess ingredient category from name
     */
    guessCategory(name) {
        const name_lower = name.toLowerCase();
        
        if (/chicken|beef|pork|lamb|fish|shrimp|tofu|eggs/.test(name_lower)) return 'meat';
        if (/milk|cheese|butter|cream|yogurt/.test(name_lower)) return 'dairy';
        if (/rice|pasta|bread|oats|flour|grain/.test(name_lower)) return 'grains';
        if (/apple|banana|orange|berry|fruit/.test(name_lower)) return 'fruits';
        if (/carrot|onion|garlic|pepper|tomato|vegetable/.test(name_lower)) return 'vegetables';
        if (/oil|vinegar|sauce|spice|herb/.test(name_lower)) return 'condiments';
        
        return 'other';
    }

    /**
     * Filter recipes by current budget tier
     * @param {Array} recipes - All available recipes
     * @returns {Array} Recipes within budget
     */
    filterByBudget(recipes) {
        const tier = this.getCurrentTier();
        
        return recipes.map(recipe => {
            const cost = this.estimateRecipeCost(recipe);
            return {
                ...recipe,
                estimatedCost: cost,
                withinBudget: cost.perServing <= tier.maxPerServing
            };
        }).filter(r => r.withinBudget);
    }

    /**
     * Get budget status for a recipe
     * @param {Object} recipe - Recipe to check
     * @returns {Object} Status with tier compatibility
     */
    getRecipeBudgetStatus(recipe) {
        const cost = this.estimateRecipeCost(recipe);
        
        const compatibleTiers = Object.values(BUDGET_TIERS)
            .filter(tier => cost.perServing <= tier.maxPerServing)
            .map(t => t.id);
        
        return {
            cost,
            compatibleTiers,
            currentTierCompatible: compatibleTiers.includes(this.currentTier),
            cheapestTier: compatibleTiers[0] || null,
            savings: this.calculatePotentialSavings(recipe, cost)
        };
    }

    /**
     * Calculate potential savings with substitutions
     */
    calculatePotentialSavings(recipe, cost) {
        const expensiveItems = cost.breakdown
            .filter(item => item.total > 3.00)  // Items over $3
            .sort((a, b) => b.total - a.total);
        
        const substitutions = expensiveItems.map(item => {
            const subs = this.getSubstitutions(item.name);
            if (subs.length === 0) return null;
            
            const cheaperSub = subs[0];
            const subCost = this.estimateSimpleCost(cheaperSub) || 2.00;
            const savings = item.costPerUnit - subCost;
            
            return {
                original: item.name,
                originalCost: item.costPerUnit,
                substitute: cheaperSub,
                substituteCost: subCost,
                savings: Math.max(0, savings),
                savingsPercent: Math.round((savings / item.costPerUnit) * 100)
            };
        }).filter(Boolean);
        
        const totalSavings = substitutions.reduce((sum, s) => sum + s.savings, 0);
        
        return {
            totalPotentialSavings: Math.round(totalSavings * 100) / 100,
            substitutions,
            newEstimatedCost: Math.max(0, cost.total - totalSavings)
        };
    }

    /**
     * Get budget-friendly substitutions for an ingredient
     * @param {string} ingredient - Ingredient name
     * @returns {Array} List of cheaper alternatives
     */
    getSubstitutions(ingredient) {
        const name_lower = ingredient.toLowerCase();
        
        // Direct match
        if (BUDGET_SUBSTITUTIONS[name_lower]) {
            return BUDGET_SUBSTITUTIONS[name_lower];
        }
        
        // Partial match
        for (const [key, subs] of Object.entries(BUDGET_SUBSTITUTIONS)) {
            if (name_lower.includes(key) || key.includes(name_lower)) {
                return subs;
            }
        }
        
        return [];
    }

    /**
     * Generate budget meal plan for the week
     * @param {Array} recipes - Available recipes
     * @param {number} mealsPerWeek - Number of meals to plan (default 14)
     * @returns {Object} Weekly meal plan with cost breakdown
     */
    generateWeeklyPlan(recipes, mealsPerWeek = 14) {
        const tier = this.getCurrentTier();
        const affordableRecipes = this.filterByBudget(recipes);
        
        if (affordableRecipes.length === 0) {
            return {
                error: 'No recipes found within budget. Try a higher budget tier.',
                tier,
                suggestions: this.getBudgetSuggestions(recipes)
            };
        }
        
        // Sort by cost (lowest first for budget efficiency)
        const sorted = affordableRecipes.sort((a, b) => 
            a.estimatedCost.perServing - b.estimatedCost.perServing
        );
        
        // Select variety of meals
        const selected = [];
        const usedRecipeIds = new Set();
        
        for (let i = 0; selected.length < mealsPerWeek && i < sorted.length; i++) {
            const recipe = sorted[i];
            
            // Avoid repeats until we have good variety
            if (usedRecipeIds.has(recipe.id) && selected.length < sorted.length / 2) {
                continue;
            }
            
            selected.push(recipe);
            usedRecipeIds.add(recipe.id);
        }
        
        // Calculate totals
        const totalCost = selected.reduce((sum, r) => sum + r.estimatedCost.total, 0);
        const avgPerServing = totalCost / selected.length;
        
        return {
            tier,
            meals: selected,
            mealCount: selected.length,
            totalEstimatedCost: Math.round(totalCost * 100) / 100,
            averagePerServing: Math.round(avgPerServing * 100) / 100,
            budgetRemaining: Math.round((tier.weeklyBudget - totalCost) * 100) / 100,
            withinBudget: totalCost <= tier.weeklyBudget,
            savings: {
                vsPremium: Math.round((200 - totalCost) * 100) / 100,  // Savings vs high tier
                vsModerate: Math.round((120 - totalCost) * 100) / 100  // Savings vs medium tier
            }
        };
    }

    /**
     * Get suggestions when no recipes fit budget
     */
    getBudgetSuggestions(recipes) {
        const suggestions = [];
        
        // Find recipes just over budget with easy substitutions
        const nearBudget = recipes.map(r => ({
            recipe: r,
            cost: this.estimateRecipeCost(r),
            savings: this.calculatePotentialSavings(r, this.estimateRecipeCost(r))
        })).filter(r => r.savings.totalPotentialSavings > 0)
          .sort((a, b) => b.savings.totalPotentialSavings - a.savings.totalPotentialSavings)
          .slice(0, 3);
        
        if (nearBudget.length > 0) {
            suggestions.push({
                type: 'substitutions',
                message: 'These recipes can fit your budget with ingredient swaps:',
                recipes: nearBudget
            });
        }
        
        // Suggest budget bases
        suggestions.push({
            type: 'budget-bases',
            message: 'Build meals around these affordable staples:',
            bases: BUDGET_BASES
        });
        
        return suggestions;
    }

    /**
     * Compare costs across all tiers for a recipe
     * @param {Object} recipe - Recipe to analyze
     * @returns {Object} Comparison across all tiers
     */
    compareTiers(recipe) {
        const cost = this.estimateRecipeCost(recipe);
        
        const comparisons = Object.values(BUDGET_TIERS).map(tier => ({
            tier: tier.id,
            name: tier.name,
            maxPerServing: tier.maxPerServing,
            fits: cost.perServing <= tier.maxPerServing,
            underBudgetBy: Math.round((tier.maxPerServing - cost.perServing) * 100) / 100,
            percentOfBudget: Math.round((cost.perServing / tier.maxPerServing) * 100)
        }));
        
        return {
            recipeCost: cost,
            comparisons,
            recommendedTier: comparisons.find(c => c.fits)?.tier || 'high'
        };
    }

    /**
     * Subscribe to tier changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.getCurrentTier()));
    }

    /**
     * Simple cost estimation based on ingredient type
     * @param {string} ingredientName - Name of ingredient
     * @returns {number} Estimated cost per unit
     */
    estimateSimpleCost(ingredientName) {
        const name = ingredientName.toLowerCase();
        
        // Basic ingredients (under $2)
        if (['rice', 'pasta', 'beans', 'potatoes', 'onions', 'carrots', 'cabbage', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'water'].some(i => name.includes(i))) {
            return 1.50;
        }
        
        // Moderate ingredients ($2-4)
        if (['chicken', 'beef', 'pork', 'fish', 'cheese', 'eggs', 'milk', 'butter', 'bread', 'tomatoes', 'lettuce', 'peppers'].some(i => name.includes(i))) {
            return 3.00;
        }
        
        // Expensive ingredients ($4+)
        if (['salmon', 'shrimp', 'lamb', 'steak', 'saffron', 'truffle', 'vanilla'].some(i => name.includes(i))) {
            return 6.00;
        }
        
        // Default estimate
        return 2.50;
    }
}

const budgetMealPlanner = new BudgetMealPlanner();
export default budgetMealPlanner;
export { BudgetMealPlanner, BUDGET_TIERS, BUDGET_SUBSTITUTIONS, BUDGET_BASES };
