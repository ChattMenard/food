// @ts-check
/**
 * Background Sync Manager
 * Handles background synchronization of meal plans and data
 */

// Extend ServiceWorkerRegistration interface for periodicSync
declare global {
  interface ServiceWorkerRegistration {
    periodicSync?: {
      register(tag: string): Promise<void>;
    };
  }
}

export class BackgroundSyncManager {
  private syncQueue: any[] = [];
  private isSyncing: boolean = false;
  private storageKey: string = 'ftf-sync-queue';
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadSyncQueue();
    this.setupSyncListeners();
  }

  // Expose syncQueue for testing purposes
  get syncQueueData(): any[] {
    return this.syncQueue;
  }

  /**
   * Load sync queue from localStorage
   */
  loadSyncQueue(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.syncQueue = JSON.parse(saved);
        console.log(
          `[Sync] Loaded ${this.syncQueue.length} pending sync operations`
        );
      }
    } catch (error) {
      console.error('[Sync] Failed to load queue:', error);
    }
  }

  /**
   * Save sync queue to localStorage
   */
  saveSyncQueue(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('[Sync] Failed to save queue:', error);
    }
  }

  /**
   * Setup sync event listeners
   */
  setupSyncListeners(): void {
    // Sync when coming back online
    window.addEventListener('online', () => {
      console.log('[Sync] Connection restored, triggering sync');
      this.syncAll();
    });

    // Sync when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        console.log('[Sync] Page visible, triggering sync');
        this.syncAll();
      }
    });

    // Register for periodic background sync if supported
    if (
      'serviceWorker' in navigator &&
      'periodicSync' in ServiceWorkerRegistration.prototype
    ) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.periodicSync) {
          registration.periodicSync
            .register('meal-plan-sync')
            .catch((err) => {
              console.log('[Sync] Periodic sync not supported:', err);
            });
        }
      });
    }
  }

  /**
   * Queue a sync operation
   * @param {string} type - Sync operation type
   * @param {Object} data - Data to sync
   */
  queueSync(type: string, data: any): void {
    const syncItem = {
      id: Date.now() + Math.random(),
      type,
      data,
      timestamp: Date.now(),
      attempts: 0,
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();

    console.log(`[Sync] Queued ${type} operation`);

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncAll();
    }
  }

  /**
   * Sync meal plan changes
   * @param {Object} mealPlan - Meal plan to sync
   */
  syncMealPlan(mealPlan: any): void {
    this.queueSync('mealPlan', mealPlan);
  }

  /**
   * Sync pantry changes
   * @param {Array} pantry - Pantry items to sync
   */
  syncPantry(pantry: any): void {
    this.queueSync('pantry', pantry);
  }

  /**
   * Sync preferences
   * @param {Object} preferences - Preferences to sync
   */
  syncPreferences(preferences: any): void {
    this.queueSync('preferences', preferences);
  }

  /**
   * Process all pending sync operations
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    console.log(
      `[Sync] Processing ${this.syncQueue.length} pending operations`
    );

    const successful: any[] = [];
    const failed: any[] = [];

    for (const item of this.syncQueue) {
      try {
        await this.processSyncItem(item);
        successful.push(item);
        console.log(`[Sync] Synced ${item.type} operation`);
      } catch (error) {
        item.attempts++;
        console.warn(
          `[Sync] Failed to sync ${item.type} (attempt ${item.attempts}):`,
          error
        );

        // Keep in queue if less than max attempts
        if (item.attempts < 5) {
          failed.push(item);
        }
      }
    }

    this.syncQueue = failed;
    this.saveSyncQueue();
    this.isSyncing = false;

    if (successful.length > 0) {
      this.notifySyncComplete(successful.length);
    }
  }

  /**
   * Process a single sync item
   * @param {Object} item - Sync item to process
   */
  async processSyncItem(item: any): Promise<boolean> {
    switch (item.type) {
      case 'mealPlan':
        return this.syncMealPlanToServer(item.data);
      case 'pantry':
        return this.syncPantryToServer(item.data);
      case 'preferences':
        return this.syncPreferencesToServer(item.data);
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  /**
   * Sync meal plan to server
   * @param {Object} mealPlan - Meal plan data
   */
  async syncMealPlanToServer(mealPlan: any): Promise<boolean> {
    try {
      // Store locally for now, sync to server when available
      localStorage.setItem('meal_plan_backup', JSON.stringify({
        data: mealPlan,
        timestamp: Date.now(),
        sync_status: 'pending'
      }));
      
      // Attempt server sync if analytics is enabled
      if (window.analyticsManager && window.analyticsManager.isEnabled) {
        const response = await fetch('/api/sync/meal-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            meal_plan: mealPlan,
            user_id: window.analyticsManager.userId,
            timestamp: Date.now()
          })
        });
        
        if (response.ok) {
          // Update sync status
          const backup = JSON.parse(localStorage.getItem('meal_plan_backup') || '{}');
          backup.sync_status = 'completed';
          backup.last_sync = Date.now();
          localStorage.setItem('meal_plan_backup', JSON.stringify(backup));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to sync meal plan to server:', error);
      // Keep local backup
      return false;
    }
  }

  /**
   * Sync pantry to server
   * @param {Array} pantry - Pantry data
   */
  async syncPantryToServer(pantry: any): Promise<boolean> {
    try {
      // Store locally for now, sync to server when available
      localStorage.setItem('pantry_backup', JSON.stringify({
        data: pantry,
        timestamp: Date.now(),
        sync_status: 'pending'
      }));
      
      // Attempt server sync if analytics is enabled
      if (window.analyticsManager && window.analyticsManager.isEnabled) {
        const response = await fetch('/api/sync/pantry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pantry: pantry,
            user_id: window.analyticsManager.userId,
            timestamp: Date.now()
          })
        });
        
        if (response.ok) {
          // Update sync status
          const backup = JSON.parse(localStorage.getItem('pantry_backup') || '{}');
          backup.sync_status = 'completed';
          backup.last_sync = Date.now();
          localStorage.setItem('pantry_backup', JSON.stringify(backup));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to sync pantry to server:', error);
      // Keep local backup
      return false;
    }
  }

  /**
   * Sync preferences to server
   * @param {Object} preferences - Preferences data
   */
  async syncPreferencesToServer(preferences: any): Promise<boolean> {
    try {
      // Store locally for now, sync to server when available
      localStorage.setItem('preferences_backup', JSON.stringify({
        data: preferences,
        timestamp: Date.now(),
        sync_status: 'pending'
      }));
      
      // Attempt server sync if analytics is enabled
      if (window.analyticsManager && window.analyticsManager.isEnabled) {
        const response = await fetch('/api/sync/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            preferences: preferences,
            user_id: window.analyticsManager.userId,
            timestamp: Date.now()
          })
        });
        
        if (response.ok) {
          // Update sync status
          const backup = JSON.parse(localStorage.getItem('preferences_backup') || '{}');
          backup.sync_status = 'completed';
          backup.last_sync = Date.now();
          localStorage.setItem('preferences_backup', JSON.stringify(backup));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to sync preferences to server:', error);
      // Keep local backup
      return false;
    }
  }

  /**
   * Notify user that sync completed
   * @param {number} count - Number of items synced
   */
  notifySyncComplete(count: number): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Main - Sync Complete', {
        body: `Synced ${count} items successfully`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2310b981" rx="20" width="100" height="100"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">P</text></svg>',
        badge:
          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2310b981" rx="20" width="100" height="100"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">P</text></svg>',
      });
    }
  }

  /**
   * Start periodic sync interval
   * @param {number} interval - Sync interval in milliseconds
   */
  startPeriodicSync(interval: number = 300000): void {
    // 5 minutes default
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncAll();
      }
    }, interval);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get sync status
   * @returns {Object} Sync status
   */
  getSyncStatus(): any {
    return {
      pending: this.syncQueue.length,
      isSyncing: this.isSyncing,
      lastSync: localStorage.getItem('main-last-sync'),
    };
  }

  /**
   * Clear sync queue
   */
  clearQueue(): void {
    this.syncQueue = [];
    this.saveSyncQueue();
    console.log('[Sync] Cleared sync queue');
  }
}

// Global sync manager instance
let globalSyncManager: BackgroundSyncManager | null = null;

/**
 * Get or create the global background sync manager
 * @returns {BackgroundSyncManager}
 */
export function getBackgroundSyncManager() {
  if (!globalSyncManager) {
    globalSyncManager = new BackgroundSyncManager();
  }
  return globalSyncManager;
}
