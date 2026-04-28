// @ts-check
/**
 * Open Food Facts Open Prices Integration Demo
 * Demonstrates real-time price data integration with recipe cost classification
 */

import { enhancedRecipeClassifier } from './openPricesIntegration.js';

/**
 * Demo function to showcase Open Prices integration
 */
async function demonstrateOpenPricesIntegration() {
    console.log('🌟 Open Food Facts Open Prices Integration Demo');
    console.log('=' .repeat(50));

    // Example recipes with different cost profiles
    const recipes = [
        {
            name: 'Budget Pasta Dish',
            ingredients: [
                { name: 'pasta', quantity: 2, unit: 'cups' },
                { name: 'tomatoes', quantity: 3, unit: 'pieces' },
                { name: 'garlic', quantity: 2, unit: 'cloves' },
                { name: 'onion', quantity: 1, unit: 'piece' }
            ],
            servings: 4,
            difficulty: 'easy',
            cuisine: 'Italian'
        },
        {
            name: 'Premium Salmon Dinner',
            ingredients: [
                { name: 'salmon', quantity: 1, unit: 'lb' },
                { name: 'asparagus', quantity: 1, unit: 'bunch' },
                { name: 'lemon', quantity: 1, unit: 'piece' },
                { name: 'butter', quantity: 2, unit: 'tbsp' }
            ],
            servings: 2,
            difficulty: 'medium',
            cuisine: 'American'
        },
        {
            name: 'Comfort Chicken Soup',
            ingredients: [
                { name: 'chicken', quantity: 1, unit: 'lb' },
                { name: 'carrots', quantity: 3, unit: 'pieces' },
                { name: 'celery', quantity: 2, unit: 'stalks' },
                { name: 'onion', quantity: 1, unit: 'piece' },
                { name: 'rice', quantity: 1, unit: 'cup' }
            ],
            servings: 6,
            difficulty: 'easy',
            cuisine: 'American'
        }
    ];

    console.log('📊 Analyzing recipes with real-time price data...\n');

    for (const recipe of recipes) {
        console.log(`🍽️  ${recipe.name}`);
        console.log(`   Servings: ${recipe.servings} | Difficulty: ${recipe.difficulty} | Cuisine: ${recipe.cuisine}`);
        
        try {
            // Classify recipe using real-time price data
            const classification = await enhancedRecipeClassifier.classifyRecipeWithRealPrices(recipe);
            
            console.log(`   💰 Cost Classification: ${classification.tier} (${getTierDescription(classification.tier)})`);
            console.log(`   💵 Cost per serving: $${classification.costPerServing.toFixed(2)}`);
            console.log(`   💸 Total cost: $${classification.totalCost.toFixed(2)}`);
            console.log(`   📍 Location: ${classification.location}`);
            console.log(`   📊 Data source: ${classification.dataSource}`);
            
            // Show ingredient breakdown
            console.log('   📋 Ingredient Breakdown:');
            classification.ingredientBreakdown.forEach((ing, index) => {
                const sourceIcon = ing.source === 'open_prices' ? '🌐' : '📝';
                console.log(`      ${index + 1}. ${ing.name} (${ing.quantity} ${ing.unit || 'unit'}) - $${ing.totalCost.toFixed(2)} ${sourceIcon}`);
            });
            
            console.log(`   ⏰ Last updated: ${new Date(classification.lastUpdated).toLocaleString()}`);
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('\n' + '-'.repeat(60) + '\n');
    }

    // Demonstrate location-aware pricing
    console.log('🌍 Location-Aware Pricing Demo');
    console.log('=' .repeat(30));
    
    const simpleRecipe = {
        name: 'Simple Rice Dish',
        ingredients: [{ name: 'rice', quantity: 1, unit: 'kg' }],
        servings: 4
    };

    const locations = ['US', 'FR', 'JP', 'BR'];
    
    for (const location of locations) {
        try {
            const result = await enhancedRecipeClassifier.classifyRecipeWithRealPrices(simpleRecipe, location);
            console.log(`📍 ${location}: $${result.costPerServing.toFixed(2)}/serving (${result.tier})`);
        } catch (error) {
            console.log(`📍 ${location}: Error fetching price data`);
        }
    }

    console.log('\n🔄 Fallback System Demo');
    console.log('=' .repeat(25));
    
    // Test fallback system with API failure simulation
    const exoticRecipe = {
        name: 'Exotic Truffle Dish',
        ingredients: [{ name: 'truffle', quantity: 1, unit: 'oz' }],
        servings: 2
    };

    try {
        const result = await enhancedRecipeClassifier.classifyRecipeWithRealPrices(exoticRecipe);
        console.log(`🍄 ${result.ingredientBreakdown[0].name}: $${result.costPerServing.toFixed(2)}/serving`);
        console.log(`📝 Data source: ${result.ingredientBreakdown[0].source} (fallback system)`);
    } catch (error) {
        console.log('❌ Fallback system failed');
    }

    console.log('\n✨ Demo complete! The Open Prices integration provides:');
    console.log('   • Real-time price data from Open Food Facts');
    console.log('   • Location-aware pricing for different regions');
    console.log('   • Graceful fallback to estimated costs');
    console.log('   • Detailed cost breakdowns with data sources');
    console.log('   • Automatic C/N/F classification based on actual costs');
}

/**
 * Get human-readable description for cost tier
 * @param {string} tier - Cost tier (C/N/F)
 * @returns {string} Description
 */
function getTierDescription(tier) {
    switch (tier) {
        case 'C': return 'Cheap (≤$2.00 per serving)';
        case 'N': return 'Normal ($2.00-$5.00 per serving)';
        case 'F': return 'Fancy (>$5.00 per serving)';
        default: return 'Unknown';
    }
}

/**
 * Update fallback costs with latest API data
 */
async function updateFallbackCosts() {
    console.log('🔄 Updating fallback costs with latest price data...');
    
    try {
        await enhancedRecipeClassifier.updateFallbackCosts();
        console.log('✅ Fallback costs updated successfully');
    } catch (error) {
        console.log('❌ Failed to update fallback costs:', error.message);
    }
}

// Export demo functions
export {
    demonstrateOpenPricesIntegration,
    updateFallbackCosts,
    getTierDescription
};
