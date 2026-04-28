// @ts-check
/**
 * Open Food Facts Open Prices Integration
 * Integrates real-time price data with recipe cost classification
 */

/**
 * Open Prices API Client
 * Handles communication with Open Food Facts price database
 */
class OpenPricesClient {
    constructor() {
        this.baseURL = 'https://prices.openfoodfacts.org/api';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get price data for a specific product/ingredient
     * @param {string} ingredientName - Ingredient name to search
     * @param {string} [location] - Optional location code for regional pricing
     * @returns {Promise<Object>} Price data with metadata
     */
    async getIngredientPrice(ingredientName, location = null) {
        const cacheKey = `${ingredientName}_${location || 'global'}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            // Search for products matching ingredient using correct Open Prices API
            const searchParams = new URLSearchParams({
                search_terms: ingredientName,
                page_size: '20',
                sort_by: 'created_t',
                order_by: 'desc'
            });

            if (location) {
                searchParams.append('location_tags', location);
            }

            const searchURL = `${this.baseURL}/v1/prices?${searchParams.toString()}`;
            const response = await fetch(searchURL);
            
            if (!response.ok) {
                throw new Error(`Open Prices API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Process and normalize price data
            const priceData = this.processPriceData(data, location);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: priceData,
                timestamp: Date.now()
            });

            return priceData;
        } catch (error) {
            console.warn(`[OpenPrices] Failed to fetch price for ${ingredientName}:`, error);
            return null;
        }
    }

    /**
     * Process raw API response into normalized price data
     * @param {Object} apiData - Raw API response from Open Prices
     * @param {string} [location] - Location filter
     * @returns {Object} Normalized price data
     */
    processPriceData(apiData, location = null) {
        // Open Prices API returns prices directly, not nested in products
        if (!apiData.prices || apiData.prices.length === 0) {
            return null;
        }

        // Filter by location if specified
        let prices = apiData.prices;
        if (location) {
            prices = prices.filter(price => 
                price.location_tags?.includes(location) || 
                price.country_code === location ||
                price.osm_country_tag === location
            );
        }

        if (prices.length === 0) {
            return null;
        }

        // Calculate price statistics
        const validPrices = prices
            .map(p => p.price)
            .filter(p => p && p > 0)
            .sort((a, b) => a - b);

        if (validPrices.length === 0) {
            return null;
        }

        const avgPrice = validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length;
        const medianPrice = validPrices[Math.floor(validPrices.length / 2)];
        const minPrice = validPrices[0];
        const maxPrice = validPrices[validPrices.length - 1];

        return {
            ingredient: apiData.search_terms || 'unknown',
            location: location || 'global',
            priceData: {
                average: avgPrice,
                median: medianPrice,
                min: minPrice,
                max: maxPrice,
                sampleSize: validPrices.length,
                currency: this.detectCurrency(prices),
                lastUpdated: Date.now()
            },
            products: prices.slice(0, 5) // Keep sample products for reference
        };
    }

    /**
     * Detect currency from product data
     * @param {Array} products - Product list
     * @returns {string} Currency code
     */
    detectCurrency(products) {
        const currencies = products.map(p => p.currency || p.currency_code).filter(Boolean);
        const currencyCounts = {};
        
        currencies.forEach(currency => {
            currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
        });

        // Return most common currency
        return Object.keys(currencyCounts).reduce((a, b) => 
            currencyCounts[a] > currencyCounts[b] ? a : b
        );
    }

    /**
     * Get price trends for an ingredient over time
     * @param {string} ingredientName - Ingredient name
     * @param {string} [location] - Location filter
     * @returns {Promise<Object>} Historical price data
     */
    async getPriceTrends(ingredientName, location = null) {
        // This would require additional API endpoints for historical data
        // For now, return placeholder
        return {
            ingredient: ingredientName,
            location: location || 'global',
            trends: [],
            message: 'Historical data not yet implemented'
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

/**
 * Enhanced Recipe Cost Classifier with Real Price Data
 * Extends the existing classifier with Open Prices integration
 */
class EnhancedRecipeCostClassifier {
    constructor() {
        this.openPrices = new OpenPricesClient();
        this.fallbackCosts = {
            // Fallback to current hardcoded costs when API fails
            rice: 1.50,
            pasta: 1.50,
            chicken: 3.00,
            beef: 4.00,
            salmon: 6.00,
            // ... other fallback costs
        };
    }

    /**
     * Get real-time ingredient cost with fallback
     * @param {string} ingredientName - Ingredient name
     * @param {string} [location] - User's location
     * @returns {Promise<number>} Estimated cost per unit
     */
    async getIngredientCost(ingredientName, location = null) {
        try {
            const priceData = await this.openPrices.getIngredientPrice(ingredientName, location);
            
            if (priceData && priceData.priceData) {
                // Use median price for more stable estimation
                return priceData.priceData.median;
            }
        } catch (error) {
            console.warn(`[EnhancedClassifier] API failed for ${ingredientName}, using fallback`);
        }

        // Fallback to hardcoded costs
        return this.fallbackCosts[ingredientName.toLowerCase()] || 2.50;
    }

    /**
     * Classify recipe with real-time pricing
     * @param {Object} recipe - Recipe object
     * @param {string} [location] - User's location
     * @returns {Promise<Object>} Enhanced classification with real costs
     */
    async classifyRecipeWithRealPrices(recipe, location = null) {
        const { ingredients = [] } = recipe;
        
        // Get real prices for all ingredients
        const ingredientCosts = await Promise.all(
            ingredients.map(async (ing) => {
                const name = typeof ing === 'string' ? ing : ing.name;
                const cost = await this.getIngredientCost(name, location);
                const quantity = (typeof ing === 'object' ? ing.quantity : 1) || 1;
                
                return {
                    name,
                    cost,
                    quantity,
                    totalCost: cost * quantity,
                    source: 'open_prices' // or 'fallback'
                };
            })
        );

        // Calculate total recipe cost
        const totalCost = ingredientCosts.reduce((sum, ing) => sum + ing.totalCost, 0);
        const servings = recipe.servings || 4;
        const costPerServing = totalCost / servings;

        // Apply C/N/F classification based on real costs
        let tier = this.classifyByCost(costPerServing);

        return {
            tier,
            costPerServing,
            totalCost,
            servings,
            ingredientBreakdown: ingredientCosts,
            location: location || 'global',
            dataSource: 'open_prices',
            lastUpdated: Date.now()
        };
    }

    /**
     * Classify recipe cost tier based on actual cost per serving
     * @param {number} costPerServing - Cost per serving
     * @returns {string} C/N/F tier
     */
    classifyByCost(costPerServing) {
        if (costPerServing <= 2.00) return 'C';  // Cheap
        if (costPerServing <= 5.00) return 'N';  // Normal
        return 'F';  // Fancy
    }

    /**
     * Update fallback costs based on recent API data
     * @param {string} [location] - Location to update for
     */
    async updateFallbackCosts(location = null) {
        const commonIngredients = Object.keys(this.fallbackCosts);
        
        for (const ingredient of commonIngredients) {
            try {
                const priceData = await this.openPrices.getIngredientPrice(ingredient, location);
                if (priceData && priceData.priceData) {
                    this.fallbackCosts[ingredient] = priceData.priceData.median;
                }
            } catch (error) {
                console.warn(`Failed to update fallback cost for ${ingredient}`);
            }
        }

        console.log('[EnhancedClassifier] Updated fallback costs with latest data');
    }
}

// Export singleton instances
export const openPricesClient = new OpenPricesClient();
export const enhancedRecipeClassifier = new EnhancedRecipeCostClassifier();

export { OpenPricesClient, EnhancedRecipeCostClassifier };
