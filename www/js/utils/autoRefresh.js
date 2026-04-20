/**
 * Auto Refresh Manager
 * Handles automatic UI refresh when data changes
 */

export class AutoRefreshManager {
    constructor() {
        this.listeners = new Map();
        this.refreshInterval = 1000; // 1 second debounce
        this.pendingRefresh = false;
    }
    
    /**
     * Register a listener for data changes
     * @param {string} key - Data key to listen for
     * @param {Function} callback - Callback function
     */
    on(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
    }
    
    /**
     * Unregister a listener
     * @param {string} key - Data key
     * @param {Function} callback - Callback function
     */
    off(key, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);
        }
    }
    
    /**
     * Trigger refresh for a specific data key
     * @param {string} key - Data key that changed
     * @param {*} data - New data
     */
    trigger(key, data) {
        if (this.listeners.has(key)) {
            const callbacks = this.listeners.get(key);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[AutoRefresh] Error in callback for ${key}:`, error);
                }
            });
        }
    }
    
    /**
     * Trigger refresh with debounce
     * @param {string} key - Data key that changed
     * @param {*} data - New data
     */
    triggerDebounced(key, data) {
        if (this.pendingRefresh) return;
        
        this.pendingRefresh = true;
        setTimeout(() => {
            this.trigger(key, data);
            this.pendingRefresh = false;
        }, this.refreshInterval);
    }
    
    /**
     * Setup IndexedDB change notifications
     * @param {Object} db - IndexedDB instance
     */
    setupIndexedDBNotifications(db) {
        // Override put/delete methods to trigger refreshes
        const originalPut = db.put.bind(db);
        db.put = async (storeName, item) => {
            const result = await originalPut(storeName, item);
            this.triggerDebounced(storeName, item);
            return result;
        };
        
        const originalDelete = db.delete.bind(db);
        db.delete = async (storeName, key) => {
            const result = await originalDelete(storeName, key);
            this.triggerDebounced(storeName, { key, deleted: true });
            return result;
        };
    }
    
    /**
     * Setup custom event-based refresh
     */
    setupCustomEvents() {
        // Listen for custom events from other modules
        window.addEventListener('pantry-updated', (event) => {
            this.trigger('pantry', event.detail);
        });
        
        window.addEventListener('meal-plan-updated', (event) => {
            this.trigger('mealPlan', event.detail);
        });
        
        window.addEventListener('preferences-updated', (event) => {
            this.trigger('preferences', event.detail);
        });
        
        window.addEventListener('meal-logged', (event) => {
            this.trigger('nutritionLog', event.detail);
        });
    }
    
    /**
     * Helper to dispatch custom event
     * @param {string} eventName - Event name
     * @param {*} detail - Event detail
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }
    
    /**
     * Setup periodic refresh for specific keys
     * @param {string} key - Data key
     * @param {Function} fetchFn - Function to fetch fresh data
     * @param {number} interval - Refresh interval in ms
     */
    setupPeriodicRefresh(key, fetchFn, interval = 60000) {
        setInterval(async () => {
            try {
                const data = await fetchFn();
                this.trigger(key, data);
            } catch (error) {
                console.error(`[AutoRefresh] Periodic refresh failed for ${key}:`, error);
            }
        }, interval);
    }
    
    /**
     * Clear all listeners for a key
     * @param {string} key - Data key
     */
    clear(key) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).clear();
        }
    }
    
    /**
     * Clear all listeners
     */
    clearAll() {
        this.listeners.clear();
    }
}

// Global auto-refresh manager instance
let globalAutoRefreshManager = null;

/**
 * Get or create the global auto-refresh manager
 * @returns {AutoRefreshManager}
 */
export function getAutoRefreshManager() {
    if (!globalAutoRefreshManager) {
        globalAutoRefreshManager = new AutoRefreshManager();
        globalAutoRefreshManager.setupCustomEvents();
    }
    return globalAutoRefreshManager;
}

/**
 * Helper to trigger pantry update
 * @param {Array} pantry - Pantry data
 */
export function triggerPantryUpdate(pantry) {
    const manager = getAutoRefreshManager();
    manager.dispatchEvent('pantry-updated', pantry);
}

/**
 * Helper to trigger meal plan update
 * @param {Object} mealPlan - Meal plan data
 */
export function triggerMealPlanUpdate(mealPlan) {
    const manager = getAutoRefreshManager();
    manager.dispatchEvent('meal-plan-updated', mealPlan);
}

/**
 * Helper to trigger preferences update
 * @param {Object} preferences - Preferences data
 */
export function triggerPreferencesUpdate(preferences) {
    const manager = getAutoRefreshManager();
    manager.dispatchEvent('preferences-updated', preferences);
}

/**
 * Helper to trigger meal logged event
 * @param {Object} mealData - Meal data
 */
export function triggerMealLogged(mealData) {
    const manager = getAutoRefreshManager();
    manager.dispatchEvent('meal-logged', mealData);
}
