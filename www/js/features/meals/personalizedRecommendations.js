// @ts-check
export class PersonalizedRecommendations {
    constructor({ getMealPlan, getRecipes, getPreferences, getRecipeRatings }) {
        this.getMealPlan = getMealPlan;
        this.getRecipes = getRecipes;
        this.getPreferences = getPreferences;
        this.getRecipeRatings = getRecipeRatings;
    }

    getPersonalizedSuggestions(limit = 5) {
        const mealPlan = this.getMealPlan();
        const recipes = this.getRecipes();
        const recipeRatings = this.getRecipeRatings();
        const preferences = this.getPreferences();

        // Get favorite recipes (highly rated)
        const favoriteRecipes = Object.entries(recipeRatings)
            .filter(([_name, rating]) => rating >= 4)
            .map(([name, _rating]) => recipes.find(r => r.name === name))
            .filter(Boolean);

        // Get frequently cooked recipes from meal plan
        const mealCounts = {};
        Object.values(mealPlan).forEach(mealName => {
            mealCounts[mealName] = (mealCounts[mealName] || 0) + 1;
        });

        const frequentRecipes = Object.entries(mealCounts)
            .filter(([_name, count]) => count >= 2)
            .map(([name, count]) => ({ recipe: recipes.find(r => r.name === name), count }))
            .filter(item => item.recipe)
            .sort((a, b) => b.count - a.count)
            .map(item => item.recipe);

        // Combine and dedupe
        const personalized = [...favoriteRecipes, ...frequentRecipes];
        const uniqueRecipes = [];
        const seen = new Set();
        
        personalized.forEach(recipe => {
            if (!seen.has(recipe.name)) {
                seen.add(recipe.name);
                uniqueRecipes.push(recipe);
            }
        });

        // If not enough personalized suggestions, fill with preferences-based
        if (uniqueRecipes.length < limit) {
            const dietFiltered = recipes.filter(r => {
                if (preferences.diets && preferences.diets.length > 0) {
                    const diet = preferences.diets[0];
                    return this.passesDiet(r, diet);
                }
                return true;
            });
            
            dietFiltered.slice(0, limit - uniqueRecipes.length).forEach(recipe => {
                if (!seen.has(recipe.name)) {
                    uniqueRecipes.push(recipe);
                }
            });
        }

        return uniqueRecipes.slice(0, limit);
    }

    passesDiet(recipe, diet) {
        const keywords = {
            'vegetarian': ['meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp'],
            'vegan': ['meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'dairy', 'cheese', 'milk', 'egg', 'butter'],
            'keto': ['bread', 'pasta', 'rice', 'sugar', 'potato'],
            'gluten-free': ['bread', 'pasta', 'wheat', 'flour'],
            'diabetic': ['sugar', 'sweet'],
            'lowcarb': ['bread', 'pasta', 'rice', 'potato'],
            'lowsodium': ['salt', 'sodium'],
            'heart': ['butter', 'cream', 'fried']
        };

        const excluded = keywords[diet.toLowerCase()] || [];
        const recipeText = `${recipe.name} ${recipe.ingredients.join(' ')}`.toLowerCase();
        
        return !excluded.some(keyword => recipeText.includes(keyword));
    }
}
