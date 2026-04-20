/**
 * Analytics Module
 * Integrates with PostHog/Plausible for user analytics
 */

// Placeholder for analytics integration
// In production, replace with actual PostHog or Plausible SDK
export class Analytics {
    constructor() {
        this.enabled = false;
        this.apiKey = '';
        this.apiHost = '';
        this.userId = null;
        this.userProperties = {};
    }
    
    /**
     * Initialize analytics
     * @param {Object} config - Configuration object
     */
    init(config = {}) {
        this.apiKey = config.apiKey || '';
        this.apiHost = config.apiHost || '';
        this.enabled = !!this.apiKey;
        
        if (this.enabled) {
            // Initialize PostHog/Plausible here
            // posthog.init(this.apiKey, {
            //     api_host: this.apiHost,
            //     loaded: (ph) => { this.client = ph; }
            // });
            
            this.loadUserId();
            console.log('[Analytics] Initialized');
        } else {
            console.log('[Analytics] Disabled (no API key provided)');
        }
    }
    
    /**
     * Load user ID from localStorage
     */
    loadUserId() {
        this.userId = localStorage.getItem('analytics-user-id');
        
        if (!this.userId) {
            this.userId = this.generateUserId();
            localStorage.setItem('analytics-user-id', this.userId);
        }
    }
    
    /**
     * Generate a random user ID
     * @returns {string} User ID
     */
    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Identify user
     * @param {string} userId - User ID
     * @param {Object} properties - User properties
     */
    identify(userId, properties = {}) {
        this.userId = userId || this.userId;
        this.userProperties = { ...this.userProperties, ...properties };
        
        if (this.enabled) {
            // this.client.identify(this.userId, this.userProperties);
        }
        
        console.log('[Analytics] Identified:', this.userId, this.userProperties);
    }
    
    /**
     * Track an event
     * @param {string} eventName - Event name
     * @param {Object} properties - Event properties
     */
    track(eventName, properties = {}) {
        if (!this.enabled) {
            console.log('[Analytics] Track:', eventName, properties);
            return;
        }
        
        // this.client.capture(eventName, {
        //     ...properties,
        //     distinct_id: this.userId
        // });
        
        console.log('[Analytics] Track:', eventName, properties);
    }
    
    /**
     * Track page view
     * @param {string} path - Page path
     */
    pageView(path = window.location.pathname) {
        this.track('page_view', {
            path,
            url: window.location.href,
            title: document.title
        });
    }
    
    /**
     * Track pantry item added
     * @param {Object} item - Pantry item
     */
    trackPantryItemAdded(item) {
        this.track('pantry_item_added', {
            item_name: item.name,
            category: item.category,
            quantity: item.quantity
        });
    }
    
    /**
     * Track meal planned
     * @param {Object} meal - Meal object
     */
    trackMealPlanned(meal) {
        this.track('meal_planned', {
            recipe_id: meal.recipeId,
            recipe_name: meal.recipeName,
            date: meal.date,
            meal_type: meal.mealType
        });
    }
    
    /**
     * Track recipe viewed
     * @param {number} recipeId - Recipe ID
     * @param {string} recipeName - Recipe name
     */
    trackRecipeViewed(recipeId, recipeName) {
        this.track('recipe_viewed', {
            recipe_id: recipeId,
            recipe_name: recipeName
        });
    }
    
    /**
     * Track recipe cooked
     * @param {number} recipeId - Recipe ID
     * @param {string} recipeName - Recipe name
     */
    trackRecipeCooked(recipeId, recipeName) {
        this.track('recipe_cooked', {
            recipe_id: recipeId,
            recipe_name: recipeName
        });
    }
    
    /**
     * Track shopping list created
     * @param {number} itemCount - Number of items
     */
    trackShoppingListCreated(itemCount) {
        this.track('shopping_list_created', {
            item_count: itemCount
        });
    }
    
    /**
     * Track AI suggestion used
     * @param {string} suggestionType - Type of suggestion
     */
    trackAISuggestionUsed(suggestionType) {
        this.track('ai_suggestion_used', {
            suggestion_type: suggestionType
        });
    }
    
    /**
     * Track search performed
     * @param {string} query - Search query
     * @param {number} resultCount - Number of results
     */
    trackSearch(query, resultCount) {
        this.track('search_performed', {
            query,
            result_count: resultCount
        });
    }
    
    /**
     * Track filter applied
     * @param {string} filterType - Filter type
     * @param {string} filterValue - Filter value
     */
    trackFilterApplied(filterType, filterValue) {
        this.track('filter_applied', {
            filter_type: filterType,
            filter_value: filterValue
        });
    }
    
    /**
     * Set user property
     * @param {string} key - Property key
     * @param {*} value - Property value
     */
    setUserProperty(key, value) {
        this.userProperties[key] = value;
        
        if (this.enabled) {
            // this.client.people.set({ [key]: value });
        }
    }
    
    /**
     * Increment user property
     * @param {string} key - Property key
     * @param {number} value - Increment value
     */
    incrementUserProperty(key, value = 1) {
        const current = this.userProperties[key] || 0;
        this.userProperties[key] = current + value;
        
        if (this.enabled) {
            // this.client.people.increment({ [key]: value });
        }
    }
    
    /**
     * Reset analytics (for logout)
     */
    reset() {
        this.userId = null;
        this.userProperties = {};
        localStorage.removeItem('analytics-user-id');
        
        if (this.enabled) {
            // this.client.reset();
        }
        
        console.log('[Analytics] Reset');
    }
    
    /**
     * Flush pending events
     */
    flush() {
        if (this.enabled) {
            // this.client.flush();
        }
    }
}

// Global analytics instance
let globalAnalytics = null;

/**
 * Get or create the global analytics instance
 * @returns {Analytics}
 */
export function getAnalytics() {
    if (!globalAnalytics) {
        globalAnalytics = new Analytics();
    }
    return globalAnalytics;
}

/**
 * Initialize analytics
 * @param {Object} config - Configuration
 */
export function initAnalytics(config) {
    const analytics = getAnalytics();
    analytics.init(config);
}
