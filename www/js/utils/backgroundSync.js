/**
 * Background Sync Manager
 * Handles background synchronization of meal plans and data
 */

export class BackgroundSyncManager {
    constructor() {
        this.syncQueue = [];
        this.isSyncing = false;
        this.storageKey = 'main-sync-queue';
        this.syncInterval = null;
        
        this.loadSyncQueue();
        this.setupSyncListeners();
    }
    
    /**
     * Load sync queue from localStorage
     */
    loadSyncQueue() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.syncQueue = JSON.parse(saved);
                console.log(`[Sync] Loaded ${this.syncQueue.length} pending sync operations`);
            }
        } catch (error) {
            console.error('[Sync] Failed to load queue:', error);
        }
    }
    
    /**
     * Save sync queue to localStorage
     */
    saveSyncQueue() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('[Sync] Failed to save queue:', error);
        }
    }
    
    /**
     * Setup sync event listeners
     */
    setupSyncListeners() {
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
        if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                registration.periodicSync.register('meal-plan-sync', {
                    minInterval: 24 * 60 * 60 * 1000 // 24 hours
                }).catch(err => {
                    console.log('[Sync] Periodic sync not supported:', err);
                });
            });
        }
    }
    
    /**
     * Queue a sync operation
     * @param {string} type - Sync operation type
     * @param {Object} data - Data to sync
     */
    queueSync(type, data) {
        const syncItem = {
            id: Date.now() + Math.random(),
            type,
            data,
            timestamp: Date.now(),
            attempts: 0
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
    syncMealPlan(mealPlan) {
        this.queueSync('mealPlan', mealPlan);
    }
    
    /**
     * Sync pantry changes
     * @param {Array} pantry - Pantry items to sync
     */
    syncPantry(pantry) {
        this.queueSync('pantry', pantry);
    }
    
    /**
     * Sync preferences
     * @param {Object} preferences - Preferences to sync
     */
    syncPreferences(preferences) {
        this.queueSync('preferences', preferences);
    }
    
    /**
     * Process all pending sync operations
     */
    async syncAll() {
        if (this.isSyncing || this.syncQueue.length === 0 || !navigator.onLine) {
            return;
        }
        
        this.isSyncing = true;
        console.log(`[Sync] Processing ${this.syncQueue.length} pending operations`);
        
        const successful = [];
        const failed = [];
        
        for (const item of this.syncQueue) {
            try {
                await this.processSyncItem(item);
                successful.push(item);
                console.log(`[Sync] Synced ${item.type} operation`);
            } catch (error) {
                item.attempts++;
                console.warn(`[Sync] Failed to sync ${item.type} (attempt ${item.attempts}):`, error);
                
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
    async processSyncItem(item) {
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
     * Sync meal plan to server (placeholder for future implementation)
     * @param {Object} mealPlan - Meal plan data
     */
    async syncMealPlanToServer(mealPlan) {
        // TODO: Implement actual server sync when backend is available
        // For now, just simulate success
        return new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * Sync pantry to server (placeholder for future implementation)
     * @param {Array} pantry - Pantry data
     */
    async syncPantryToServer(pantry) {
        // TODO: Implement actual server sync when backend is available
        return new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * Sync preferences to server (placeholder for future implementation)
     * @param {Object} preferences - Preferences data
     */
    async syncPreferencesToServer(preferences) {
        // TODO: Implement actual server sync when backend is available
        return new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * Notify user that sync completed
     * @param {number} count - Number of items synced
     */
    notifySyncComplete(count) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Main - Sync Complete', {
                body: `Synced ${count} items successfully`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2310b981" rx="20" width="100" height="100"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">P</text></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2310b981" rx="20" width="100" height="100"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">P</text></svg>'
            });
        }
    }
    
    /**
     * Start periodic sync interval
     * @param {number} interval - Sync interval in milliseconds
     */
    startPeriodicSync(interval = 300000) { // 5 minutes default
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
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    
    /**
     * Get sync status
     * @returns {Object} Sync status
     */
    getSyncStatus() {
        return {
            pending: this.syncQueue.length,
            isSyncing: this.isSyncing,
            lastSync: localStorage.getItem('main-last-sync')
        };
    }
    
    /**
     * Clear sync queue
     */
    clearQueue() {
        this.syncQueue = [];
        this.saveSyncQueue();
        console.log('[Sync] Cleared sync queue');
    }
}

// Global sync manager instance
let globalSyncManager = null;

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
