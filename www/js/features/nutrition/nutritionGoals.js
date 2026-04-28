// @ts-check
/**
 * Nutrition Goals Manager
 * Persistent nutrition goal setting and tracking
 * Integrates with nutrition dashboard and app state
 */

import db from '../../data/db.js';

// Default nutrition goals (USDA/HHS guidelines for average adult)
const DEFAULT_GOALS = {
    calories: 2000,
    protein: 50,      // grams
    carbs: 250,       // grams
    fat: 70,          // grams
    fiber: 25,        // grams
    sugar: 50,        // grams (max)
    sodium: 2300      // mg (max)
};

// Goal presets for different dietary approaches
const GOAL_PRESETS = {
    balanced: DEFAULT_GOALS,
    
    lowCarb: {
        calories: 2000,
        protein: 100,
        carbs: 100,
        fat: 130,
        fiber: 25,
        sugar: 30,
        sodium: 2300
    },
    
    highProtein: {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 60,
        fiber: 25,
        sugar: 50,
        sodium: 2300
    },
    
    weightLoss: {
        calories: 1500,
        protein: 75,
        carbs: 150,
        fat: 50,
        fiber: 30,
        sugar: 25,
        sodium: 2000
    },
    
    keto: {
        calories: 2000,
        protein: 80,
        carbs: 25,
        fat: 165,
        fiber: 25,
        sugar: 10,
        sodium: 3000  // Higher for keto
    }
};

class NutritionGoalsManager {
    constructor() {
        this.currentGoals = { ...DEFAULT_GOALS };
        this.listeners = [];
        this.storageKey = 'nutrition-goals';
        this.loaded = false;
    }

    /**
     * Load goals from IndexedDB
     */
    async loadGoals() {
        await db.ready;
        
        const stored = await db.get('preferences', this.storageKey);
        
        if (stored && stored.value) {
            this.currentGoals = {
                ...DEFAULT_GOALS,
                ...stored.value
            };
        } else {
            this.currentGoals = { ...DEFAULT_GOALS };
        }
        
        this.loaded = true;
        this.notifyListeners();
        
        console.log('[NutritionGoals] Loaded:', this.currentGoals);
        return this.currentGoals;
    }

    /**
     * Save goals to IndexedDB
     */
    async saveGoals() {
        await db.ready;
        
        await db.put('preferences', {
            key: this.storageKey,
            value: this.currentGoals,
            updatedAt: Date.now()
        });
        
        console.log('[NutritionGoals] Saved:', this.currentGoals);
        this.notifyListeners();
    }

    /**
     * Get current goals
     */
    getGoals() {
        return { ...this.currentGoals };
    }

    /**
     * Update specific goals
     * @param {Object} updates - Goal updates
     */
    async updateGoals(updates) {
        this.currentGoals = {
            ...this.currentGoals,
            ...updates
        };
        
        await this.saveGoals();
        return this.getGoals();
    }

    /**
     * Set goals from a preset
     * @param {string} presetName - Preset name ('balanced', 'lowCarb', etc.)
     */
    async setPreset(presetName) {
        const preset = GOAL_PRESETS[presetName];
        
        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }
        
        this.currentGoals = { ...preset };
        await this.saveGoals();
        
        console.log('[NutritionGoals] Applied preset:', presetName);
        return this.getGoals();
    }

    /**
     * Reset to defaults
     */
    async resetToDefaults() {
        this.currentGoals = { ...DEFAULT_GOALS };
        await this.saveGoals();
        return this.getGoals();
    }

    /**
     * Calculate progress against goals
     * @param {Object} actual - Actual nutrition values
     * @returns {Object} Progress with percentages and status
     */
    calculateProgress(actual) {
        const goals = this.currentGoals;
        
        const calculate = (key, isMax = false) => {
            const actualVal = actual[key] || 0;
            const goalVal = goals[key] || 0;
            
            if (goalVal === 0) return { percent: 0, status: 'neutral' };
            
            const percent = (actualVal / goalVal) * 100;
            
            // For maximum limits (sugar, sodium), closer to 100% is worse
            if (isMax) {
                return {
                    percent: Math.min(100, percent),
                    status: percent > 100 ? 'over' : percent > 80 ? 'warning' : 'good'
                };
            }
            
            // For targets (calories, protein, etc.), 100% is good
            return {
                percent: Math.min(100, percent),
                status: percent >= 90 ? 'good' : percent >= 70 ? 'warning' : 'under'
            };
        };
        
        return {
            calories: calculate('calories'),
            protein: calculate('protein'),
            carbs: calculate('carbs'),
            fat: calculate('fat'),
            fiber: calculate('fiber'),
            sugar: calculate('sugar', true),  // Maximum limit
            sodium: calculate('sodium', true)  // Maximum limit
        };
    }

    /**
     * Get available presets
     */
    getPresets() {
        return Object.keys(GOAL_PRESETS).map(key => ({
            id: key,
            name: this.formatPresetName(key),
            goals: GOAL_PRESETS[key]
        }));
    }

    /**
     * Format preset name for display
     */
    formatPresetName(key) {
        const names = {
            balanced: 'Balanced Diet',
            lowCarb: 'Low Carb',
            highProtein: 'High Protein',
            weightLoss: 'Weight Loss',
            keto: 'Ketogenic'
        };
        return names[key] || key;
    }

    /**
     * Subscribe to goal changes
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.push(callback);
        
        // Return unsubscribe
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Calculate weekly progress against goals
     * @param {Array} dailyData - Array of daily nutrition data
     * @returns {Object} Weekly progress summary
     */
    calculateWeeklyProgress(dailyData) {
        if (!Array.isArray(dailyData) || dailyData.length === 0) {
            return this.calculateProgress({});
        }

        // Sum up weekly totals
        const weeklyTotals = dailyData.reduce((acc, day) => {
            Object.keys(this.currentGoals).forEach(key => {
                acc[key] = (acc[key] || 0) + (day[key] || 0);
            });
            return acc;
        }, {});

        // Calculate daily averages
        const dailyAverages = {};
        const days = dailyData.length;
        Object.keys(weeklyTotals).forEach(key => {
            dailyAverages[key] = weeklyTotals[key] / days;
        });

        return this.calculateProgress(dailyAverages);
    }

    /**
     * Get nutrition recommendations based on current progress
     * @param {Object} actual - Current nutrition values
     * @returns {Array} Array of recommendations
     */
    getRecommendations(actual) {
        const progress = this.calculateProgress(actual);
        const recommendations = [];

        // Check each nutrient and provide recommendations
        if (progress.calories.status === 'under') {
            recommendations.push({
                type: 'increase_calories',
                message: 'Consider increasing calorie intake with nutrient-dense foods',
                priority: 'medium'
            });
        } else if (progress.calories.status === 'over') {
            recommendations.push({
                type: 'decrease_calories',
                message: 'Consider reducing calorie intake to meet your goals',
                priority: 'high'
            });
        }

        if (progress.protein.status === 'under') {
            recommendations.push({
                type: 'increase_protein',
                message: 'Add more protein sources like lean meats, fish, or legumes',
                priority: 'medium'
            });
        }

        if (progress.fiber.status === 'under') {
            recommendations.push({
                type: 'increase_fiber',
                message: 'Include more fruits, vegetables, and whole grains',
                priority: 'medium'
            });
        }

        if (progress.sugar.status === 'over') {
            recommendations.push({
                type: 'reduce_sugar',
                message: 'Reduce added sugars by choosing whole foods over processed options',
                priority: 'high'
            });
        }

        if (progress.sodium.status === 'over') {
            recommendations.push({
                type: 'reduce_sodium',
                message: 'Reduce sodium by avoiding processed foods and using less salt',
                priority: 'high'
            });
        }

        // General recommendations based on overall progress
        const goodNutrients = Object.entries(progress)
            .filter(([_, data]) => data.status === 'good')
            .length;

        if (goodNutrients >= 4) {
            recommendations.push({
                type: 'maintain',
                message: 'Great job! Keep maintaining your current nutrition habits',
                priority: 'low'
            });
        }

        return recommendations;
    }

    /**
     * Notify all listeners
     */
    notifyListeners() {
        const goals = this.getGoals();
        this.listeners.forEach(cb => cb(goals));
    }
}

const nutritionGoalsManager = new NutritionGoalsManager();
export default nutritionGoalsManager;
export { NutritionGoalsManager, DEFAULT_GOALS, GOAL_PRESETS };
