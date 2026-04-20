export class MealPrep {
    constructor({ getMealPlan, getRecipes, getPreferences, announce }) {
        this.getMealPlan = getMealPlan;
        this.getRecipes = getRecipes;
        this.getPreferences = getPreferences;
        this.announce = announce;
    }

    getBatchCookingSuggestions() {
        const recipes = this.getRecipes();
        const mealPlan = this.getMealPlan();
        const preferences = this.getPreferences();

        // Find recipes that are good for batch cooking (high servings, reasonable time)
        const batchRecipes = recipes.filter(r => {
            const servings = r.servings || 1;
            const time = r.time || 0;
            return servings >= 4 && time <= 120;
        }).sort((a, b) => (b.servings || 1) - (a.servings || 1)).slice(0, 5);

        return batchRecipes;
    }

    calculatePrepSchedule() {
        const mealPlan = this.getMealPlan();
        const recipes = this.getRecipes();
        const preferences = this.getPreferences ? this.getPreferences() : {};
        const people = (preferences && preferences.people) || 1;
        
        // Group meals by recipe to see what could be batch cooked
        const recipeCounts = {};
        Object.values(mealPlan).forEach(mealName => {
            recipeCounts[mealName] = (recipeCounts[mealName] || 0) + 1;
        });

        // Find recipes that appear multiple times or have high servings
        const prepOpportunities = Object.entries(recipeCounts)
            .filter(([name, count]) => count >= 2)
            .map(([name, count]) => {
                const recipe = recipes.find(r => r.name === name);
                return {
                    recipe,
                    count,
                    savings: (recipe.servings || 1) * count
                };
            })
            .sort((a, b) => b.savings - a.savings);

        return prepOpportunities;
    }

    suggestPrepDay() {
        const mealPlan = this.getMealPlan();
        const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        // Find the day with the most meals that could be prepped
        const dayCounts = {};
        DAYS.forEach(day => {
            dayCounts[day] = mealPlan[day] ? 1 : 0;
        });

        // Suggest Sunday or Saturday as prep days (most common)
        return ['Sunday', 'Saturday'].sort((a, b) => dayCounts[b] - dayCounts[a])[0] || 'Sunday';
    }
}
