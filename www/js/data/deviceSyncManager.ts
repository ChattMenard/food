/**
 * Device Sync Manager
 * Cross-device synchronization with conflict resolution
 * Last-write-wins strategy with vector clock tracking
 */

import db from './db';

type ConflictStrategy = 'last-write-wins' | 'merge-arrays' | 'max-value' | 'min-value' | 'manual';

interface ConflictStrategies {
  readonly LAST_WRITE_WINS: 'last-write-wins';
  readonly MERGE_ARRAYS: 'merge-arrays';
  readonly MAX_VALUE: 'max-value';
  readonly MIN_VALUE: 'min-value';
  readonly MANUAL: 'manual';
}

interface DataTypeConfig {
  strategy: ConflictStrategy;
  keyField?: string;
}

interface DataTypeConfigs {
  pantry: DataTypeConfig;
  mealPlan: DataTypeConfig;
  preferences: DataTypeConfig;
  recipeRatings: DataTypeConfig;
  nutritionGoals: DataTypeConfig;
  budgetTier: DataTypeConfig;
  mealPrepSettings: DataTypeConfig;
  groceryPreferences: DataTypeConfig;
}

type DataTypeKey = keyof DataTypeConfigs;

interface SyncDataPayload {
  value: unknown;
  timestamp: number;
  vectorClock?: Record<string, number>;
}

interface SyncPayload {
  deviceId: string | null;
  timestamp: number;
  vectorClock: Record<string, number>;
  data: Partial<Record<DataTypeKey, SyncDataPayload>>;
}

interface DeviceSyncBackup {
  exportDate: number;
  data: Partial<Record<DataTypeKey, unknown>>;
}

type ImportConflictStrategy = 'skip' | 'overwrite' | 'merge';

interface ImportOptions {
  overwrite?: boolean;
  onConflict?: ImportConflictStrategy;
}

const CONFLICT_STRATEGIES: ConflictStrategies = {
  LAST_WRITE_WINS: 'last-write-wins',
  MERGE_ARRAYS: 'merge-arrays',
  MAX_VALUE: 'max-value',
  MIN_VALUE: 'min-value',
  MANUAL: 'manual',
} as const;

const DATA_TYPE_CONFIG: DataTypeConfigs = {
  pantry: { strategy: CONFLICT_STRATEGIES.MERGE_ARRAYS, keyField: 'name' },
  mealPlan: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  preferences: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  recipeRatings: { strategy: CONFLICT_STRATEGIES.MAX_VALUE },
  nutritionGoals: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  budgetTier: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  mealPrepSettings: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
  groceryPreferences: { strategy: CONFLICT_STRATEGIES.LAST_WRITE_WINS },
};

interface SyncListenerCallbacks {
  onSyncStart?: () => void;
  onSyncComplete?: (result: Record<string, unknown>) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: Record<string, unknown>) => void;
}

export class DeviceSyncManager {
  private deviceId: string | null = null;
  private deviceName: string | null = null;
  private isRegistered: boolean = false;
  private lastSyncTimestamp: number = 0;
  private vectorClock: Record<string, number> = {};
  private syncInProgress: boolean = false;
  private listeners: SyncListenerCallbacks[] = [];

  get deviceIdData(): string | null {
    return this.deviceId;
  }

  get deviceNameData(): string | null {
    return this.deviceName;
  }

  get isRegisteredData(): boolean {
    return this.isRegistered;
  }

  get vectorClockData(): Record<string, number> {
    return this.vectorClock;
  }

  get isSyncingData(): boolean {
    return this.syncInProgress;
  }

  constructor() {
    this.loadDeviceInfo();
  }

  private async loadDeviceInfo(): Promise<void> {
    await db.ready;

    // Load existing device info
    const deviceInfo = await db.get('preferences', 'device-sync-info') as { value?: { deviceId?: string; deviceName?: string; lastSync?: number; vectorClock?: Record<string, number> } } | undefined;

    if (deviceInfo?.value) {
      this.deviceId = deviceInfo.value.deviceId || null;
      this.deviceName = deviceInfo.value.deviceName || null;
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
  }

  /**
   * Register this device for sync
   */
  async registerDevice(customName: string | null = null): Promise<{
    deviceId: string | null;
    deviceName: string | null;
    isRegistered: boolean;
    lastSync: number;
    vectorClock: Record<string, number>;
  }> {
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
  generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `dev-${timestamp}-${random}`;
  }

  /**
   * Generate readable device name
   */
  generateDeviceName(): string {
    const deviceTypes = ['Phone', 'Tablet', 'Laptop', 'Desktop'];
    const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const number = Math.floor(Math.random() * 1000);
    return `My ${type} ${number}`;
  }

  /**
   * Save device info to IndexedDB
   */
  async saveDeviceInfo(): Promise<void> {
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
  getDeviceInfo(): {
    deviceId: string | null;
    deviceName: string | null;
    isRegistered: boolean;
    lastSync: number;
    vectorClock: Record<string, number>;
  } {
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
  async setDeviceName(name: string): Promise<{
    deviceId: string | null;
    deviceName: string | null;
    isRegistered: boolean;
    lastSync: number;
    vectorClock: Record<string, number>;
  }> {
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
  async generateSyncPayload(): Promise<SyncPayload> {
    if (!this.deviceId) {
      throw new Error('Device not registered');
    }

    const payload: SyncPayload = {
      deviceId: this.deviceId,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      data: {},
    };

    // Increment our vector clock
    this.vectorClock[this.deviceId] =
      (this.vectorClock[this.deviceId] || 0) + 1;

    // Collect all syncable data
    for (const dataType of Object.keys(DATA_TYPE_CONFIG) as DataTypeKey[]) {
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
   * Prepare data for sync with metadata
   * @param {DataTypeKey} dataType - Type of data to prepare
   * @param {unknown} data - Raw data to prepare
   * @returns {{ data: unknown; deviceId: string; timestamp: number; vectorClock: Record<string, number>; version: number }}
   */
  prepareDataForSync(dataType: DataTypeKey, data: unknown) {
    if (!this.deviceId) {
      throw new Error('Device not registered');
    }

    // Increment version for this data type
    const version = Date.now();

    return {
      data,
      deviceId: this.deviceId,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock },
      version
    };
  }

  /**
   * Check if there's a conflict between local and remote data
   * @param {{ data: unknown; deviceId: string; timestamp: number; vectorClock: Record<string, number> }} localData
   * @param {{ data: unknown; deviceId: string; timestamp: number; vectorClock: Record<string, number> }} remoteData
   * @returns {boolean}
   */
  hasConflict(localData: { vectorClock: Record<string, number> }, remoteData: { vectorClock: Record<string, number> }) {
    // Simple conflict detection: if vector clocks are different, there might be a conflict
    const localKeys = Object.keys(localData.vectorClock);
    const remoteKeys = Object.keys(remoteData.vectorClock);
    
    // Check if any device has different versions
    for (const key of new Set([...localKeys, ...remoteKeys])) {
      const localVersion = localData.vectorClock[key] || 0;
      const remoteVersion = remoteData.vectorClock[key] || 0;
      
      if (localVersion !== remoteVersion) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Resolve conflict using specified strategy
   * @param {{ data: unknown; deviceId: string; timestamp: number; vectorClock: Record<string, number> }} localData
   * @param {{ data: unknown; deviceId: string; timestamp: number; vectorClock: Record<string, number> }} remoteData
   * @param {ConflictStrategy} strategy
   * @returns {{ data: unknown; deviceId: string; timestamp: number; vectorClock: Record<string, number> }}
   */
  resolveConflict(
    localData: { data: unknown; deviceId: string; timestamp: number; vectorClock: Record<string, number> },
    remoteData: { data: unknown; deviceId: string; timestamp: number; vectorClock: Record<string, number> },
    strategy: ConflictStrategy
  ) {
    switch (strategy) {
      case 'last-write-wins':
        return localData.timestamp > remoteData.timestamp ? localData : remoteData;
      
      case 'manual':
        // For manual merge, prefer remote data (in a real implementation, this would prompt user)
        return remoteData;
      
      default:
        return remoteData;
    }
  }

  /**
   * Get specific data type for sync
   */
  async getDataForSync(dataType: DataTypeKey): Promise<unknown> {
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
        const nutritionPref = await db.get('preferences', 'nutrition-goals') as { value?: unknown } | undefined;
        return nutritionPref?.value || null;
      case 'budgetTier':
        const budget = await db.get('preferences', 'budget-tier') as { value?: unknown } | undefined;
        return budget?.value || null;
      case 'mealPrepSettings':
        const prep = await db.get('preferences', 'meal-prep-settings') as { value?: unknown } | undefined;
        return prep?.value || null;
      case 'groceryPreferences':
        const grocery = await db.get(
          'preferences',
          'grocery-delivery-preferences'
        ) as { value?: unknown } | undefined;
        return grocery?.value || null;
      default:
        return null;
    }
  }

  /**
   * Apply sync payload from another device
   */
  async applySyncPayload(
    payload: SyncPayload
  ): Promise<{ applied: boolean; reason?: string; results?: Record<string, any> }> {
    if (!payload || !payload.deviceId) {
      throw new Error('Invalid sync payload');
    }

    if (payload.deviceId === this.deviceId) {
      console.log('[DeviceSync] Ignoring own payload');
      return { applied: false, reason: 'own-device' };
    }

    this.syncInProgress = true;
    const results: Record<string, any> = {};

    try {
      // Merge vector clocks
      this.mergeVectorClock(payload.vectorClock);

      // Apply each data type
      const payloadEntries = Object.entries(payload.data) as [
        DataTypeKey,
        SyncDataPayload
      ][];

      for (const [dataType, data] of payloadEntries) {
        if (DATA_TYPE_CONFIG[dataType]) {
          try {
            const result = await this.mergeData(dataType, data);
            results[dataType] = result;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`[DeviceSync] Failed to merge ${dataType}:`, message);
            results[dataType] = { error: message };
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
  mergeVectorClock(incomingClock: Record<string, number>): void {
    for (const [device, count] of Object.entries(incomingClock)) {
      this.vectorClock[device] = Math.max(this.vectorClock[device] || 0, count);
    }
  }

  /**
   * Merge data based on conflict strategy
   */
  async mergeData(
    dataType: DataTypeKey,
    incomingData: SyncDataPayload
  ): Promise<Record<string, any>> {
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
        currentData as unknown[],
        incomingData.value as unknown[],
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
      const merged = { ...currentData } as Record<string, number>;
      const incomingValue = incomingData.value as Record<string, number>;
      for (const [key, value] of Object.entries(incomingValue || {})) {
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
  async getDataTimestamp(dataType: DataTypeKey): Promise<number> {
    const pref = await db.get('preferences', this.getDataKey(dataType)) as { updatedAt?: number } | undefined;
    return pref?.updatedAt || 0;
  }

  /**
   * Get storage key for data type
   */
  getDataKey(dataType: DataTypeKey): string {
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
  async saveData(dataType: DataTypeKey, value: unknown): Promise<void> {
    switch (dataType) {
      case 'pantry':
        await db.setPantry(value as any);
        break;
      case 'mealPlan':
        await db.setMealPlan(value as any);
        break;
      case 'preferences':
        await db.setPreferences(value as any);
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
  mergeArrays(local: unknown[] = [], incoming: unknown[] = [], keyField?: string): unknown[] {
    const merged = new Map<string, unknown>();

    // Add local items
    (local || []).forEach((item) => {
      const itemObj = item as Record<string, unknown>;
      const key = keyField && itemObj[keyField] ? String(itemObj[keyField]) : JSON.stringify(item);
      merged.set(key, item);
    });

    // Add/overwrite with incoming items
    (incoming || []).forEach((item) => {
      const itemObj = item as Record<string, unknown>;
      const key = keyField && itemObj[keyField] ? String(itemObj[keyField]) : JSON.stringify(item);
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, item);
      } else if ((itemObj.updatedAt as number) > ((existing as Record<string, unknown>).updatedAt as number || 0)) {
        merged.set(key, item);
      }
    });

    return Array.from(merged.values());
  }

  /**
   * Export all data for backup/migration
   */
  async exportAllData(): Promise<{
    version: string;
    exportDate: number;
    deviceId: string | null;
    data: Partial<Record<DataTypeKey, any>>;
  }> {
    const export_ = {
      version: '2.0',
      exportDate: Date.now(),
      deviceId: this.deviceId,
      data: {} as Partial<Record<DataTypeKey, any>>,
    };

    for (const dataType of Object.keys(DATA_TYPE_CONFIG) as DataTypeKey[]) {
      export_.data[dataType] = await this.getDataForSync(dataType);
    }

    return export_;
  }

  /**
   * Import data from backup
   */
  async importAllData(
    backup: DeviceSyncBackup,
    options: ImportOptions = {}
  ): Promise<Record<string, any>> {
    const {
      overwrite = false,
      onConflict = 'skip', // 'skip', 'overwrite', 'merge'
    } = options;

    if (!backup || !backup.data) {
      throw new Error('Invalid backup format');
    }

    const results: Record<string, any> = {};
    const backupEntries = Object.entries(backup.data) as [
      DataTypeKey,
      any
    ][];

    for (const [dataType, value] of backupEntries) {
      const config = DATA_TYPE_CONFIG[dataType];
      if (!config) continue;

      try {
        if (overwrite) {
          await this.saveData(dataType, value);
          results[dataType] = { action: 'imported' };
        } else if (onConflict === 'merge') {
          const incoming: SyncDataPayload = {
            value,
            timestamp: backup.exportDate,
          };
          const result = await this.mergeData(dataType, incoming);
          results[dataType] = result;
        } else {
          // skip
          results[dataType] = { action: 'skipped', reason: 'exists' };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results[dataType] = { action: 'error', error: message };
      }
    }

    return results;
  }

  /**
   * Subscribe to sync events
   */
  subscribe(callback: SyncListenerCallbacks): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  notifyListeners(event: string, data: Record<string, unknown>): void {
    this.listeners.forEach((cb) => {
      try {
        if (event === 'syncStart' && cb.onSyncStart) {
          cb.onSyncStart();
        } else if (event === 'syncComplete' && cb.onSyncComplete) {
          cb.onSyncComplete(data);
        } else if (event === 'syncError' && cb.onSyncError) {
          cb.onSyncError(data as unknown as Error);
        } else if (event === 'conflict' && cb.onConflict) {
          cb.onConflict(data);
        }
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
      dataTypes: Object.keys(DATA_TYPE_CONFIG) as DataTypeKey[],
    };
  }

  /**
   * Record sync result for logging and analytics
   * @param dataType - Data type that was synced
   * @param success - Whether sync was successful
   * @param error - Error message if sync failed
   */
  recordSyncResult(dataType: DataTypeKey, success: boolean, error?: string): void {
    const result = {
      dataType,
      success,
      error,
      timestamp: Date.now(),
      deviceId: this.deviceId
    };
    
    // Log to console for now - could be stored in analytics later
    if (success) {
      console.log(`[DeviceSync] Successfully synced ${dataType}`);
    } else {
      console.error(`[DeviceSync] Failed to sync ${dataType}:`, error);
    }
  }

  /**
   * Start a new sync session
   * @returns {Promise<void>}
   */
  async startSyncSession(): Promise<void> {
    if (!this.isRegistered) {
      throw new Error('Device not registered');
    }
    
    if (this.syncInProgress) {
      console.warn('[DeviceSync] Sync already in progress');
      return;
    }
    
    this.syncInProgress = true;
    this.notifyListeners('syncStarted', { deviceId: this.deviceId });
    
    try {
      // Sync all data types
      for (const dataType of Object.keys(DATA_TYPE_CONFIG) as DataTypeKey[]) {
        await this.syncDataType(dataType);
      }
      
      this.lastSyncTimestamp = Date.now();
      this.notifyListeners('syncCompleted', { 
        deviceId: this.deviceId, 
        timestamp: this.lastSyncTimestamp 
      });
    } catch (error) {
      this.notifyListeners('syncError', { 
        deviceId: this.deviceId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }
}

const deviceSyncManager = new DeviceSyncManager();
export default deviceSyncManager;
export { CONFLICT_STRATEGIES, DATA_TYPE_CONFIG };
