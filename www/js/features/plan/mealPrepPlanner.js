// @ts-check
/**
 * Meal Prep Planner
 * Batch cooking, portion planning, and prep schedule management
 * Integrates with nutrition goals and budget planning
 */

import db from '../../data/db.js';

// Storage guidelines for common meal types (days)
const STORAGE_GUIDELINES = {
    'refrigerator': {
        'cooked-grains': 5,
        'cooked-proteins': 3,
        'cooked-vegetables': 4,
        'soups-stews': 4,
        'salads-dressed': 1,
        'salads-undressed': 3,
        'sauces': 5,
        'assembled-meals': 3,
        'default': 3
    },
    'freezer': {
        'cooked-grains': 90,
        'cooked-proteins': 90,
        'cooked-vegetables': 90,
        'soups-stews': 90,
        'assembled-meals': 60,
        'default': 60
    }
};

// Reheating methods by meal type
const REHEATING_GUIDES = {
    'microwave': {
        temp: 'Medium (50% power)',
        method: 'Cover loosely, stir halfway',
        timePerServing: '2-3 minutes',
        bestFor: ['grains', 'stews', 'sauces', 'mixed meals']
    },
    'stovetop': {
        temp: 'Low to medium heat',
        method: 'Add splash of water/stock, cover',
        timePerServing: '5-8 minutes',
        bestFor: ['sauces', 'stews', 'grains', 'pasta']
    },
    'oven': {
        temp: '325°F (165°C)',
        method: 'Cover with foil, add moisture if needed',
        timePerServing: '15-20 minutes',
        bestFor: ['casseroles', 'baked proteins', 'assembled meals']
    },
    'air-fryer': {
        temp: '350°F (175°C)',
        method: 'Shake basket halfway',
        timePerServing: '5-8 minutes',
        bestFor: ['crispy items', 'roasted vegetables', 'fried foods']
    }
};

// Meal prep strategies
const PREP_STRATEGIES = {
    'component': {
        name: 'Component Prep',
        description: 'Cook ingredients separately, mix & match throughout week',
        bestFor: 'Flexible eaters who want variety',
        steps: [
            'Batch cook 2-3 proteins',
            'Roast/prep 4-5 vegetables',
            'Cook 2-3 grain options',
            'Make 2-3 sauces/dressings',
            'Assemble different combinations daily'
        ],
        storage: 'Store components separately for max freshness'
    },
    'batch-meals': {
        name: 'Batch Meals',
        description: 'Make 4-6 complete identical meals',
        bestFor: 'Consistent eaters who prefer grab-and-go',
        steps: [
            'Choose 1-2 complete recipes',
            'Scale up 4-6 servings each',
            'Portion into individual containers',
            'Label with date and contents'
        ],
        storage: 'Individual portions ready to grab'
    },
    'hybrid': {
        name: 'Hybrid',
        description: 'Some complete meals, some components',
        bestFor: 'Mix of grab-and-go and flexibility',
        steps: [
            'Prep 2-3 complete batch meals',
            'Prep complementary components',
            'Have backup grab meals for busy days'
        ],
        storage: 'Meals ready, components for variety'
    }
};

class MealPrepPlanner {
    constructor() {
        this.currentStrategy = 'component';
        this.prepDay = 0; // Sunday (0-6)
        this.storageKey = 'meal-prep-settings';
        this.listeners = [];
    }

    /**
     * Load saved settings from IndexedDB
     */
    async loadSettings() {
        await db.ready;
        
        const stored = await db.get('preferences', this.storageKey);
        
        if (stored && stored.value) {
            this.currentStrategy = stored.value.strategy || 'component';
            this.prepDay = stored.value.prepDay ?? 0;
        }
        
        console.log('[MealPrepPlanner] Loaded settings:', {
            strategy: this.currentStrategy,
            prepDay: this.prepDay
        });
        
        return this.getSettings();
    }

    /**
     * Save settings to IndexedDB
     */
    async saveSettings() {
        await db.ready;
        
        await db.put('preferences', {
            key: this.storageKey,
            value: {
                strategy: this.currentStrategy,
                prepDay: this.prepDay
            },
            updatedAt: Date.now()
        });
        
        this.notifyListeners();
        console.log('[MealPrepPlanner] Saved settings');
    }

    /**
     * Get current settings
     */
    getSettings() {
        return {
            strategy: this.currentStrategy,
            prepDay: this.prepDay,
            strategyDetails: PREP_STRATEGIES[this.currentStrategy]
        };
    }

    /**
     * Set prep strategy
     */
    async setStrategy(strategyId) {
        if (!PREP_STRATEGIES[strategyId]) {
            throw new Error(`Unknown strategy: ${strategyId}`);
        }
        
        this.currentStrategy = strategyId;
        await this.saveSettings();
        return this.getSettings();
    }

    /**
     * Set prep day (0-6, Sunday to Saturday)
     */
    async setPrepDay(day) {
        if (day < 0 || day > 6) {
            throw new Error('Prep day must be 0-6 (Sunday to Saturday)');
        }
        
        this.prepDay = day;
        await this.saveSettings();
        return this.getSettings();
    }

    /**
     * Get available strategies
     */
    getStrategies() {
        return Object.entries(PREP_STRATEGIES).map(([id, details]) => ({
            id,
            ...details
        }));
    }

    /**
     * Generate prep plan for selected recipes
     * @param {Array} recipes - Selected recipes for meal prep
     * @param {number} servingsPerRecipe - Servings to prep per recipe
     * @returns {Object} Complete prep plan
     */
    generatePrepPlan(recipes, servingsPerRecipe = 4) {
        const strategy = PREP_STRATEGIES[this.currentStrategy];
        const prepDate = this.getNextPrepDate();
        
        // Scale recipes
        const scaledRecipes = recipes.map(recipe => ({
            ...recipe,
            scaledServings: servingsPerRecipe,
            scalingFactor: servingsPerRecipe / (recipe.servings || 1),
            prepDate: prepDate.toISOString().split('T')[0],
            useByDate: this.calculateUseByDate(recipe, prepDate)
        }));

        // Generate prep schedule
        const schedule = this.generateSchedule(scaledRecipes, strategy);

        // Calculate storage needs
        const storage = this.calculateStorage(scaledRecipes);

        // Generate shopping list with scaled quantities
        const shoppingList = this.generateScaledShoppingList(scaledRecipes);

        return {
            strategy: this.currentStrategy,
            strategyDetails: strategy,
            prepDate: prepDate.toISOString().split('T')[0],
            recipes: scaledRecipes,
            schedule,
            storage,
            shoppingList,
            totalPrepTime: this.estimateTotalPrepTime(scaledRecipes),
            equipmentNeeded: this.identifyEquipment(scaledRecipes),
            tips: this.generateTips(scaledRecipes, strategy)
        };
    }

    /**
     * Get next prep date based on prep day setting
     */
    getNextPrepDate() {
        const today = new Date();
        const currentDay = today.getDay();
        const daysUntilPrep = (this.prepDay - currentDay + 7) % 7;
        
        const nextPrep = new Date(today);
        nextPrep.setDate(today.getDate() + daysUntilPrep);
        
        return nextPrep;
    }

    /**
     * Calculate use-by date based on meal type
     */
    calculateUseByDate(recipe, prepDate) {
        const mealType = this.classifyMeal(recipe);
        const storageDays = STORAGE_GUIDELINES.refrigerator[mealType] || 3;
        
        const useBy = new Date(prepDate);
        useBy.setDate(prepDate.getDate() + storageDays);
        
        return useBy.toISOString().split('T')[0];
    }

    /**
     * Classify meal for storage guidelines
     */
    classifyMeal(recipe) {
        const name = (recipe.name || '').toLowerCase();
        const ingredients = (recipe.ingredients || []).map(i => 
            (i.name || i).toLowerCase()
        ).join(' ');
        
        if (/soup|stew|chili|curry/.test(name)) return 'soups-stews';
        if (/salad/.test(name) && /dress/.test(name)) return 'salads-dressed';
        if (/salad/.test(name)) return 'salads-undressed';
        if (/pasta|rice|noodle/.test(name)) return 'cooked-grains';
        if (/grain|rice|quinoa|pasta|noodle/.test(ingredients)) return 'cooked-grains';
        if (/chicken|beef|pork|fish|tofu|egg/.test(ingredients)) return 'cooked-proteins';
        if (/sauce|dressing|marinade/.test(name)) return 'sauces';
        
        return 'assembled-meals';
    }

    /**
     * Generate prep schedule with parallel tasks
     */
    generateSchedule(recipes, _strategy) {
        const schedule = [];
        let currentTime = 0; // Minutes from start

        // Group by task type for efficiency
        const taskGroups = {
            'preheat': [],
            'prep-vegetables': [],
            'prep-proteins': [],
            'cook-grains': [],
            'cook-proteins': [],
            'cook-vegetables': [],
            'make-sauces': [],
            'assemble': [],
            'cool': [],
            'portion': []
        };

        // Create tasks from recipes
        recipes.forEach((recipe, _index) => {
            // Preheating
            if (recipe.cookTime > 15) {
                taskGroups['preheat'].push({
                    recipe: recipe.name,
                    task: 'Preheat oven/stove',
                    duration: 10
                });
            }

            // Ingredient prep (scaled)
            const prepTime = (recipe.prepTime || 10) * recipe.scalingFactor * 0.7; // Batch efficiency
            taskGroups['prep-vegetables'].push({
                recipe: recipe.name,
                task: 'Prep ingredients',
                duration: Math.round(prepTime)
            });

            // Cooking
            const cookTime = (recipe.cookTime || 20) * recipe.scalingFactor * 0.8;
            taskGroups['cook-proteins'].push({
                recipe: recipe.name,
                task: 'Cook',
                duration: Math.round(cookTime),
                parallel: true
            });

            // Assembly
            taskGroups['assemble'].push({
                recipe: recipe.name,
                task: 'Assemble/portions',
                duration: 5
            });
        });

        // Build timeline
        Object.entries(taskGroups).forEach(([group, tasks]) => {
            if (tasks.length === 0) return;
            
            const groupTime = Math.max(...tasks.map(t => t.duration));
            
            schedule.push({
                time: this.formatTime(currentTime),
                duration: groupTime,
                tasks,
                group
            });
            
            currentTime += groupTime;
        });

        // Add cooling/portioining at end
        schedule.push({
            time: this.formatTime(currentTime),
            duration: 20,
            tasks: [{ task: 'Cool and portion meals', duration: 20 }],
            group: 'cool-portion'
        });

        return schedule;
    }

    /**
     * Format minutes as HH:MM
     */
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * Calculate storage needs
     */
    calculateStorage(recipes) {
        const totalContainers = recipes.reduce((sum, r) => sum + r.scaledServings, 0);
        
        return {
            refrigerator: {
                containers: totalContainers,
                space: `${totalContainers * 0.5}L estimated`,
                days: 3 // Conservative
            },
            freezer: {
                containers: Math.ceil(totalContainers * 0.3), // 30% freeze
                space: `${Math.ceil(totalContainers * 0.3) * 0.5}L estimated`
            },
            equipment: {
                mealPrepContainers: totalContainers,
                largeBowls: Math.ceil(recipes.length / 2),
                storageBags: Math.ceil(totalContainers / 3)
            }
        };
    }

    /**
     * Generate scaled shopping list
     */
    generateScaledShoppingList(recipes) {
        const ingredients = new Map();
        
        recipes.forEach(recipe => {
            (recipe.ingredients || []).forEach(ing => {
                const name = ing.name || ing;
                const baseQty = ing.quantity || 1;
                const scaledQty = baseQty * recipe.scalingFactor;
                const unit = ing.unit || 'piece';
                
                const key = `${name}:${unit}`;
                
                if (ingredients.has(key)) {
                    ingredients.get(key).quantity += scaledQty;
                    ingredients.get(key).forRecipes.push(recipe.name);
                } else {
                    ingredients.set(key, {
                        name,
                        quantity: Math.ceil(scaledQty),
                        unit,
                        forRecipes: [recipe.name]
                    });
                }
            });
        });

        return Array.from(ingredients.values());
    }

    /**
     * Estimate total prep time
     */
    estimateTotalPrepTime(recipes) {
        let total = 0;
        
        recipes.forEach(recipe => {
            const prepTime = (recipe.prepTime || 10) * recipe.scalingFactor * 0.7;
            const cookTime = (recipe.cookTime || 20) * recipe.scalingFactor * 0.8;
            total += prepTime + cookTime;
        });
        
        // Parallel cooking efficiency (can do 2-3 things at once)
        const parallelEfficiency = Math.min(0.6, 0.4 + (recipes.length * 0.1));
        
        return Math.round(total * parallelEfficiency) + 20; // +20 for cooling/portioining
    }

    /**
     * Identify equipment needed
     */
    identifyEquipment(recipes) {
        const equipment = new Set();
        
        recipes.forEach(recipe => {
            if (recipe.cookTime > 15) equipment.add('Large pots/pans');
            if (recipe.prepTime > 10) equipment.add('Cutting boards');
            equipment.add('Meal prep containers');
            equipment.add('Storage bags/labels');
        });
        
        return Array.from(equipment);
    }

    /**
     * Generate prep tips based on strategy and recipes
     */
    generateTips(recipes, strategy) {
        const tips = [];
        
        // Strategy tips
        tips.push(...strategy.steps.slice(0, 3));
        
        // Storage tips
        tips.push('Let food cool completely before sealing containers');
        tips.push('Leave space in containers for expansion if freezing');
        
        // Safety tips
        tips.push('Use containers within 2 hours of cooking');
        tips.push('Reheat to internal temp of 165°F (74°C)');
        
        // Efficiency tips
        if (recipes.length > 2) {
            tips.push('Prep ingredients first, then start cooking longest items');
            tips.push('Clean as you go to save time at end');
        }
        
        return tips;
    }

    /**
     * Get reheating instructions for a meal
     */
    getReheatingInstructions(recipe) {
        const mealType = this.classifyMeal(recipe);
        
        // Determine best method
        let recommendedMethod = 'microwave';
        const nameLower = (recipe.name || '').toLowerCase();
        if (/crispy|fried|roasted/.test(nameLower)) {
            recommendedMethod = 'oven';
        } else if (/pasta|rice|grains/.test(mealType)) {
            recommendedMethod = 'stovetop';
        }
        
        const method = REHEATING_GUIDES[recommendedMethod];
        
        return {
            recommendedMethod,
            ...method,
            alternatives: Object.keys(REHEATING_GUIDES).filter(m => m !== recommendedMethod),
            safetyNote: 'Heat until internal temperature reaches 165°F (74°C)'
        };
    }

    /**
     * Get storage guidelines for a meal type
     */
    getStorageGuidelines(recipe) {
        const mealType = this.classifyMeal(recipe);
        
        return {
            refrigerator: {
                days: STORAGE_GUIDELINES.refrigerator[mealType] || 3,
                notes: 'Store in airtight containers'
            },
            freezer: {
                days: STORAGE_GUIDELINES.freezer[mealType] || 60,
                notes: 'Freeze within 2 days for best quality'
            },
            thawing: 'Thaw overnight in refrigerator or use defrost setting',
            mealType
        };
    }

    /**
     * Subscribe to settings changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.getSettings()));
    }
}

const mealPrepPlanner = new MealPrepPlanner();
export default mealPrepPlanner;
export { MealPrepPlanner, PREP_STRATEGIES, STORAGE_GUIDELINES, REHEATING_GUIDES };
