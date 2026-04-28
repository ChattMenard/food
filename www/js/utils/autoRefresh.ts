// @ts-check
/**
 * Auto Refresh Manager
 * Handles automatic UI refresh when data changes
 */

class ListenerMap extends Map<string, Set<Function>> {
  override get(key: string): Set<Function> {
    let v = super.get(key);
    if (!v) {
      v = new Set<Function>();
      super.set(key, v);
    }
    return v;
  }
}

export class AutoRefreshManager {
  public listeners: ListenerMap;
  public refreshInterval: number;
  public pendingRefresh: boolean;

  constructor() {
    this.listeners = new ListenerMap();
    this.refreshInterval = 1000; // 1 second debounce
    this.pendingRefresh = false;
  }

  // Expose properties for testing
  get listenersData(): Map<string, Set<Function>> {
    return this.listeners;
  }

  get refreshIntervalValue(): number {
    return this.refreshInterval;
  }

  get pendingRefreshValue(): boolean {
    return this.pendingRefresh;
  }

  /**
   * Register a listener for data changes
   * @param {string} key - Data key to listen for
   * @param {Function} callback - Callback function
   */
  on(key: string, callback: Function): void {
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
  off(key: string, callback: Function): void {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
    }
  }

  /**
   * Trigger refresh for a specific data key
   * @param {string} key - Data key that changed
   * @param {*} data - New data
   */
  trigger(key: string, data: any): void {
    if (this.listeners.has(key)) {
      const callbacks = this.listeners.get(key);
      callbacks.forEach((callback) => {
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
  triggerDebounced(key: string, data: any): void {
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
  setupIndexedDBNotifications(db: any): void {
    // Override put/delete methods to trigger refreshes
    const originalPut = db.put.bind(db);
    db.put = async (storeName: string, item: any) => {
      const result = await originalPut(storeName, item);
      this.triggerDebounced(storeName, item);
      return result;
    };

    const originalDelete = db.delete.bind(db);
    db.delete = async (storeName: string, key: any) => {
      const result = await originalDelete(storeName, key);
      this.triggerDebounced(storeName, { key, deleted: true });
      return result;
    };
  }

  /**
   * Setup custom event-based refresh
   */
  setupCustomEvents(): void {
    // Listen for custom events from other modules
    window.addEventListener('pantry-updated', (event) => {
      this.trigger('pantry', (event as CustomEvent).detail);
    });

    window.addEventListener('meal-plan-updated', (event) => {
      this.trigger('mealPlan', (event as CustomEvent).detail);
    });

    window.addEventListener('preferences-updated', (event) => {
      this.trigger('preferences', (event as CustomEvent).detail);
    });

    window.addEventListener('meal-logged', (event) => {
      this.trigger('nutritionLog', (event as CustomEvent).detail);
    });
  }

  /**
   * Helper to dispatch custom event
   * @param {string} eventName - Event name
   * @param {*} detail - Event detail
   */
  dispatchEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Setup periodic refresh for specific keys
   * @param {string} key - Data key
   * @param {Function} fetchFn - Function to fetch fresh data
   * @param {number} interval - Refresh interval in ms
   */
  setupPeriodicRefresh(key: string, fetchFn: () => Promise<any>, interval: number = 60000): void {
    setInterval(async () => {
      try {
        const data = await fetchFn();
        this.trigger(key, data);
      } catch (error) {
        console.error(
          `[AutoRefresh] Periodic refresh failed for ${key}:`,
          error
        );
      }
    }, interval);
  }

  /**
   * Clear all listeners for a key
   * @param {string} key - Data key
   */
  clear(key: string): void {
    if (this.listeners.has(key)) {
      this.listeners.get(key).clear();
    }
  }

  /**
   * Clear all listeners
   */
  clearAll(): void {
    this.listeners.clear();
  }
}

// Global auto-refresh manager instance
let globalAutoRefreshManager: AutoRefreshManager | null = null;

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
export function triggerPantryUpdate(pantry: any[]): void {
  const manager = getAutoRefreshManager();
  manager.dispatchEvent('pantry-updated', pantry);
}

/**
 * Helper to trigger meal plan update
 * @param {Object} mealPlan - Meal plan data
 */
export function triggerMealPlanUpdate(mealPlan: any): void {
  const manager = getAutoRefreshManager();
  manager.dispatchEvent('meal-plan-updated', mealPlan);
}

/**
 * Helper to trigger preferences update
 * @param {Object} preferences - Preferences data
 */
export function triggerPreferencesUpdate(preferences: any): void {
  const manager = getAutoRefreshManager();
  manager.dispatchEvent('preferences-updated', preferences);
}

/**
 * Helper to trigger meal logged event
 * @param {Object} mealData - Meal data
 */
export function triggerMealLogged(mealData: any): void {
  const manager = getAutoRefreshManager();
  manager.dispatchEvent('meal-logged', mealData);
}
