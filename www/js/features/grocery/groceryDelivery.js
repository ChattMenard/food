// @ts-check
/**
 * Grocery Delivery Integration
 * Multi-provider grocery delivery with cart export and price comparison
 * Supports Instacart, Amazon Fresh, Walmart+, and manual list export
 */

import db from '../../data/db.js';

// Supported grocery delivery providers
const PROVIDERS = {
    instacart: {
        id: 'instacart',
        name: 'Instacart',
        icon: '🛒',
        regions: ['US', 'CA'],
        website: 'https://www.instacart.com',
        cartUrl: 'https://www.instacart.com/store/search',
        features: ['same-day', 'alcohol', 'pharmacy'],
        stores: ['Costco', 'Kroger', 'Safeway', 'Aldi', 'Target']
    },
    
    amazonFresh: {
        id: 'amazonFresh',
        name: 'Amazon Fresh',
        icon: '📦',
        regions: ['US', 'UK', 'DE', 'JP'],
        website: 'https://www.amazon.com/fresh',
        cartUrl: 'https://www.amazon.com/gp/cart/view.html',
        features: ['2-hour', 'whole-foods', 'prime-integration'],
        stores: ['Amazon Fresh', 'Whole Foods']
    },
    
    walmart: {
        id: 'walmart',
        name: 'Walmart+',
        icon: '🏪',
        regions: ['US'],
        website: 'https://www.walmart.com/grocery',
        cartUrl: 'https://www.walmart.com/grocery/cart',
        features: ['free-delivery', 'in-store-pickup', 'rollback-prices'],
        stores: ['Walmart', 'Walmart Neighborhood Market']
    },
    
    target: {
        id: 'target',
        name: 'Target Same Day',
        icon: '🎯',
        regions: ['US'],
        website: 'https://www.target.com/c/grocery/-/N-5xt1a',
        cartUrl: 'https://www.target.com/co-cart',
        features: ['same-day', 'drive-up', 'circle-rewards'],
        stores: ['Target', 'Target Express']
    },
    
    kroger: {
        id: 'kroger',
        name: 'Kroger Delivery',
        icon: '🥬',
        regions: ['US'],
        website: 'https://www.kroger.com/delivery',
        cartUrl: 'https://www.kroger.com/cart',
        features: ['boost-savings', 'fuel-points', 'digital-coupons'],
        stores: ['Kroger', 'Fred Meyer', 'Ralphs', 'King Soopers']
    }
};

// Store availability by ZIP code (mock database)
const STORE_AVAILABILITY = new Map();

// Ingredient to store search term mappings
const SEARCH_MAPPINGS = {
    // Proteins
    'chicken breast': 'boneless skinless chicken breast',
    'chicken thighs': 'chicken thighs bone-in',
    'ground beef': 'ground beef 80/20',
    'salmon': 'fresh atlantic salmon fillet',
    'eggs': 'large eggs dozen',
    
    // Dairy
    'milk': 'whole milk gallon',
    'butter': 'unsalted butter 1lb',
    'cheese': 'shredded cheddar cheese',
    'yogurt': 'greek yogurt plain',
    
    // Produce
    'onion': 'yellow onion',
    'garlic': 'garlic bulb',
    'potatoes': 'russet potatoes',
    'tomatoes': 'roma tomatoes',
    'lettuce': 'romaine lettuce hearts',
    'carrots': 'baby carrots',
    
    // Grains
    'rice': 'long grain white rice',
    'pasta': 'spaghetti pasta',
    'bread': 'sliced sandwich bread',
    'tortillas': 'flour tortillas',
    
    // Pantry
    'olive oil': 'extra virgin olive oil',
    'soy sauce': 'low sodium soy sauce',
    'spices': 'ground black pepper',
    'sugar': 'granulated sugar',
    'flour': 'all-purpose flour'
};

class GroceryDeliveryIntegration {
    constructor() {
        this.preferredProvider = null;
        this.preferredStore = null;
        this.zipCode = null;
        this.storageKey = 'grocery-delivery-preferences';
        this.listeners = [];
    }

    /**
     * Load saved preferences from IndexedDB
     */
    async loadPreferences() {
        await db.ready;
        
        const stored = await db.get('preferences', this.storageKey);
        
        if (stored && stored.value) {
            this.preferredProvider = stored.value.provider || null;
            this.preferredStore = stored.value.store || null;
            this.zipCode = stored.value.zipCode || null;
        }
        
        console.log('[GroceryDelivery] Loaded preferences:', {
            provider: this.preferredProvider,
            store: this.preferredStore,
            zipCode: this.zipCode
        });
        
        return this.getPreferences();
    }

    /**
     * Save preferences to IndexedDB
     */
    async savePreferences() {
        await db.ready;
        
        await db.put('preferences', {
            key: this.storageKey,
            value: {
                provider: this.preferredProvider,
                store: this.preferredStore,
                zipCode: this.zipCode
            },
            updatedAt: Date.now()
        });
        
        this.notifyListeners();
    }

    /**
     * Get current preferences
     */
    getPreferences() {
        return {
            provider: this.preferredProvider,
            store: this.preferredStore,
            zipCode: this.zipCode,
            providerDetails: this.preferredProvider ? PROVIDERS[this.preferredProvider] : null
        };
    }

    /**
     * Set preferred provider
     */
    async setProvider(providerId) {
        if (providerId && !PROVIDERS[providerId]) {
            throw new Error(`Unknown provider: ${providerId}`);
        }
        
        this.preferredProvider = providerId;
        await this.savePreferences();
        return this.getPreferences();
    }

    /**
     * Set preferred store within provider
     */
    async setStore(storeName) {
        this.preferredStore = storeName;
        await this.savePreferences();
        return this.getPreferences();
    }

    /**
     * Set ZIP code for availability check
     */
    async setZipCode(zip) {
        // Basic US ZIP validation (5 digits)
        if (!/^\d{5}(-\d{4})?$/.test(zip)) {
            throw new Error('Invalid ZIP code format');
        }
        
        this.zipCode = zip;
        await this.savePreferences();
        
        // Refresh availability
        await this.checkAvailability(zip);
        
        return this.getPreferences();
    }

    /**
     * Get all available providers
     */
    getProviders() {
        return Object.values(PROVIDERS);
    }

    /**
     * Get provider by ID
     */
    getProvider(id) {
        return PROVIDERS[id] || null;
    }

    /**
     * Check which providers are available for a ZIP code
     * (In real implementation, this would call APIs)
     */
    async checkAvailability(zip) {
        // Simulated availability check
        // In production, this would make API calls to each provider
        
        const mockAvailability = {
            instacart: true,
            amazonFresh: zip.startsWith('9') || zip.startsWith('1'), // Major metros
            walmart: true,
            target: true,
            kroger: ['40202', '45202', '30309'].includes(zip) // Kroger regions
        };
        
        STORE_AVAILABILITY.set(zip, mockAvailability);
        
        return Object.entries(mockAvailability)
            .filter(([_, available]) => available)
            .map(([id]) => PROVIDERS[id]);
    }

    /**
     * Convert shopping list to provider-specific format
     */
    formatShoppingList(shoppingList, providerId = this.preferredProvider) {
        if (!providerId) {
            return this.formatGenericList(shoppingList);
        }
        
        const provider = PROVIDERS[providerId];
        
        return {
            provider: provider.name,
            items: shoppingList.map(item => this.formatItem(item, providerId)),
            totalItems: shoppingList.length,
            directUrl: this.generateCartUrl(shoppingList, providerId),
            manualInstructions: this.generateManualInstructions(shoppingList, provider)
        };
    }

    /**
     * Format single item for provider
     */
    formatItem(item, providerId) {
        const searchTerm = this.getSearchTerm(item.name);
        
        const formatted = {
            originalName: item.name,
            searchTerm: searchTerm,
            quantity: item.quantity || 1,
            unit: item.unit || 'piece',
            estimatedPrice: this.estimatePrice(item),
            category: item.category || this.guessCategory(item.name)
        };
        
        // Provider-specific formatting
        switch (providerId) {
            case 'instacart':
                formatted.instacartUrl = `https://www.instacart.com/store/items/search?q=${encodeURIComponent(searchTerm)}`;
                break;
            case 'amazonFresh':
                formatted.amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}&i=amazonfresh`;
                break;
            case 'walmart':
                formatted.walmartUrl = `https://www.walmart.com/search?q=${encodeURIComponent(searchTerm)}`;
                break;
        }
        
        return formatted;
    }

    /**
     * Get optimized search term for an ingredient
     */
    getSearchTerm(ingredient) {
        const name_lower = ingredient.toLowerCase().trim();
        
        // Direct mapping
        if (SEARCH_MAPPINGS[name_lower]) {
            return SEARCH_MAPPINGS[name_lower];
        }
        
        // Partial match
        for (const [key, term] of Object.entries(SEARCH_MAPPINGS)) {
            if (name_lower.includes(key) || key.includes(name_lower)) {
                return term;
            }
        }
        
        // Fallback: clean up the name
        return name_lower
            .replace(/\d+\s*(cup|tbsp|tsp|lb|oz|g|kg|ml|l)\s*/gi, '')
            .replace(/\b(fresh|organic|local)\b/gi, '')
            .trim();
    }

    /**
     * Estimate price for an ingredient
     */
    estimatePrice(item) {
        const categoryPrices = {
            'meat': 8.00,
            'poultry': 6.00,
            'dairy': 4.00,
            'produce': 3.00,
            'grains': 3.50,
            'pantry': 2.50,
            'spices': 1.50,
            'other': 3.00
        };
        
        const category = item.category || this.guessCategory(item.name);
        const basePrice = categoryPrices[category] || 3.00;
        const quantity = item.quantity || 1;
        
        return Math.round(basePrice * quantity * 100) / 100;
    }

    /**
     * Guess ingredient category
     */
    guessCategory(name) {
        const name_lower = name.toLowerCase();
        
        if (/chicken|beef|pork|lamb|turkey/.test(name_lower)) return 'meat';
        if (/salmon|tuna|shrimp|fish/.test(name_lower)) return 'meat';
        if (/milk|cheese|butter|cream|yogurt/.test(name_lower)) return 'dairy';
        if (/apple|banana|orange|lettuce|tomato|carrot|onion/.test(name_lower)) return 'produce';
        if (/rice|pasta|bread|flour|oats|cereal/.test(name_lower)) return 'grains';
        if (/oil|vinegar|sauce|spice|herb|seasoning/.test(name_lower)) return 'pantry';
        if (/salt|pepper|cumin|paprika|oregano/.test(name_lower)) return 'spices';
        
        return 'other';
    }

    /**
     * Generate generic shopping list (no provider selected)
     */
    formatGenericList(shoppingList) {
        return {
            provider: 'Generic List',
            items: shoppingList.map(item => ({
                originalName: item.name,
                searchTerm: this.getSearchTerm(item.name),
                quantity: item.quantity || 1,
                unit: item.unit || 'piece',
                estimatedPrice: this.estimatePrice(item),
                category: item.category || this.guessCategory(item.name)
            })),
            totalItems: shoppingList.length,
            estimatedTotal: shoppingList.reduce((sum, item) => 
                sum + this.estimatePrice(item), 0
            ),
            exportFormats: {
                csv: this.exportToCSV(shoppingList),
                text: this.exportToText(shoppingList),
                json: JSON.stringify(shoppingList, null, 2)
            },
            providerOptions: this.getProviders()
        };
    }

    /**
     * Generate direct cart URL (if provider supports it)
     */
    generateCartUrl(shoppingList, providerId) {
        const provider = PROVIDERS[providerId];
        if (!provider) return null;
        
        // Most providers don't support direct cart population via URL
        // But we can generate search URLs for quick access
        const searchTerms = shoppingList
            .slice(0, 3) // First 3 items
            .map(item => this.getSearchTerm(item.name))
            .join(', ');
        
        return `${provider.cartUrl}?q=${encodeURIComponent(searchTerms)}`;
    }

    /**
     * Generate manual instructions for provider
     */
    generateManualInstructions(shoppingList, provider) {
        return {
            intro: `To order from ${provider.name}:`,
            steps: [
                `Visit ${provider.website}`,
                'Search for each item using the "Search Term" below',
                'Add items to cart',
                'Select delivery time at checkout'
            ],
            tips: [
                'Use the search terms for best results',
                'Check "Substitutions OK" for out-of-stock items',
                'Add delivery instructions if you have preferences'
            ],
            estimatedTime: `${Math.ceil(shoppingList.length / 5)} minutes`,
            estimatedDeliveryFee: '$0-10 depending on order size'
        };
    }

    /**
     * Compare prices across providers for a shopping list
     */
    comparePrices(shoppingList) {
        const providers = this.getProviders();
        
        const comparisons = providers.map(provider => {
            const formatted = this.formatShoppingList(shoppingList, provider.id);
            const estimatedTotal = formatted.items.reduce((sum, item) => 
                sum + (item.estimatedPrice || 0), 0
            );
            
            return {
                provider: provider.name,
                providerId: provider.id,
                icon: provider.icon,
                estimatedTotal: Math.round(estimatedTotal * 100) / 100,
                itemCount: formatted.items.length,
                features: provider.features,
                available: this.isProviderAvailable(provider.id),
                formattedList: formatted
            };
        });
        
        // Sort by estimated total
        comparisons.sort((a, b) => a.estimatedTotal - b.estimatedTotal);
        
        return {
            cheapest: comparisons[0],
            all: comparisons,
            savings: comparisons.length > 1 ? 
                Math.round((comparisons[comparisons.length - 1].estimatedTotal - comparisons[0].estimatedTotal) * 100) / 100 : 
                0
        };
    }

    /**
     * Check if provider is available for user's ZIP
     */
    isProviderAvailable(providerId) {
        if (!this.zipCode) return true; // Unknown = assume available
        
        const availability = STORE_AVAILABILITY.get(this.zipCode);
        if (!availability) return true;
        
        return availability[providerId] !== false;
    }

    /**
     * Export to CSV
     */
    exportToCSV(shoppingList) {
        const headers = ['Item', 'Quantity', 'Unit', 'Search Term', 'Estimated Price', 'Category'];
        
        const rows = shoppingList.map(item => [
            item.name,
            item.quantity || 1,
            item.unit || 'piece',
            this.getSearchTerm(item.name),
            this.estimatePrice(item),
            item.category || this.guessCategory(item.name)
        ]);
        
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    /**
     * Export to plain text
     */
    exportToText(shoppingList) {
        const lines = ['🛒 Shopping List', ''];
        
        // Group by category
        const byCategory = {};
        shoppingList.forEach(item => {
            const cat = item.category || this.guessCategory(item.name);
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(item);
        });
        
        Object.entries(byCategory).forEach(([category, items]) => {
            lines.push(`📦 ${category.toUpperCase()}`);
            items.forEach(item => {
                lines.push(`  ☐ ${item.name} (${item.quantity || 1} ${item.unit || 'pc'})`);
            });
            lines.push('');
        });
        
        return lines.join('\n');
    }

    /**
     * Quick order with preferred provider
     */
    async quickOrder(shoppingList) {
        if (!this.preferredProvider) {
            return {
                success: false,
                error: 'No preferred provider set. Please select a provider first.',
                availableProviders: this.getProviders()
            };
        }
        
        const formatted = this.formatShoppingList(shoppingList, this.preferredProvider);
        
        return {
            success: true,
            provider: PROVIDERS[this.preferredProvider],
            formattedList: formatted,
            nextSteps: [
                'Review the formatted list',
                'Click the direct URL (if available)',
                'Or manually search using the provided terms'
            ]
        };
    }

    /**
     * Subscribe to preference changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.getPreferences()));
    }
}

const groceryDelivery = new GroceryDeliveryIntegration();
export default groceryDelivery;
export { GroceryDeliveryIntegration, PROVIDERS, SEARCH_MAPPINGS };
