// @ts-check
/**
 * Open Food Facts Nutritional Data Integration Demo
 * Demonstrates real-time nutritional data integration with recipe nutrition calculation
 */

import { enhancedNutritionCalculator, openFoodFactsClient } from './openFoodFactsIntegration.js';

/**
 * Demo function to showcase Open Food Facts nutritional data integration
 */
async function demonstrateOpenFoodFactsIntegration() {
    console.log('🌟 Open Food Facts Nutritional Data Integration Demo');
    console.log('=' .repeat(55));

    // Example recipes with different nutritional profiles
    const recipes = [
        {
            name: 'Healthy Chicken and Rice Bowl',
            ingredients: [
                { name: 'chicken breast', quantity: 200, unit: 'g' },
                { name: 'brown rice', quantity: 150, unit: 'g' },
                { name: 'broccoli', quantity: 100, unit: 'g' },
                { name: 'olive oil', quantity: 15, unit: 'ml' }
            ],
            servings: 2,
            cuisine: 'Healthy'
        },
        {
            name: 'Vegetarian Pasta Primavera',
            ingredients: [
                { name: 'pasta', quantity: 200, unit: 'g' },
                { name: 'tomatoes', quantity: 150, unit: 'g' },
                { name: 'garlic', quantity: 10, unit: 'g' },
                { name: 'parmesan cheese', quantity: 30, unit: 'g' },
                { name: 'olive oil', quantity: 20, unit: 'ml' }
            ],
            servings: 4,
            cuisine: 'Italian'
        },
        {
            name: 'Protein Power Smoothie',
            ingredients: [
                { name: 'milk', quantity: 250, unit: 'ml' },
                { name: 'banana', quantity: 100, unit: 'g' },
                { name: 'protein powder', quantity: 30, unit: 'g' },
                { name: 'almonds', quantity: 20, unit: 'g' }
            ],
            servings: 1,
            cuisine: 'Beverage'
        }
    ];

    console.log('📊 Analyzing recipes with real-time nutritional data...\n');

    for (const recipe of recipes) {
        console.log(`🍽️  ${recipe.name}`);
        console.log(`   Servings: ${recipe.servings} | Cuisine: ${recipe.cuisine}`);
        
        try {
            // Calculate nutrition using real-time data
            const nutrition = await enhancedNutritionCalculator.calculateRecipeNutrition(recipe, 'ca');
            
            console.log('   🥗 Total Nutrition:');
            console.log(`      Calories: ${nutrition.totalNutrition.calories.toFixed(0)} kcal`);
            console.log(`      Protein: ${nutrition.totalNutrition.protein.toFixed(1)}g`);
            console.log(`      Carbs: ${nutrition.totalNutrition.carbs.toFixed(1)}g`);
            console.log(`      Fat: ${nutrition.totalNutrition.fat.toFixed(1)}g`);
            console.log(`      Fiber: ${nutrition.totalNutrition.fiber.toFixed(1)}g`);
            console.log(`      Sugar: ${nutrition.totalNutrition.sugar.toFixed(1)}g`);
            console.log(`      Sodium: ${nutrition.totalNutrition.sodium.toFixed(0)}mg`);
            
            console.log('   🍽️  Per Serving:');
            console.log(`      Calories: ${nutrition.nutritionPerServing.calories.toFixed(0)} kcal`);
            console.log(`      Protein: ${nutrition.nutritionPerServing.protein.toFixed(1)}g`);
            console.log(`      Carbs: ${nutrition.nutritionPerServing.carbs.toFixed(1)}g`);
            console.log(`      Fat: ${nutrition.nutritionPerServing.fat.toFixed(1)}g`);
            
            console.log('   📋 Ingredient Breakdown:');
            nutrition.ingredientBreakdown.forEach((ing, index) => {
                const sourceIcon = ing.source === 'open_food_facts' ? '🌐' : '📝';
                const productInfo = ing.productInfo ? ` (${ing.productInfo.name})` : '';
                console.log(`      ${index + 1}. ${ing.name} (${ing.quantity} ${ing.unit})${productInfo} ${sourceIcon}`);
                console.log(`         Calories: ${(ing.nutrition.calories * ing.quantity).toFixed(0)} kcal`);
            });
            
            console.log(`   📍 Data Source: ${nutrition.dataSource}`);
            console.log(`   🌍 Region: ${nutrition.country}`);
            console.log(`   ⏰ Last Updated: ${new Date(nutrition.lastUpdated).toLocaleString()}`);
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('\n' + '-'.repeat(65) + '\n');
    }

    // Demonstrate country-specific nutrition data
    console.log('🌍 Country-Specific Nutrition Data Demo');
    console.log('=' .repeat(35));
    
    const simpleRecipe = {
        name: 'Simple Milk',
        ingredients: [{ name: 'milk', quantity: 250, unit: 'ml' }],
        servings: 1
    };

    const countries = ['ca', 'us', 'fr', 'gb'];
    
    for (const country of countries) {
        try {
            const result = await enhancedNutritionCalculator.calculateRecipeNutrition(simpleRecipe, country);
            console.log(`📍 ${country.toUpperCase()}: ${result.nutritionPerServing.calories.toFixed(0)} kcal/serving`);
            console.log(`   Source: ${result.ingredientBreakdown[0].source}`);
        } catch (error) {
            console.log(`📍 ${country.toUpperCase()}: Error fetching nutrition data`);
        }
    }

    console.log('\n🔄 Fallback System Demo');
    console.log('=' .repeat(25));
    
    // Test fallback system with API failure simulation
    const exoticRecipe = {
        name: 'Exotic Ingredient Dish',
        ingredients: [{ name: 'dragon fruit', quantity: 100, unit: 'g' }],
        servings: 1
    };

    try {
        const result = await enhancedNutritionCalculator.calculateRecipeNutrition(exoticRecipe);
        console.log(`🐉 ${result.ingredientBreakdown[0].name}: ${result.nutritionPerServing.calories.toFixed(0)} kcal/serving`);
        console.log(`📝 Data source: ${result.ingredientBreakdown[0].source} (fallback system)`);
    } catch (error) {
        console.log('❌ Fallback system failed');
    }

    console.log('\n📈 Batch Processing Demo');
    console.log('='.repeat(25));
    
    const batchIngredients = [
        { name: 'rice', quantity: 100 },
        { name: 'chicken', quantity: 100 },
        { name: 'broccoli', quantity: 100 },
        { name: 'cheese', quantity: 50 }
    ];

    try {
        const startTime = Date.now();
        const results = await enhancedNutritionCalculator.getBatchNutrition(batchIngredients, 'ca');
        const endTime = Date.now();
        
        console.log(`⚡ Processed ${results.length} ingredients in ${endTime - startTime}ms`);
        console.log('📊 Results:');
        results.forEach((result, index) => {
            const sourceIcon = result.source === 'open_food_facts' ? '🌐' : '📝';
            console.log(`   ${index + 1}. ${result.name}: ${result.nutrition.calories} kcal/100g ${sourceIcon}`);
        });
    } catch (error) {
        console.log('❌ Batch processing failed');
    }

    console.log('\n🔍 Product Search Demo');
    console.log('=' .repeat(20));
    
    const searchTerms = ['organic chicken', 'brown rice', 'olive oil'];
    
    for (const term of searchTerms) {
        try {
            const searchResults = await openFoodFactsClient.searchProducts(term, 'en', 'ca');
            if (searchResults && searchResults.products.length > 0) {
                console.log(`🔍 "${term}": ${searchResults.products.length} products found`);
                const topProduct = searchResults.products[0];
                console.log(`   📦 ${topProduct.name} (${topProduct.brands})`);
                console.log(`   🥗 ${topProduct.nutrition.calories} kcal/100g`);
            } else {
                console.log(`🔍 "${term}": No products found`);
            }
        } catch (error) {
            console.log(`🔍 "${term}": Search failed`);
        }
    }

    console.log('\n📊 Integration Statistics');
    console.log('='.repeat(25));
    
    const stats = enhancedNutritionCalculator.getStats();
    console.log(`💾 Cache Size: ${stats.cacheStats.size} entries`);
    console.log(`⏰ Cache Timeout: ${stats.cacheStats.timeout}ms`);
    console.log(`📚 Fallback Database: ${stats.fallbackDatabaseSize} ingredients`);
    
    console.log('\n✨ Demo complete! The Open Food Facts integration provides:');
    console.log('   • Real-time nutritional data from Open Food Facts global database');
    console.log('   • Country-specific product information and nutrition data');
    console.log('   • Graceful fallback to estimated nutrition when API fails');
    console.log('   • Comprehensive nutrition breakdowns with data sources');
    console.log('   • Batch processing for efficient multiple ingredient analysis');
    console.log('   • Product search and barcode lookup capabilities');
    console.log('   • Smart caching to minimize API calls and improve performance');
}

/**
 * Update fallback nutrition database with latest data
 */
async function updateFallbackNutrition() {
    console.log('🔄 Updating fallback nutrition database with latest data...');
    
    try {
        await enhancedNutritionCalculator.updateFallbackNutrition();
        console.log('✅ Fallback nutrition database updated successfully');
    } catch (error) {
        console.log('❌ Failed to update fallback nutrition database:', error.message);
    }
}

/**
 * Demonstrate nutrition goal tracking
 */
async function demonstrateNutritionGoals() {
    console.log('🎯 Nutrition Goals Tracking Demo');
    console.log('='.repeat(30));
    
    const recipe = {
        name: 'Balanced Meal',
        ingredients: [
            { name: 'chicken breast', quantity: 150, unit: 'g' },
            { name: 'quinoa', quantity: 100, unit: 'g' },
            { name: 'avocado', quantity: 50, unit: 'g' },
            { name: 'spinach', quantity: 100, unit: 'g' }
        ],
        servings: 1
    };

    try {
        const nutrition = await enhancedNutritionCalculator.calculateRecipeNutrition(recipe);
        const perServing = nutrition.nutritionPerServing;
        
        // Example nutrition goals (2000 calorie diet)
        const goals = {
            calories: 500,
            protein: 30,
            carbs: 60,
            fat: 15,
            fiber: 8,
            sugar: 10,
            sodium: 600
        };

        console.log('🎯 Nutrition Goals vs Actual:');
        Object.keys(goals).forEach(nutrient => {
            const actual = perServing[nutrient] || 0;
            const goal = goals[nutrient];
            const percentage = (actual / goal) * 100;
            const status = percentage >= 90 ? '✅' : percentage >= 70 ? '⚠️' : '❌';
            
            console.log(`   ${status} ${nutrient}: ${actual.toFixed(1)} / ${goal} (${percentage.toFixed(0)}%)`);
        });

        // Calculate daily progress if this was 1 of 4 meals
        console.log('\n📅 Projected Daily Progress (if 4 similar meals):');
        Object.keys(goals).forEach(nutrient => {
            const projected = perServing[nutrient] * 4;
            const dailyGoal = goals[nutrient] * 4;
            const percentage = (projected / dailyGoal) * 100;
            const status = percentage >= 90 ? '✅' : percentage >= 70 ? '⚠️' : '❌';
            
            console.log(`   ${status} ${nutrient}: ${projected.toFixed(0)} / ${dailyGoal} (${percentage.toFixed(0)}%)`);
        });

    } catch (error) {
        console.log('❌ Failed to calculate nutrition for goals demo');
    }
}

/**
 * Clear all caches
 */
function clearAllCaches() {
    console.log('🧹 Clearing all caches...');
    enhancedNutritionCalculator.clearCache();
    console.log('✅ All caches cleared');
}

// Export demo functions
export {
    demonstrateOpenFoodFactsIntegration,
    updateFallbackNutrition,
    demonstrateNutritionGoals,
    clearAllCaches
};
