// @ts-check
/**
 * Device Sync Manager Tests
 * Tests for cross-device synchronization with conflict resolution
 */

import {
  DeviceSyncManager,
  CONFLICT_STRATEGIES,
  DATA_TYPE_CONFIG,
} from '../data/deviceSyncManager.js';

describe('DeviceSyncManager', () => {
  let syncManager;

  beforeEach(() => {
    syncManager = new DeviceSyncManager();
  });

  describe('initialization', () => {
    it('should start unregistered', () => {
      expect(syncManager.isRegistered).toBe(false);
      expect(syncManager.deviceId).toBeNull();
    });

    it('should generate device info after registration', async () => {
      await syncManager.registerDevice();

      expect(syncManager.isRegistered).toBe(true);
      expect(syncManager.deviceId).toMatch(/^dev-/);
      expect(syncManager.deviceName).toBeDefined();
      expect(syncManager.vectorClock).toHaveProperty(syncManager.deviceId);
    });

    it('should allow custom device name', async () => {
      await syncManager.registerDevice('My iPhone');
      expect(syncManager.deviceName).toBe('My iPhone');
    });

    it('should update device name', async () => {
      await syncManager.registerDevice();
      await syncManager.setDeviceName('New Name');

      expect(syncManager.deviceName).toBe('New Name');
    });
  });

  describe('device ID generation', () => {
    it('should generate unique IDs', async () => {
      const manager1 = new DeviceSyncManager();
      const manager2 = new DeviceSyncManager();

      await manager1.registerDevice();
      await manager2.registerDevice();

      expect(manager1.deviceId).not.toBe(manager2.deviceId);
    });

    it('should have device ID format', async () => {
      await syncManager.registerDevice();

      expect(syncManager.deviceId).toMatch(/^dev-[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('data type configuration', () => {
    it('should define strategies for all data types', () => {
      const types = Object.keys(DATA_TYPE_CONFIG);

      expect(types).toContain('pantry');
      expect(types).toContain('mealPlan');
      expect(types).toContain('preferences');
      expect(types).toContain('recipeRatings');
    });

    it('should have valid conflict strategies', () => {
      const strategies = Object.values(DATA_TYPE_CONFIG).map((c) => c.strategy);
      const validStrategies = Object.values(CONFLICT_STRATEGIES);

      strategies.forEach((strategy) => {
        expect(validStrategies).toContain(strategy);
      });
    });
  });

  describe('vector clock operations', () => {
    beforeEach(async () => {
      await syncManager.registerDevice();
    });

    it('should start with vector clock of 0', () => {
      expect(syncManager.vectorClock[syncManager.deviceId]).toBe(0);
    });

    it('should increment vector clock on payload generation', async () => {
      await syncManager.generateSyncPayload();

      expect(syncManager.vectorClock[syncManager.deviceId]).toBe(1);
    });

    it('should merge vector clocks correctly', async () => {
      syncManager.vectorClock = { 'dev-a': 5 };

      syncManager.mergeVectorClock({ 'dev-a': 3, 'dev-b': 2 });

      expect(syncManager.vectorClock['dev-a']).toBe(5); // max
      expect(syncManager.vectorClock['dev-b']).toBe(2); // new
    });
  });

  describe('sync payload generation', () => {
    beforeEach(async () => {
      await syncManager.registerDevice();
    });

    it('should generate payload with required fields', async () => {
      const payload = await syncManager.generateSyncPayload();

      expect(payload.deviceId).toBe(syncManager.deviceId);
      expect(payload.timestamp).toBeGreaterThan(0);
      expect(payload.vectorClock).toBeDefined();
      expect(payload.data).toBeDefined();
    });

    it('should include all data types', async () => {
      const payload = await syncManager.generateSyncPayload();
      const dataTypes = Object.keys(DATA_TYPE_CONFIG);

      dataTypes.forEach((type) => {
        expect(payload.data).toHaveProperty(type);
      });
    });

    it('should wrap data with metadata', async () => {
      const payload = await syncManager.generateSyncPayload();

      expect(payload.data.mealPlan).toHaveProperty('value');
      expect(payload.data.mealPlan).toHaveProperty('timestamp');
      expect(payload.data.mealPlan).toHaveProperty('vectorClock');
    });
  });

  describe('sync payload application', () => {
    let sourceManager;

    beforeEach(async () => {
      await syncManager.registerDevice();
      sourceManager = new DeviceSyncManager();
      await sourceManager.registerDevice();
    });

    it('should reject own payload', async () => {
      const payload = await syncManager.generateSyncPayload();
      const result = await syncManager.applySyncPayload(payload);

      expect(result.applied).toBe(false);
      expect(result.reason).toBe('own-device');
    });

    it('should reject invalid payload', async () => {
      await expect(syncManager.applySyncPayload(null)).rejects.toThrow(
        'Invalid sync payload'
      );
    });

    it('should apply payload from other device', async () => {
      const payload = await sourceManager.generateSyncPayload();
      const result = await syncManager.applySyncPayload(payload);

      expect(result.applied).toBe(true);
      expect(result.results).toBeDefined();
    });

    it('should merge vector clocks from other device', async () => {
      const payload = await sourceManager.generateSyncPayload();

      await syncManager.applySyncPayload(payload);

      expect(syncManager.vectorClock[sourceManager.deviceId]).toBeDefined();
    });
  });

  describe('array merging', () => {
    it('should merge arrays by key field', () => {
      const local = [
        { name: 'apple', quantity: 2, updatedAt: 1000 },
        { name: 'banana', quantity: 3, updatedAt: 1000 },
      ];
      const incoming = [
        { name: 'banana', quantity: 5, updatedAt: 2000 }, // Newer
        { name: 'orange', quantity: 1, updatedAt: 2000 },
      ];

      const merged = syncManager.mergeArrays(local, incoming, 'name');

      expect(merged).toHaveLength(3);
      expect(merged.find((i) => i.name === 'apple').quantity).toBe(2);
      expect(merged.find((i) => i.name === 'banana').quantity).toBe(5); // Newer wins
      expect(merged.find((i) => i.name === 'orange').quantity).toBe(1);
    });

    it('should handle empty arrays', () => {
      const merged = syncManager.mergeArrays([], [], 'name');
      expect(merged).toEqual([]);
    });

    it('should use JSON key when no key field', () => {
      const local = [{ id: 1, value: 'a' }];
      const incoming = [{ id: 2, value: 'b' }];

      const merged = syncManager.mergeArrays(local, incoming);

      expect(merged).toHaveLength(2);
    });
  });

  describe('export/import', () => {
    beforeEach(async () => {
      await syncManager.registerDevice();
    });

    it('should export all data', async () => {
      const export_ = await syncManager.exportAllData();

      expect(export_.version).toBe('2.0');
      expect(export_.deviceId).toBe(syncManager.deviceId);
      expect(export_.exportDate).toBeGreaterThan(0);
      expect(export_.data).toBeDefined();
    });

    it('should include all data types in export', async () => {
      const export_ = await syncManager.exportAllData();

      Object.keys(DATA_TYPE_CONFIG).forEach((type) => {
        expect(export_.data).toHaveProperty(type);
      });
    });

    it('should reject invalid backup on import', async () => {
      await expect(syncManager.importAllData(null)).rejects.toThrow(
        'Invalid backup format'
      );
    });
  });

  describe('status and info', () => {
    beforeEach(async () => {
      await syncManager.registerDevice();
    });

    it('should get device info', () => {
      const info = syncManager.getDeviceInfo();

      expect(info.deviceId).toBe(syncManager.deviceId);
      expect(info.deviceName).toBe(syncManager.deviceName);
      expect(info.isRegistered).toBe(true);
    });

    it('should get sync status', () => {
      const status = syncManager.getStatus();

      expect(status.isRegistered).toBe(true);
      expect(status.deviceId).toBeDefined();
      expect(status.dataTypes).toEqual(Object.keys(DATA_TYPE_CONFIG));
    });
  });

  describe('pub-sub', () => {
    it('should notify on registration', async () => {
      const callback = jest.fn();
      syncManager.subscribe(callback);

      await syncManager.registerDevice();

      expect(callback).toHaveBeenCalledWith('registered', expect.any(Object));
    });

    it('should notify on device rename', async () => {
      await syncManager.registerDevice();

      const callback = jest.fn();
      syncManager.subscribe(callback);

      await syncManager.setDeviceName('New Name');

      expect(callback).toHaveBeenCalledWith('renamed', expect.any(Object));
    });

    it('should allow unsubscribing', async () => {
      const callback = jest.fn();
      const unsubscribe = syncManager.subscribe(callback);

      unsubscribe();
      await syncManager.registerDevice();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('conflict strategies', () => {
    beforeEach(async () => {
      await syncManager.registerDevice();
    });

    it('should define LAST_WRITE_WINS strategy', () => {
      expect(CONFLICT_STRATEGIES.LAST_WRITE_WINS).toBe('last-write-wins');
    });

    it('should define MERGE_ARRAYS strategy', () => {
      expect(CONFLICT_STRATEGIES.MERGE_ARRAYS).toBe('merge-arrays');
    });

    it('should define MAX_VALUE strategy', () => {
      expect(CONFLICT_STRATEGIES.MAX_VALUE).toBe('max-value');
    });

    it('should assign correct strategy to pantry', () => {
      expect(DATA_TYPE_CONFIG.pantry.strategy).toBe(
        CONFLICT_STRATEGIES.MERGE_ARRAYS
      );
      expect(DATA_TYPE_CONFIG.pantry.keyField).toBe('name');
    });

    it('should assign LAST_WRITE_WINS to preferences', () => {
      expect(DATA_TYPE_CONFIG.preferences.strategy).toBe(
        CONFLICT_STRATEGIES.LAST_WRITE_WINS
      );
    });

    it('should assign MAX_VALUE to recipe ratings', () => {
      expect(DATA_TYPE_CONFIG.recipeRatings.strategy).toBe(
        CONFLICT_STRATEGIES.MAX_VALUE
      );
    });
  });
});
