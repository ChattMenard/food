/**
 * Budget Meal Planner
 * Multi-tier budget meal planning with cost-aware recipe selection
 * Integrates with CostTracker and NutritionDashboard
 */

import { CostTracker, type ShoppingListItem } from '../../logic/costTracker.js';
import db from '../../data/db.js';
import type { Recipe, MealPlan, UserPreferences } from '../../types/index.js';

interface BudgetTier {
    id: string;
    name: string;
    description: string;
    maxPerServing: number;
    weeklyBudget: number;
    icon: string;
}

// Budget tiers with per-meal cost targets (USD)
const BUDGET_TIERS: Record<string, BudgetTier> = {
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

// Budget-friendly ingredient substitutions
const BUDGET_SUBSTITUTIONS: Record<string, string[]> = {
    // Proteins (expensive → cheaper)
    'beef': ['chicken', 'pork', 'beans', 'lentils', 'eggs'],
    'steak': ['chicken thigh', 'pork chop', 'tofu', 'mushrooms'],
    'salmon': ['canned tuna', 'mackerel', 'sardines', 'chicken'],
    'shrimp': ['chicken', 'tofu', 'white fish', 'eggs'],
    'lamb': ['pork', 'chicken', 'turkey', 'mushrooms'],
    
    // Dairy
    'heavy cream': ['milk', 'evaporated milk', 'coconut milk', 'greek yogurt'],
    'butter': ['oil', 'margarine', 'shortening'],
    'cheese': ['nutritional yeast', 'eggs', 'beans'],
    'parmesan': ['nutritional yeast', 'romano', 'asiago'],
    
    // Produce
    'fresh herbs': ['dried herbs', 'frozen herbs', 'herb paste'],
    'out-of-season': ['frozen', 'canned', 'seasonal alternative'],
    'pine nuts': ['sunflower seeds', 'peanuts', 'pumpkin seeds'],
    'avocado': ['hummus', 'peanut butter', 'mashed beans'],
    
    // Pantry
    'walnuts': ['sunflower seeds', 'peanuts', 'pumpkin seeds'],
    'saffron': ['turmeric', 'paprika'],
    'vanilla bean': ['vanilla extract', 'maple syrup'],
    'maple syrup': ['honey', 'brown sugar + water', 'molasses'],
    'olive oil': ['vegetable oil', 'canola oil', 'butter'],
    'balsamic vinegar': ['red wine vinegar + sugar', 'apple cider vinegar'],
    'worcestershire': ['soy sauce + vinegar', 'tamari'],
    'fish sauce': ['soy sauce', 'miso', 'salt'],
    
    // Grains/Carbs
    'quinoa': ['rice', 'bulgur', 'barley', 'oats'],
    'couscous': ['rice', 'orzo', 'quinoa'],
    'arborio rice': ['sushi rice', 'short grain rice'],
    'wild rice': ['brown rice', 'mixed rice'],
    
    // Specialty items
    'truffle oil': ['mushroom oil', 'olive oil + mushrooms'],
    'gochujang': ['sriracha + miso', 'chili paste'],
    'miso': ['soy sauce', 'salt + umami seasoning'],
    'tahini': ['peanut butter', 'sunflower seed butter'],
    
    // Canned/Convenience
    'coconut milk': ['milk + coconut extract', 'evaporated milk'],
    'curry paste': ['curry powder + yogurt', 'spice blend'],
    'harissa': ['hot sauce + spices', 'sambal oelek'],
    'sambal oelek': ['sriracha', 'chili flakes + vinegar']
};

// Cheap base ingredients by category
const BUDGET_BASES = {
    proteins: ['eggs', 'beans', 'lentils', 'chicken thighs', 'pork shoulder', 'tofu'],
    grains: ['rice', 'pasta', 'oats', 'potatoes', 'bread', 'tortillas'],
    vegetables: ['carrots', 'onions', 'cabbage', 'potatoes', 'seasonal greens'],
    flavor: ['garlic', 'ginger', 'spices', 'soy sauce', 'vinegar', 'lemon']
};

export interface BudgetMealPlan {
    id: string;
    name: string;
    meals: Array<{
        date: string;
        breakfast: Recipe | null;
        lunch: Recipe | null;
        dinner: Recipe | null;
        snacks: Recipe[];
        dailyCost: number;
    }>;
    totalCost: number;
    weeklyBudget: number;
    savings: number;
    tier: BudgetTier;
    substitutions: Array<{
        original: string;
        substituted: string;
        savings: number;
    }>;
}

export interface BudgetAnalysis {
    recipeCost: number;
    isWithinBudget: boolean;
    suggestions: string[];
    possibleSubstitutions: Array<{
        ingredient: string;
        substitution: string;
        savings: number;
    }>;
}

export class BudgetMealPlanner {
    private costTracker: CostTracker;
    private currentTier: keyof typeof BUDGET_TIERS;
    private storageKey: string;
    private listeners: Array<(plan: BudgetMealPlan) => void> = [];

    constructor() {
        this.costTracker = new CostTracker();
        this.currentTier = 'medium';
        this.storageKey = 'budget-tier';
        this.loadSavedTier();
        this.initializeCostData();
    }

    /**
     * Get current budget tier
     */
    getCurrentTier(): BudgetTier {
        return BUDGET_TIERS[this.currentTier] as BudgetTier;
    }

    /**
     * Set budget tier
     */
    setBudgetTier(tier: keyof typeof BUDGET_TIERS): void {
        const selectedTier = BUDGET_TIERS[tier];
        if (!selectedTier) {
            throw new Error(`Invalid budget tier: ${tier}`);
        }
        
        this.currentTier = tier;
        localStorage.setItem(this.storageKey, tier);
        this.costTracker.setBudget(selectedTier.weeklyBudget);
        this.notifyListeners();
    }

    /**
     * Subscribe to budget plan changes
     */
    subscribe(callback: (plan: BudgetMealPlan) => void): () => void {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of changes
     */
    private notifyListeners(): void {
        // This would be called when the plan changes
        // Implementation depends on specific use case
    }

    /**
     * Load saved budget tier from localStorage
     */
    private loadSavedTier(): void {
        const saved = localStorage.getItem(this.storageKey);
        if (saved && BUDGET_TIERS[saved as keyof typeof BUDGET_TIERS]) {
            this.currentTier = saved as keyof typeof BUDGET_TIERS;
        }
        const tier = BUDGET_TIERS[this.currentTier];
        if (tier) {
            this.costTracker.setBudget(tier.weeklyBudget);
        }
    }

    /**
     * Initialize basic cost data
     */
    private initializeCostData(): void {
        // Add basic cost estimates for common ingredients
        const basicCosts: Record<string, { cost: number; unit: string }> = {
            // Proteins
            'eggs': { cost: 0.25, unit: 'piece' },
            'chicken': { cost: 2.50, unit: 'lb' },
            'beans': { cost: 0.50, unit: 'can' },
            'lentils': { cost: 0.30, unit: 'cup' },
            'tofu': { cost: 2.00, unit: 'lb' },
            
            // Grains
            'rice': { cost: 0.20, unit: 'cup' },
            'pasta': { cost: 0.30, unit: 'cup' },
            'oats': { cost: 0.15, unit: 'cup' },
            'potatoes': { cost: 0.10, unit: 'piece' },
            
            // Vegetables
            'onions': { cost: 0.15, unit: 'piece' },
            'carrots': { cost: 0.10, unit: 'piece' },
            'cabbage': { cost: 0.50, unit: 'head' },
            
            // Basics
            'oil': { cost: 0.05, unit: 'tbsp' },
            'salt': { cost: 0.01, unit: 'tsp' },
            'pepper': { cost: 0.02, unit: 'tsp' },
        };

        Object.entries(basicCosts).forEach(([ingredient, data]) => {
            this.costTracker.addCost(ingredient, data.cost, data.unit);
        });
    }

    /**
     * Analyze recipe cost for current budget tier
     */
    analyzeRecipeCost(recipe: Recipe, servings: number = 4): BudgetAnalysis {
        const tier = this.getCurrentTier();
        const maxCostPerServing = tier.maxPerServing;
        
        // Estimate recipe cost based on ingredients
        let estimatedCost = 0;
        const suggestions: string[] = [];
        const possibleSubstitutions: Array<{
            ingredient: string;
            substitution: string;
            savings: number;
        }> = [];

        recipe.ingredients.forEach((ing) => {
            const ingredientName = typeof ing === 'string' ? ing : ing.name || '';
            const cost = this.costTracker.getCost(ingredientName);
            
            if (cost) {
                const quantity = typeof ing === 'object' && 'quantity' in ing ? (ing as any).quantity || 1 : 1;
                estimatedCost += cost * quantity;
            } else {
                // Check for budget substitutions
                const substitutions = this.findSubstitutions(ingredientName);
                if (substitutions.length > 0) {
                    const bestSub = substitutions[0];
                    if (bestSub) {
                        const subCost = this.costTracker.getCost(bestSub);
                        
                        if (subCost) {
                            possibleSubstitutions.push({
                                ingredient: ingredientName,
                                substitution: bestSub,
                                savings: cost ? cost - subCost : subCost,
                            });
                            suggestions.push(`Consider ${bestSub} instead of ${ingredientName}`);
                        }
                    }
                }
            }
        });

        const costPerServing = estimatedCost / servings;
        const isWithinBudget = costPerServing <= maxCostPerServing;

        if (!isWithinBudget) {
            suggestions.push(`Recipe costs $${costPerServing.toFixed(2)} per serving, over budget of $${maxCostPerServing.toFixed(2)}`);
        }

        return {
            recipeCost: costPerServing,
            isWithinBudget,
            suggestions,
            possibleSubstitutions,
        };
    }

    /**
     * Find budget substitutions for an ingredient
     */
    findSubstitutions(ingredient: string): string[] {
        const lowerIngredient = ingredient.toLowerCase();
        
        // Direct match
        if (BUDGET_SUBSTITUTIONS[lowerIngredient]) {
            return BUDGET_SUBSTITUTIONS[lowerIngredient];
        }

        // Partial match
        for (const [key, subs] of Object.entries(BUDGET_SUBSTITUTIONS)) {
            if (lowerIngredient.includes(key) || key.includes(lowerIngredient)) {
                return subs;
            }
        }

        return [];
    }

    /**
     * Generate budget-optimized meal plan
     */
    async generateMealPlan(
        recipes: Recipe[], 
        preferences: UserPreferences,
        days: number = 7
    ): Promise<BudgetMealPlan> {
        const tier = BUDGET_TIERS[this.currentTier];
        if (!tier) {
            throw new Error('Current budget tier not found');
        }
        const maxDailyBudget = tier.weeklyBudget / 7;
        
        // Filter recipes based on preferences and budget
        const suitableRecipes = recipes.filter(recipe => {
            const analysis = this.analyzeRecipeCost(recipe);
            return analysis.isWithinBudget && this.matchesPreferences(recipe, preferences);
        });

        if (suitableRecipes.length === 0) {
            throw new Error('No suitable recipes found for current budget and preferences');
        }

        const meals: BudgetMealPlan['meals'] = [];
        let totalCost = 0;
        const substitutions: BudgetMealPlan['substitutions'] = [];

        // Generate meal plan for each day
        for (let day = 0; day < days; day++) {
            const date = new Date();
            date.setDate(date.getDate() + day);
            const dateStr = date.toISOString().split('T')[0] || '';

            // Select recipes for the day
            const dailyMeals = this.selectDailyMeals(suitableRecipes, preferences, maxDailyBudget);
            const dailyCost = dailyMeals.breakfast ? 
                this.analyzeRecipeCost(dailyMeals.breakfast).recipeCost * 2 : 0;
            const lunchCost = dailyMeals.lunch ? 
                this.analyzeRecipeCost(dailyMeals.lunch).recipeCost * 2 : 0;
            const dinnerCost = dailyMeals.dinner ? 
                this.analyzeRecipeCost(dailyMeals.dinner).recipeCost * preferences.people : 0;
            const snacksCost = dailyMeals.snacks.reduce((sum, snack) => 
                sum + this.analyzeRecipeCost(snack).recipeCost, 0);

            const totalDailyCost = dailyCost + lunchCost + dinnerCost + snacksCost;
            totalCost += totalDailyCost;

            meals.push({
                date: dateStr,
                breakfast: dailyMeals.breakfast,
                lunch: dailyMeals.lunch,
                dinner: dailyMeals.dinner,
                snacks: dailyMeals.snacks,
                dailyCost: totalDailyCost,
            });
        }

        const savings = Math.max(0, tier.weeklyBudget - totalCost);

        return {
            id: `budget-plan-${Date.now()}`,
            name: `${tier.name} ${days}-Day Meal Plan`,
            meals,
            totalCost,
            weeklyBudget: tier.weeklyBudget,
            savings,
            tier: tier,
            substitutions,
        };
    }

    /**
     * Select meals for a single day within budget
     */
    private selectDailyMeals(
        recipes: Recipe[], 
        preferences: UserPreferences, 
        maxBudget: number
    ): {
        breakfast: Recipe | null;
        lunch: Recipe | null;
        dinner: Recipe | null;
        snacks: Recipe[];
    } {
        // Simple implementation - can be made more sophisticated
        const breakfastRecipes = recipes.filter(r => 
            r.name.toLowerCase().includes('breakfast') || 
            r.name.toLowerCase().includes('egg') ||
            r.name.toLowerCase().includes('oat')
        );

        const dinnerRecipes = recipes.filter(r => 
            !r.name.toLowerCase().includes('breakfast')
        );

        const selectRandom = (recipeList: Recipe[]): Recipe | null => {
            return recipeList.length > 0 ? 
                recipeList[Math.floor(Math.random() * recipeList.length)] || null : 
                null;
        };

        const breakfast = selectRandom(breakfastRecipes);
        const lunch = selectRandom(dinnerRecipes);
        const dinner = selectRandom(dinnerRecipes);
        const snacks: Recipe[] = [];

        return { breakfast, lunch, dinner, snacks };
    }

    /**
     * Check if recipe matches user preferences
     */
    private matchesPreferences(recipe: Recipe, preferences: UserPreferences): boolean {
        // Check diet restrictions
        if (preferences.diet !== 'none') {
            // This would need to be implemented based on recipe dietary flags
            // For now, assume all recipes are compatible
        }

        // Check time constraints
        if (recipe.minutes > preferences.maxTime) {
            return false;
        }

        // Check difficulty
        if (preferences.difficulty !== 'any' && recipe.difficulty !== preferences.difficulty) {
            return false;
        }

        return true;
    }

    /**
     * Get budget-friendly recipe suggestions
     */
    getBudgetFriendlyRecipes(recipes: Recipe[], count: number = 10): Recipe[] {
        const analyzed = recipes.map(recipe => ({
            recipe,
            analysis: this.analyzeRecipeCost(recipe),
        }));

        const budgetFriendly = analyzed
            .filter(item => item.analysis.isWithinBudget)
            .sort((a, b) => a.analysis.recipeCost - b.analysis.recipeCost)
            .slice(0, count)
            .map(item => item.recipe);

        return budgetFriendly;
    }

    /**
     * Get shopping list with cost optimization
     */
    async getOptimizedShoppingList(mealPlan: BudgetMealPlan): Promise<{
        items: ShoppingListItem[];
        totalCost: number;
        savings: number;
        optimizations: Array<{
            original: string;
            substituted: string;
            savings: number;
        }>;
    }> {
        // Collect all ingredients from meal plan
        const ingredientMap = new Map<string, number>();

        mealPlan.meals.forEach(day => {
            [day.breakfast, day.lunch, day.dinner, ...day.snacks].forEach(recipe => {
                if (recipe) {
                    recipe.ingredients.forEach(ing => {
                        const name = typeof ing === 'string' ? ing : ing.name;
                        const quantity = typeof ing === 'object' && 'quantity' in ing ? (ing as any).quantity || 1 : 1;
                        ingredientMap.set(name, (ingredientMap.get(name) || 0) + quantity);
                    });
                }
            });
        });

        const shoppingList: ShoppingListItem[] = Array.from(ingredientMap.entries()).map(([name, quantity]) => ({
            name,
            quantity,
        }));

        // Optimize for budget
        const tier = BUDGET_TIERS[this.currentTier];
        if (!tier) {
            throw new Error('Current budget tier not found');
        }
        const optimization = this.costTracker.optimizeForBudget(shoppingList, tier.weeklyBudget);

        return {
            items: optimization.optimizedList,
            totalCost: optimization.optimizedCost,
            savings: optimization.savings,
            optimizations: optimization.substitutions,
        };
    }

    /**
     * Get budget statistics and insights
     */
    getBudgetInsights(): {
        tier: BudgetTier;
        weeklyBudget: number;
        averageMealCost: number;
        budgetUtilization: number;
        recommendations: string[];
    } {
        const tier = BUDGET_TIERS[this.currentTier];
        if (!tier) {
            throw new Error('Current budget tier not found');
        }
        const stats = this.costTracker.getStatistics();
        
        const averageMealCost = stats.averageCost || tier.maxPerServing * 0.7; // Estimate
        const budgetUtilization = this.costTracker.getBudgetStatus().percentage;
        
        const recommendations: string[] = [];
        
        if (budgetUtilization > 90) {
            recommendations.push('Consider switching to a higher budget tier or finding cheaper alternatives');
        } else if (budgetUtilization < 50) {
            recommendations.push('You have room in your budget for more expensive ingredients');
        }

        if (stats.totalIngredients < 20) {
            recommendations.push('Add more ingredient costs to get better budget estimates');
        }

        return {
            tier: tier,
            weeklyBudget: tier.weeklyBudget,
            averageMealCost,
            budgetUtilization,
            recommendations,
        };
    }
}
