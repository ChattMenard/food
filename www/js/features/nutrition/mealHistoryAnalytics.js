/**
 * Meal History Analytics Module
 * Provides analytics on meal patterns, preferences, and trends
 */

export class MealHistoryAnalytics {
    constructor(db) {
        this.db = db;
    }
    
    /**
     * Get meal frequency analysis
     * @param {number} days - Number of days to analyze
     * @returns {Object} Frequency analysis
     */
    async getMealFrequency(days = 30) {
        const nutritionLogs = await this.db.getAll('nutritionLog');
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const recentLogs = nutritionLogs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= cutoffDate;
        });
        
        // Count meal frequency
        const recipeFrequency = new Map();
        const categoryFrequency = new Map();
        const cuisineFrequency = new Map();
        
        recentLogs.forEach(log => {
            // Recipe frequency
            recipeFrequency.set(log.recipeName, (recipeFrequency.get(log.recipeName) || 0) + 1);
            
            // Category frequency (would need recipe data)
            // This is a placeholder - in real implementation, look up recipe category
        });
        
        // Sort by frequency
        const topRecipes = Array.from(recipeFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
        
        return {
            period: `${days} days`,
            totalMeals: recentLogs.length,
            averagePerDay: recentLogs.length / days,
            topRecipes,
            categoryFrequency: Object.fromEntries(categoryFrequency),
            cuisineFrequency: Object.fromEntries(cuisineFrequency)
        };
    }
    
    /**
     * Get nutrition trends over time
     * @param {number} days - Number of days to analyze
     * @returns {Object} Nutrition trends
     */
    async getNutritionTrends(_days = 30) {
        const weeklyNutrition = await this.db.getWeeklyNutrition();
        
        const trends = {
            labels: weeklyNutrition.map(day => day.date),
            calories: weeklyNutrition.map(day => day.totals.calories),
            protein: weeklyNutrition.map(day => day.totals.protein),
            carbs: weeklyNutrition.map(day => day.totals.carbs),
            fat: weeklyNutrition.map(day => day.totals.fat),
            fiber: weeklyNutrition.map(day => day.totals.fiber)
        };
        
        // Calculate averages
        const daysWithData = weeklyNutrition.filter(day => day.meals.length > 0);
        
        const averages = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0
        };
        
        if (daysWithData.length > 0) {
            Object.keys(averages).forEach(key => {
                const sum = daysWithData.reduce((acc, day) => acc + day.totals[key], 0);
                averages[key] = Math.round(sum / daysWithData.length);
            });
        }
        
        return {
            trends,
            averages,
            daysWithData: daysWithData.length
        };
    }
    
    /**
     * Get meal variety score
     * @param {number} days - Number of days to analyze
     * @returns {Object} Variety analysis
     */
    async getVarietyScore(days = 30) {
        const frequency = await this.getMealFrequency(days);
        const uniqueRecipes = frequency.topRecipes.length;
        const totalMeals = frequency.totalMeals;
        
        const varietyScore = totalMeals > 0 
            ? (uniqueRecipes / totalMeals) * 100 
            : 0;
        
        let varietyLevel = 'low';
        if (varietyScore > 60) varietyLevel = 'high';
        else if (varietyScore > 30) varietyLevel = 'medium';
        
        return {
            uniqueRecipes,
            totalMeals,
            varietyScore: Math.round(varietyScore),
            varietyLevel,
            suggestion: this.getVarietySuggestion(varietyLevel)
        };
    }
    
    /**
     * Get variety improvement suggestion
     * @param {string} level - Variety level
     * @returns {string} Suggestion
     */
    getVarietySuggestion(level) {
        const suggestions = {
            low: 'Try new recipes to increase meal variety and nutrition diversity',
            medium: 'Good variety! Consider adding a few new recipes each week',
            high: 'Excellent variety! Keep exploring new cuisines'
        };
        
        return suggestions[level] || suggestions.medium;
    }
    
    /**
     * Get most cooked recipes
     * @param {number} limit - Number of recipes to return
     * @returns {Array} Top recipes
     */
    async getMostCookedRecipes(limit = 10) {
        const nutritionLogs = await this.db.getAll('nutritionLog');
        
        const recipeCount = new Map();
        
        nutritionLogs.forEach(log => {
            recipeCount.set(log.recipeId, {
                id: log.recipeId,
                name: log.recipeName,
                count: (recipeCount.get(log.recipeId)?.count || 0) + 1
            });
        });
        
        return Array.from(recipeCount.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    
    /**
     * Get cooking streak
     * @returns {Object} Streak information
     */
    async getCookingStreak() {
        const nutritionLogs = await this.db.getAll('nutritionLog');
        const uniqueDates = new Set(nutritionLogs.map(log => log.date));
        
        const sortedDates = Array.from(uniqueDates).sort().reverse();
        
        let currentStreak = 0;
        let checkDate = new Date();
        
        for (let i = 0; i < 30; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            
            if (uniqueDates.has(dateStr)) {
                currentStreak++;
            } else if (i > 0) {
                break;
            }
            
            checkDate.setDate(checkDate.getDate() - 1);
        }
        
        return {
            currentStreak,
            longestStreak: this.calculateLongestStreak(sortedDates),
            daysLogged: uniqueDates.size
        };
    }
    
    /**
     * Calculate longest cooking streak
     * @param {Array} dates - Sorted array of date strings
     * @returns {number} Longest streak
     */
    calculateLongestStreak(dates) {
        if (dates.length === 0) return 0;
        
        let longestStreak = 1;
        let currentStreak = 1;
        
        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i - 1]);
            const currDate = new Date(dates[i]);
            const diffDays = (prevDate - currDate) / (1000 * 60 * 60 * 24);
            
            if (diffDays === 1) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
        
        return longestStreak;
    }
    
    /**
     * Get cooking time preferences
     * @returns {Object} Time preference analysis
     */
    async getCookingTimePreferences() {
        // This would need recipe data to get cooking times
        // Placeholder implementation
        return {
            averageTime: 30,
            shortestTime: 15,
            longestTime: 60,
            preferredRange: '20-40 minutes'
        };
    }
    
    /**
     * Generate comprehensive analytics report
     * @returns {Object} Analytics report
     */
    async generateReport() {
        const frequency = await this.getMealFrequency(30);
        const trends = await this.getNutritionTrends(30);
        const variety = await this.getVarietyScore(30);
        const mostCooked = await this.getMostCookedRecipes(10);
        const streak = await this.getCookingStreak();
        const timePrefs = await this.getCookingTimePreferences();
        
        return {
            generatedAt: new Date().toISOString(),
            period: '30 days',
            frequency,
            trends,
            variety,
            mostCooked,
            streak,
            timePreferences: timePrefs,
            summary: {
                totalMeals: frequency.totalMeals,
                averageDailyCalories: trends.averages.calories,
                varietyScore: variety.varietyScore,
                currentStreak: streak.currentStreak,
                favoriteRecipe: mostCooked[0]?.name || 'None'
            }
        };
    }
}

export default MealHistoryAnalytics;
