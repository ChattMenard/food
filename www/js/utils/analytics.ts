// @ts-check
/**
 * Analytics Module
 * Integrates with PostHog/Plausible for user analytics
 */

// Placeholder for analytics integration
// In production, replace with actual PostHog or Plausible SDK
export class Analytics {
  private enabled: boolean;
  private apiKey: string;
  private apiHost: string;
  private userId: string | null;
  private userProperties: Record<string, any>;

  constructor() {
    this.enabled = false;
    this.apiKey = '';
    this.apiHost = '';
    this.userId = null;
    this.userProperties = {};
  }

  // Expose properties for testing
  get isEnabled(): boolean {
    return this.enabled;
  }

  get apiKeyValue(): string {
    return this.apiKey;
  }

  get apiHostValue(): string {
    return this.apiHost;
  }

  get userIdValue(): string | null {
    return this.userId;
  }

  get userPropertiesValue(): Record<string, any> {
    return this.userProperties;
  }

  /**
   * Initialize analytics
   * @param {Object} config - Configuration object
   */
  init(config: any = {}) {
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
  generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Identify user
   * @param {string} userId - User ID
   * @param {Object} properties - User properties
   */
  identify(userId: string, properties: Record<string, any> = {}) {
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
  track(eventName: string, properties: Record<string, any> = {}) {
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
  pageView(path: string = window.location.pathname) {
    this.track('page_view', {
      path,
      url: window.location.href,
      title: document.title,
    });
  }

  /**
   * Track pantry item added
   * @param {Object} item - Pantry item
   */
  trackPantryItemAdded(item: { name: string; category: string; quantity: number }) {
    this.track('pantry_item_added', {
      item_name: item.name,
      category: item.category,
      quantity: item.quantity,
    });
  }

  /**
   * Track meal planned
   * @param {Object} meal - Meal object
   */
  trackMealPlanned(meal: { recipeId: number; recipeName: string; date: string; mealType: string }) {
    this.track('meal_planned', {
      recipe_id: meal.recipeId,
      recipe_name: meal.recipeName,
      date: meal.date,
      meal_type: meal.mealType,
    });
  }

  /**
   * Track recipe viewed
   * @param {number} recipeId - Recipe ID
   * @param {string} recipeName - Recipe name
   */
  trackRecipeViewed(recipeId: number, recipeName: string) {
    this.track('recipe_viewed', {
      recipe_id: recipeId,
      recipe_name: recipeName,
    });
  }

  /**
   * Track recipe cooked
   * @param {number} recipeId - Recipe ID
   * @param {string} recipeName - Recipe name
   */
  trackRecipeCooked(recipeId: number, recipeName: string) {
    this.track('recipe_cooked', {
      recipe_id: recipeId,
      recipe_name: recipeName,
    });
  }

  /**
   * Track shopping list created
   * @param {number} itemCount - Number of items
   */
  trackShoppingListCreated(itemCount: number) {
    this.track('shopping_list_created', {
      item_count: itemCount,
    });
  }

  /**
   * Track AI suggestion used
   * @param {string} suggestionType - Type of suggestion
   */
  trackAISuggestionUsed(suggestionType: string) {
    this.track('ai_suggestion_used', {
      suggestion_type: suggestionType,
    });
  }

  /**
   * Track search performed
   * @param {string} query - Search query
   * @param {number} resultCount - Number of results
   */
  trackSearch(query: string, resultCount: number) {
    this.track('search_performed', {
      query,
      result_count: resultCount,
    });
  }

  /**
   * Track filter applied
   * @param {string} filterType - Filter type
   * @param {string} filterValue - Filter value
   */
  trackFilterApplied(filterType: string, filterValue: string) {
    this.track('filter_applied', {
      filter_type: filterType,
      filter_value: filterValue,
    });
  }

  /**
   * Set user property
   * @param {string} key - Property key
   * @param {*} value - Property value
   */
  setUserProperty(key: string, value: any) {
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
  incrementUserProperty(key: string, value: number = 1): void {
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
let globalAnalytics: Analytics | null = null;

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
export function initAnalytics(config: any) {
  const analytics = getAnalytics();
  analytics.init(config);
}
