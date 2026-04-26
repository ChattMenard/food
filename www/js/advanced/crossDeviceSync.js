/**
 * Cross-Device Sync Module
 * Handles synchronization of data across multiple devices
 */

export class CrossDeviceSync {
  constructor(db) {
    this.db = db;
    this.syncInProgress = false;
    this.lastSyncTime = null;
  }

  /**
   * Initialize sync
   */
  async init() {
    this.loadLastSyncTime();
    console.log('[CrossDeviceSync] Initialized');
  }

  /**
   * Load last sync time from localStorage
   */
  loadLastSyncTime() {
    const saved = localStorage.getItem('sync-last-time');
    if (saved) {
      this.lastSyncTime = new Date(saved);
    }
  }

  /**
   * Save last sync time to localStorage
   */
  saveLastSyncTime() {
    localStorage.setItem('sync-last-time', new Date().toISOString());
  }

  /**
   * Sync all data with remote server
   * @returns {Promise<Object>} Sync result
   */
  async sync() {
    if (this.syncInProgress) {
      console.log('[CrossDeviceSync] Sync already in progress');
      return { status: 'syncing' };
    }

    this.syncInProgress = true;

    try {
      // Collect local changes since last sync
      const localChanges = await this.getLocalChanges();

      // Fetch remote changes since last sync
      const remoteChanges = await this.fetchRemoteChanges();

      // Merge changes
      const merged = this.mergeChanges(localChanges, remoteChanges);

      // Apply merged changes to local store
      await this.applyChanges(merged.local);

      // Push local changes to remote
      await this.pushChanges(merged.remote);

      this.lastSyncTime = new Date();
      this.saveLastSyncTime();

      console.log('[CrossDeviceSync] Sync complete');
      return {
        status: 'success',
        timestamp: this.lastSyncTime,
        changes: merged,
      };
    } catch (error) {
      console.error('[CrossDeviceSync] Sync failed:', error);
      return {
        status: 'error',
        error: error.message,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get local changes since last sync
   * @returns {Promise<Object>} Local changes
   */
  async getLocalChanges() {
    const changes = {
      pantry: [],
      mealPlan: [],
      preferences: null,
    };

    // Get pantry items modified since last sync
    const pantry = await this.db.getAll('pantry');
    if (this.lastSyncTime) {
      changes.pantry = pantry.filter((item) => {
        const modifiedDate = new Date(item.modifiedAt || item.addedAt);
        return modifiedDate > this.lastSyncTime;
      });
    } else {
      changes.pantry = pantry;
    }

    // Get meal plan changes
    changes.mealPlan = await this.db.getMealPlan();

    // Get preferences
    changes.preferences = await this.db.getPreferences();

    return changes;
  }

  /**
   * Fetch remote changes from server
   * @returns {Promise<Object>} Remote changes
   */
  async fetchRemoteChanges() {
    // Placeholder - would fetch from remote server
    return {
      pantry: [],
      mealPlan: {},
      preferences: null,
    };
  }

  /**
   * Merge local and remote changes
   * @param {Object} local - Local changes
   * @param {Object} remote - Remote changes
   * @returns {Object} Merged changes
   */
  mergeChanges(local, remote) {
    // Simple merge strategy - last write wins for now
    return {
      local: {
        pantry: [...remote.pantry],
        mealPlan: remote.mealPlan || local.mealPlan,
        preferences: remote.preferences || local.preferences,
      },
      remote: {
        pantry: [...local.pantry],
        mealPlan: local.mealPlan,
        preferences: local.preferences,
      },
    };
  }

  /**
   * Apply changes to local IndexedDB
   * @param {Object} changes - Changes to apply
   */
  async applyChanges(changes) {
    // Apply pantry changes
    for (const item of changes.pantry) {
      await this.db.put('pantry', item);
    }

    // Apply meal plan changes
    if (changes.mealPlan) {
      await this.db.saveMealPlan(changes.mealPlan);
    }

    // Apply preferences
    if (changes.preferences) {
      await this.db.savePreferences(changes.preferences);
    }
  }

  /**
   * Push local changes to remote server
   * @param {Object} changes - Changes to push
   */
  async pushChanges(changes) {
    // Placeholder - would push to remote server
    console.log('[CrossDeviceSync] Pushing changes to server:', changes);
  }

  /**
   * Force full sync (ignores last sync time)
   * @returns {Promise<Object>} Sync result
   */
  async forceSync() {
    this.lastSyncTime = null;
    return this.sync();
  }

  /**
   * Get sync status
   * @returns {Object} Sync status
   */
  getStatus() {
    return {
      inProgress: this.syncInProgress,
      lastSync: this.lastSyncTime,
      timeSinceLastSync: this.lastSyncTime
        ? Date.now() - this.lastSyncTime.getTime()
        : null,
    };
  }
}

// Global cross-device sync instance
let globalCrossDeviceSync = null;

/**
 * Get or create the global cross-device sync
 * @param {Object} db - Database instance
 * @returns {CrossDeviceSync}
 */
export function getCrossDeviceSync(db) {
  if (!globalCrossDeviceSync) {
    globalCrossDeviceSync = new CrossDeviceSync(db);
  }
  return globalCrossDeviceSync;
}
