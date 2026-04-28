// @ts-check
/**
 * Open Food Facts Nutritional Data Integration
 * Integrates with Open Food Facts global database for real-time nutritional information
 * Complements the existing Open Prices integration for comprehensive food data
 */

/**
 * Open Food Facts API Client for Nutritional Data
 * Handles product searches, nutritional information retrieval, and data caching
 */
class OpenFoodFactsClient {
    constructor() {
        this.baseURL = 'https://world.openfoodfacts.org/api/v2';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
        this.userAgent = 'FridgeToForkApp/1.0';
    }

    /**
     * Search for products by ingredient name
     * @param {string} ingredientName - Ingredient to search for
     * @param {string} [language='en'] - Language code for results
     * @param {string} [country='ca'] - Country code for regional products
     * @returns {Promise<Object>} Search results with product data
     */
    async searchProducts(ingredientName, language = 'en', country = 'ca') {
        const cacheKey = `search_${ingredientName}_${language}_${country}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            // Search for products matching ingredient
            const searchParams = new URLSearchParams({
                search_terms: ingredientName,
                search_simple: '1',
                action: 'process',
                json: '1',
                page_size: '20',
                fields: 'product_name,nutriments,image_url,brands,categories,ingredients_text,quantity,serving_size'
            });

            if (language) searchParams.append('lc', language);
            if (country) searchParams.append('tagtype_0', 'countries');
            if (country) searchParams.append('tag_contains_0', 'contains');
            if (country) searchParams.append('tag_0', country);

            const searchURL = `${this.baseURL}/search?${searchParams.toString()}`;
            const response = await fetch(searchURL, {
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            if (!response.ok) {
                throw new Error(`Open Food Facts API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Process and normalize nutritional data
            const processedData = this.processSearchResults(data, ingredientName);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });

            return processedData;
        } catch (error) {
            console.warn(`[OpenFoodFacts] Failed to search for ${ingredientName}:`, error);
            return null;
        }
    }

    /**
     * Get detailed nutritional information for a specific product
     * @param {string} barcode - Product barcode
     * @returns {Promise<Object>} Detailed product nutritional data
     */
    async getProductByBarcode(barcode) {
        const cacheKey = `barcode_${barcode}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(`${this.baseURL}/product/${barcode}.json`, {
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            if (!response.ok) {
                throw new Error(`Open Food Facts API error: ${response.status}`);
            }

            const data = await response.json();
            const processedData = this.processProductData(data);
            
            this.cache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now()
            });

            return processedData;
        } catch (error) {
            console.warn(`[OpenFoodFacts] Failed to get product ${barcode}:`, error);
            return null;
        }
    }

    /**
     * Process search results into normalized format
     * @param {Object} apiData - Raw API response
     * @param {string} searchQuery - Original search query
     * @returns {Object} Normalized search results
     */
    processSearchResults(apiData, searchQuery) {
        if (!apiData.products || apiData.products.length === 0) {
            return null;
        }

        const products = apiData.products
            .filter(product => product.nutriments && Object.keys(product.nutriments).length > 0)
            .map(product => ({
                id: product.code,
                name: product.product_name,
                brands: product.brands || 'Unknown',
                categories: product.categories || '',
                ingredients: product.ingredients_text || '',
                quantity: product.quantity || '',
                servingSize: product.serving_size || '100g',
                imageUrl: product.image_url || '',
                nutrition: this.normalizeNutritionData(product.nutriments),
                lastUpdated: Date.now()
            }));

        return {
            query: searchQuery,
            totalProducts: apiData.products.length,
            products: products.slice(0, 10), // Return top 10 results
            averageNutrition: this.calculateAverageNutrition(products)
        };
    }

    /**
     * Process single product data into normalized format
     * @param {Object} apiData - Raw API response
     * @returns {Object} Normalized product data
     */
    processProductData(apiData) {
        if (!apiData.product) {
            return null;
        }

        const product = apiData.product;
        
        return {
            id: product.code,
            name: product.product_name,
            brands: product.brands || 'Unknown',
            categories: product.categories || '',
            ingredients: product.ingredients_text || '',
            quantity: product.quantity || '',
            servingSize: product.serving_size || '100g',
            imageUrl: product.image_url || '',
            nutrition: this.normalizeNutritionData(product.nutriments),
            lastUpdated: Date.now()
        };
    }

    /**
     * Normalize nutrition data to standard format
     * @param {Object} nutriments - Raw nutrition data from API
     * @returns {Object} Normalized nutrition data
     */
    normalizeNutritionData(nutriments) {
        return {
            calories: nutriments['energy-kcal_100g'] || nutriments.energy || 0,
            protein: nutriments.proteins_100g || 0,
            carbs: nutriments.carbohydrates_100g || 0,
            fat: nutriments.fat_100g || 0,
            fiber: nutriments.fiber_100g || 0,
            sugar: nutriments.sugars_100g || 0,
            sodium: nutriments.sodium_100g || 0,
            saturatedFat: nutriments['saturated-fat_100g'] || 0,
            cholesterol: nutriments.cholesterol || 0,
            vitaminA: nutriments.vitamin_a || 0,
            vitaminC: nutriments.vitamin_c || 0,
            calcium: nutriments.calcium || 0,
            iron: nutriments.iron || 0,
            potassium: nutriments.potassium || 0,
            magnesium: nutriments.magnesium || 0
        };
    }

    /**
     * Calculate average nutrition data from multiple products
     * @param {Array} products - Array of product data
     * @returns {Object} Average nutrition values
     */
    calculateAverageNutrition(products) {
        if (products.length === 0) return null;

        const nutritionKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
        const averages = {};

        nutritionKeys.forEach(key => {
            const sum = products.reduce((acc, product) => acc + (product.nutrition[key] || 0), 0);
            averages[key] = sum / products.length;
        });

        return averages;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout
        };
    }
}

/**
 * Enhanced Recipe Nutrition Calculator
 * Uses real nutritional data from Open Food Facts with fallback to estimated values
 */
class EnhancedRecipeNutritionCalculator {
    constructor() {
        this.offClient = new OpenFoodFactsClient();
        this.fallbackNutrition = this.initializeFallbackNutrition();
    }

    /**
     * Initialize fallback nutrition data for common ingredients
     * @returns {Object} Fallback nutrition database
     */
    initializeFallbackNutrition() {
        return {
            // Basic ingredients (per 100g)
            rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 1 },
            chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74 },
            beef: { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 60 },
            salmon: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59 },
            eggs: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124 },
            milk: { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44 },
            cheese: { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621 },
            tomatoes: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5 },
            onions: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4 },
            garlic: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, sugar: 1, sodium: 17 },
            carrots: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69 },
            potatoes: { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6 },
            pasta: { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 6 },
            bread: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 492 },
            butter: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1, sodium: 11 },
            oil: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 }
        };
    }

    /**
     * Calculate recipe nutrition using real data from Open Food Facts
     * @param {Object} recipe - Recipe object with ingredients
     * @param {string} [country='ca'] - Country code for regional products
     * @returns {Promise<Object>} Complete nutrition breakdown
     */
    async calculateRecipeNutrition(recipe, country = 'ca') {
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
            throw new Error('Recipe must have ingredients array');
        }

        const ingredientBreakdown = [];
        let totalNutrition = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0
        };

        // Process each ingredient
        for (const ingredient of recipe.ingredients) {
            const nutritionData = await this.getIngredientNutrition(ingredient, country);
            
            if (nutritionData) {
                ingredientBreakdown.push(nutritionData);
                
                // Add to totals
                Object.keys(totalNutrition).forEach(key => {
                    totalNutrition[key] += nutritionData.nutrition[key] * nutritionData.quantity;
                });
            }
        }

        // Calculate per-serving nutrition
        const servings = recipe.servings || 1;
        const perServing = {};
        Object.keys(totalNutrition).forEach(key => {
            perServing[key] = totalNutrition[key] / servings;
        });

        return {
            recipe: recipe.name || 'Unknown Recipe',
            servings: servings,
            totalNutrition: totalNutrition,
            nutritionPerServing: perServing,
            ingredientBreakdown: ingredientBreakdown,
            dataSource: 'open_food_facts',
            lastUpdated: Date.now(),
            country: country
        };
    }

    /**
     * Get nutrition data for a single ingredient
     * @param {Object} ingredient - Ingredient object with name and quantity
     * @param {string} country - Country code for regional products
     * @returns {Promise<Object>} Ingredient nutrition data
     */
    async getIngredientNutrition(ingredient, country) {
        const ingredientName = this.normalizeIngredientName(ingredient.name);
        const quantity = this.parseQuantity(ingredient.quantity);

        try {
            // Search for products matching ingredient
            const searchResults = await this.offClient.searchProducts(ingredientName, 'en', country);
            
            if (searchResults && searchResults.products.length > 0) {
                // Use the first product's nutrition data
                const product = searchResults.products[0];
                const nutrition = product.nutrition;

                return {
                    name: ingredient.name,
                    quantity: quantity,
                    unit: ingredient.unit || 'g',
                    nutrition: nutrition,
                    source: 'open_food_facts',
                    productInfo: {
                        name: product.name,
                        brands: product.brands,
                        servingSize: product.servingSize
                    }
                };
            }
        } catch (error) {
            console.warn(`[Nutrition] Failed to get nutrition for ${ingredientName}:`, error);
        }

        // Fallback to estimated nutrition
        const fallbackNutrition = this.fallbackNutrition[ingredientName];
        if (fallbackNutrition) {
            return {
                name: ingredient.name,
                quantity: quantity,
                unit: ingredient.unit || 'g',
                nutrition: fallbackNutrition,
                source: 'fallback'
            };
        }

        // Default fallback
        return {
            name: ingredient.name,
            quantity: quantity,
            unit: ingredient.unit || 'g',
            nutrition: { calories: 50, protein: 1, carbs: 10, fat: 0.5, fiber: 0.5, sugar: 1, sodium: 10 },
            source: 'default'
        };
    }

    /**
     * Normalize ingredient name for search
     * @param {string} name - Original ingredient name
     * @returns {string} Normalized name
     */
    normalizeIngredientName(name) {
        return name.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Parse quantity from ingredient
     * @param {string|number} quantity - Quantity value
     * @returns {number} Normalized quantity in grams
     */
    parseQuantity(quantity) {
        if (typeof quantity === 'number') return quantity;
        if (typeof quantity === 'string') {
            const match = quantity.match(/[\d.]+/);
            return match ? parseFloat(match[0]) : 1;
        }
        return 1;
    }

    /**
     * Update fallback nutrition with latest API data
     * @returns {Promise<void>}
     */
    async updateFallbackNutrition() {
        console.log('[Nutrition] Updating fallback nutrition database...');
        
        for (const ingredient of Object.keys(this.fallbackNutrition)) {
            try {
                const searchResults = await this.offClient.searchProducts(ingredient, 'en', 'ca');
                if (searchResults && searchResults.averageNutrition) {
                    this.fallbackNutrition[ingredient] = searchResults.averageNutrition;
                }
            } catch (error) {
                console.warn(`[Nutrition] Failed to update ${ingredient}:`, error);
            }
        }
        
        console.log('[Nutrition] Fallback nutrition database updated');
    }

    /**
     * Get nutrition for multiple ingredients in parallel
     * @param {Array} ingredients - Array of ingredient objects
     * @param {string} country - Country code for regional products
     * @returns {Promise<Array>} Array of nutrition data
     */
    async getBatchNutrition(ingredients, country = 'ca') {
        const promises = ingredients.map(ingredient => 
            this.getIngredientNutrition(ingredient, country)
        );
        
        return Promise.all(promises);
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.offClient.clearCache();
    }

    /**
     * Get integration statistics
     * @returns {Object} Integration statistics
     */
    getStats() {
        return {
            cacheStats: this.offClient.getCacheStats(),
            fallbackDatabaseSize: Object.keys(this.fallbackNutrition).length
        };
    }
}

// Export instances and classes
export const openFoodFactsClient = new OpenFoodFactsClient();
export const enhancedNutritionCalculator = new EnhancedRecipeNutritionCalculator();

export { OpenFoodFactsClient, EnhancedRecipeNutritionCalculator };
