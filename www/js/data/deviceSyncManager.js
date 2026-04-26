/**
 * Device Sync Manager
 * Cross-device synchronization with conflict resolution
 * Last-write-wins strategy with vector clock tracking
 */

import db from './db.js';

// Conflict resolution strategies
const CONFLICT_STRATEGIES = {
  LAST_WRITE_WINS: 'last-write-wins',
  MERGE_ARRAYS: 'merge-arrays',
  MAX_VALUE: 'max-value',
  MIN_VALUE: 'min-value',
  MANUAL: 'manual',
};

// Data types with their merge strategies
const DATA_TYPE_CONFIG = {
  pantry: { strategy: CONFLICT_STRATEGIES.MERGE_ARRAYS, keyField: 'name' },
  mealPlan: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  preferences: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  recipeRatings: { strategy: CONFLICT_STRATEGIES.MAX_VALUE },
  nutritionGoals: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  budgetTier: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  mealPrepSettings: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  groceryPreferences: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
};

class DeviceSyncManager {
  constructor() {
    this.deviceId = null;
    this.deviceName = null;
    this.isRegistered = false;
    this.lastSyncTimestamp = 0;
    this.vectorClock = {};
    this.syncInProgress = false;
    this.listeners = [];
  }

  /**
   * Initialize device sync - load or create device identity
   */
  async init() {
    await db.ready;

    // Load existing device info
    const deviceInfo = await db.get('preferences', 'device-sync-info');

    if (deviceInfo && deviceInfo.value) {
      this.deviceId = deviceInfo.value.deviceId;
      this.deviceName = deviceInfo.value.deviceName;
      this.lastSyncTimestamp = deviceInfo.value.lastSync || 0;
      this.vectorClock = deviceInfo.value.vectorClock || {};
      this.isRegistered = true;

      console.log(
        '[DeviceSync] Loaded device:',
        this.deviceId,
        this.deviceName
      );
    } else {
      // Generate new device identity
      await this.registerDevice();
    }

    return this.getDeviceInfo();
  }

  /**
   * Register this device for sync
   */
  async registerDevice(customName = null) {
    this.deviceId = this.generateDeviceId();
    this.deviceName = customName || this.generateDeviceName();
    this.vectorClock = { [this.deviceId]: 0 };
    this.isRegistered = true;
    this.lastSyncTimestamp = Date.now();

    await this.saveDeviceInfo();

    console.log(
      '[DeviceSync] Registered new device:',
      this.deviceId,
      this.deviceName
    );
    this.notifyListeners('registered', this.getDeviceInfo());

    return this.getDeviceInfo();
  }

  /**
   * Generate unique device ID
   */
  generateDeviceId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `dev-${timestamp}-${random}`;
  }

  /**
   * Generate readable device name
   */
  generateDeviceName() {
    const deviceTypes = ['Phone', 'Tablet', 'Laptop', 'Desktop'];
    const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const number = Math.floor(Math.random() * 1000);
    return `My ${type} ${number}`;
  }

  /**
   * Save device info to IndexedDB
   */
  async saveDeviceInfo() {
    await db.put('preferences', {
      key: 'device-sync-info',
      value: {
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        lastSync: this.lastSyncTimestamp,
        vectorClock: this.vectorClock,
        registeredAt: this.isRegistered ? Date.now() : null,
      },
      updatedAt: Date.now(),
    });
  }

  /**
   * Get current device info
   */
  getDeviceInfo() {
    return {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      isRegistered: this.isRegistered,
      lastSync: this.lastSyncTimestamp,
      vectorClock: this.vectorClock,
    };
  }

  /**
   * Update device name
   */
  async setDeviceName(name) {
    this.deviceName = name;
    await this.saveDeviceInfo();
    this.notifyListeners('renamed', {
      deviceId: this.deviceId,
      deviceName: name,
    });
    return this.getDeviceInfo();
  }

  /**
   * Generate sync payload for all data types
   */
  async generateSyncPayload() {
    const payload = {
      deviceId: this.deviceId,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      data: {},
    };

    // Increment our vector clock
    this.vectorClock[this.deviceId] =
      (this.vectorClock[this.deviceId] || 0) + 1;

    // Collect all syncable data
    for (const dataType of Object.keys(DATA_TYPE_CONFIG)) {
      try {
        const data = await this.getDataForSync(dataType);
        payload.data[dataType] = {
          value: data,
          timestamp: Date.now(),
          vectorClock: { ...this.vectorClock },
        };
      } catch (err) {
        console.warn(`[DeviceSync] Failed to get ${dataType}:`, err);
      }
    }

    return payload;
  }

  /**
   * Get specific data type for sync
   */
  async getDataForSync(dataType) {
    switch (dataType) {
      case 'pantry':
        return await db.getPantry();
      case 'mealPlan':
        return await db.getMealPlan();
      case 'preferences':
        return await db.getPreferences();
      case 'recipeRatings':
        return (await db.get('preferences', 'recipeRatings')) || {};
      case 'nutritionGoals':
        return (await db.get('preferences', 'nutrition-goals')) || null;
      case 'budgetTier':
        const budget = await db.get('preferences', 'budget-tier');
        return budget ? budget.value : null;
      case 'mealPrepSettings':
        const prep = await db.get('preferences', 'meal-prep-settings');
        return prep ? prep.value : null;
      case 'groceryPreferences':
        const grocery = await db.get(
          'preferences',
          'grocery-delivery-preferences'
        );
        return grocery ? grocery.value : null;
      default:
        return null;
    }
  }

  /**
   * Apply sync payload from another device
   */
  async applySyncPayload(payload) {
    if (!payload || !payload.deviceId) {
      throw new Error('Invalid sync payload');
    }

    if (payload.deviceId === this.deviceId) {
      console.log('[DeviceSync] Ignoring own payload');
      return { applied: false, reason: 'own-device' };
    }

    this.syncInProgress = true;
    const results = {};

    try {
      // Merge vector clocks
      this.mergeVectorClock(payload.vectorClock);

      // Apply each data type
      for (const [dataType, data] of Object.entries(payload.data)) {
        if (DATA_TYPE_CONFIG[dataType]) {
          try {
            const result = await this.mergeData(dataType, data);
            results[dataType] = result;
          } catch (err) {
            console.warn(`[DeviceSync] Failed to merge ${dataType}:`, err);
            results[dataType] = { error: err.message };
          }
        }
      }

      this.lastSyncTimestamp = Date.now();
      await this.saveDeviceInfo();

      this.notifyListeners('sync-applied', {
        fromDevice: payload.deviceId,
        results,
      });

      return { applied: true, results };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Merge vector clocks (take maximum for each device)
   */
  mergeVectorClock(incomingClock) {
    for (const [device, count] of Object.entries(incomingClock)) {
      this.vectorClock[device] = Math.max(this.vectorClock[device] || 0, count);
    }
  }

  /**
   * Merge data based on conflict strategy
   */
  async mergeData(dataType, incomingData) {
    const config = DATA_TYPE_CONFIG[dataType];
    const currentData = await this.getDataForSync(dataType);

    // Check if we need to merge
    if (!currentData) {
      // No local data, just accept incoming
      await this.saveData(dataType, incomingData.value);
      return { action: 'accepted', strategy: 'none' };
    }

    if (!incomingData.value) {
      return { action: 'skipped', reason: 'no-incoming-data' };
    }

    // Compare timestamps and vector clocks
    const localTime = await this.getDataTimestamp(dataType);
    const incomingTime = incomingData.timestamp;

    // Simple last-write-wins for now
    if (config.strategy === CONFLICT_STRATEGIES.LAST_WRITE_WINS) {
      if (incomingTime > localTime) {
        await this.saveData(dataType, incomingData.value);
        return { action: 'accepted', strategy: 'last-write-wins' };
      } else {
        return {
          action: 'rejected',
          reason: 'local-newer',
          strategy: 'last-write-wins',
        };
      }
    }

    if (config.strategy === CONFLICT_STRATEGIES.MERGE_ARRAYS) {
      const merged = this.mergeArrays(
        currentData,
        incomingData.value,
        config.keyField
      );
      await this.saveData(dataType, merged);
      return {
        action: 'merged',
        strategy: 'merge-arrays',
        items: merged.length,
      };
    }

    if (config.strategy === CONFLICT_STRATEGIES.MAX_VALUE) {
      // For ratings, take max values
      const merged = { ...currentData };
      for (const [key, value] of Object.entries(incomingData.value || {})) {
        if (value > (merged[key] || 0)) {
          merged[key] = value;
        }
      }
      await this.saveData(dataType, merged);
      return { action: 'merged', strategy: 'max-value' };
    }

    // Default: reject if conflict
    return {
      action: 'rejected',
      reason: 'conflict',
      strategy: config.strategy,
    };
  }

  /**
   * Get timestamp for data type
   */
  async getDataTimestamp(dataType) {
    const pref = await db.get('preferences', this.getDataKey(dataType));
    return pref ? pref.updatedAt || 0 : 0;
  }

  /**
   * Get storage key for data type
   */
  getDataKey(dataType) {
    const keyMap = {
      pantry: 'pantry',
      mealPlan: 'mealPlan',
      preferences: 'preferences',
      recipeRatings: 'recipeRatings',
      nutritionGoals: 'nutrition-goals',
      budgetTier: 'budget-tier',
      mealPrepSettings: 'meal-prep-settings',
      groceryPreferences: 'grocery-delivery-preferences',
    };
    return keyMap[dataType] || dataType;
  }

  /**
   * Save merged data
   */
  async saveData(dataType, value) {
    switch (dataType) {
      case 'pantry':
        await db.setPantry(value);
        break;
      case 'mealPlan':
        await db.setMealPlan(value);
        break;
      case 'preferences':
        await db.setPreferences(value);
        break;
      default:
        await db.put('preferences', {
          key: this.getDataKey(dataType),
          value,
          updatedAt: Date.now(),
        });
    }
  }

  /**
   * Merge two arrays by key field
   */
  mergeArrays(local, incoming, keyField) {
    const merged = new Map();

    // Add local items
    (local || []).forEach((item) => {
      const key = item[keyField] || JSON.stringify(item);
      merged.set(key, item);
    });

    // Add/overwrite with incoming items
    (incoming || []).forEach((item) => {
      const key = item[keyField] || JSON.stringify(item);
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, item);
      } else if (item.updatedAt > (existing.updatedAt || 0)) {
        merged.set(key, item);
      }
    });

    return Array.from(merged.values());
  }

  /**
   * Export all data for backup/migration
   */
  async exportAllData() {
    const export_ = {
      version: '2.0',
      exportDate: Date.now(),
      deviceId: this.deviceId,
      data: {},
    };

    for (const dataType of Object.keys(DATA_TYPE_CONFIG)) {
      export_.data[dataType] = await this.getDataForSync(dataType);
    }

    return export_;
  }

  /**
   * Import data from backup
   */
  async importAllData(backup, options = {}) {
    const {
      overwrite = false,
      onConflict = 'skip', // 'skip', 'overwrite', 'merge'
    } = options;

    if (!backup || !backup.data) {
      throw new Error('Invalid backup format');
    }

    const results = {};

    for (const [dataType, value] of Object.entries(backup.data)) {
      if (!DATA_TYPE_CONFIG[dataType]) continue;

      try {
        if (overwrite) {
          await this.saveData(dataType, value);
          results[dataType] = { action: 'imported' };
        } else if (onConflict === 'merge') {
          const incoming = { value, timestamp: backup.exportDate };
          const result = await this.mergeData(dataType, incoming);
          results[dataType] = result;
        } else {
          // skip
          results[dataType] = { action: 'skipped', reason: 'exists' };
        }
      } catch (err) {
        results[dataType] = { action: 'error', error: err.message };
      }
    }

    return results;
  }

  /**
   * Subscribe to sync events
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach((cb) => {
      try {
        cb(event, data);
      } catch (err) {
        console.warn('[DeviceSync] Listener error:', err);
      }
    });
  }

  /**
   * Get sync status summary
   */
  getStatus() {
    return {
      isRegistered: this.isRegistered,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      syncInProgress: this.syncInProgress,
      lastSync: this.lastSyncTimestamp,
      vectorClockSize: Object.keys(this.vectorClock).length,
      dataTypes: Object.keys(DATA_TYPE_CONFIG),
    };
  }
}

const deviceSyncManager = new DeviceSyncManager();
export default deviceSyncManager;
export { DeviceSyncManager, CONFLICT_STRATEGIES, DATA_TYPE_CONFIG };
