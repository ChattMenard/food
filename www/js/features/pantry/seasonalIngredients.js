// @ts-check
const SEASONAL_INGREDIENTS = {
    january: ['citrus', 'kale', 'brussels sprouts', 'squash', 'root vegetables', 'cabbage', 'leeks'],
    february: ['citrus', 'kale', 'brussels sprouts', 'squash', 'root vegetables', 'cabbage', 'leeks'],
    march: ['asparagus', 'spinach', 'strawberries', 'peas', 'artichokes', 'radishes', 'rhubarb'],
    april: ['asparagus', 'spinach', 'strawberries', 'peas', 'artichokes', 'radishes', 'rhubarb'],
    may: ['asparagus', 'strawberries', 'peas', 'artichokes', 'radishes', 'greens', 'herbs'],
    june: ['strawberries', 'blueberries', 'cherries', 'peaches', 'zucchini', 'cucumber', 'tomatoes'],
    july: ['strawberries', 'blueberries', 'cherries', 'peaches', 'zucchini', 'cucumber', 'tomatoes', 'corn', 'bell peppers'],
    august: ['tomatoes', 'corn', 'bell peppers', 'eggplant', 'zucchini', 'peaches', 'plums', 'berries'],
    september: ['tomatoes', 'corn', 'bell peppers', 'eggplant', 'apples', 'pears', 'grapes', 'squash'],
    october: ['apples', 'pears', 'grapes', 'squash', 'pumpkin', 'sweet potatoes', 'brussels sprouts', 'kale'],
    november: ['squash', 'pumpkin', 'sweet potatoes', 'brussels sprouts', 'kale', 'cranberries', 'root vegetables'],
    december: ['squash', 'pumpkin', 'sweet potatoes', 'brussels sprouts', 'kale', 'cranberries', 'root vegetables', 'citrus']
};

export function getCurrentSeasonalIngredients() {
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase();
    return SEASONAL_INGREDIENTS[currentMonth] || [];
}

export function getSeasonalIngredientSuggestion(pantryItems) {
    const seasonal = getCurrentSeasonalIngredients();
    const pantryLower = pantryItems.map(item => item.name.toLowerCase());
    
    const suggestions = seasonal.filter(ingredient => {
        return !pantryLower.some(pantryItem => 
            pantryItem.includes(ingredient) || ingredient.includes(pantryItem)
        );
    });

    return suggestions.slice(0, 3);
}

export function getSeasonalRecipes(recipes) {
    const seasonal = getCurrentSeasonalIngredients();
    
    return recipes.filter(recipe => {
        const ingredientsLower = recipe.ingredients.map(ing => ing.toLowerCase());
        return seasonal.some(seasonalIng => 
            ingredientsLower.some(ing => 
                ing.includes(seasonalIng) || seasonalIng.includes(ing)
            )
        );
    }).slice(0, 5);
}
