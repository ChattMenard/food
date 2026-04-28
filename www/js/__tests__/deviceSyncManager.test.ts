// @ts-check
/**
 * Device Sync Manager Tests
 * Tests for cross-device synchronization with conflict resolution
 */

import {
  DeviceSyncManager,
  CONFLICT_STRATEGIES,
  DATA_TYPE_CONFIG,
} from '../data/deviceSyncManager';

describe('DeviceSyncManager', () => {
  let syncManager: DeviceSyncManager;

  beforeEach(() => {
    syncManager = new DeviceSyncManager();
  });

  describe('initialization', () => {
    it('should start unregistered', () => {
      expect(syncManager.isRegisteredData).toBe(false);
      expect(syncManager.deviceIdData).toBeNull();
    });

    it('should generate device info after registration', async () => {
      await syncManager.registerDevice();

      expect(syncManager.isRegisteredData).toBe(true);
      expect(syncManager.deviceIdData).toMatch(/^dev-/);
      expect(syncManager.deviceNameData).toBeDefined();
      expect(syncManager.vectorClockData).toHaveProperty(syncManager.deviceIdData!);
    });

    it('should allow custom device name', async () => {
      await syncManager.registerDevice('My iPhone');
      expect(syncManager.deviceNameData).toBe('My iPhone');
    });

    it('should update device name', async () => {
      await syncManager.registerDevice();
      await syncManager.setDeviceName('New Name');

      expect(syncManager.deviceNameData).toBe('New Name');
    });
  });

  describe('device ID generation', () => {
    it('should generate unique IDs', async () => {
      const manager1 = new DeviceSyncManager();
      const manager2 = new DeviceSyncManager();

      await manager1.registerDevice();
      await manager2.registerDevice();

      expect(manager1.deviceIdData).not.toBe(manager2.deviceIdData);
    });

    it('should generate consistent IDs for same device', async () => {
      const deviceId = await syncManager.generateDeviceId();
      const deviceId2 = await syncManager.generateDeviceId();

      expect(deviceId).toBe(deviceId2);
    });
  });

  describe('vector clock management', () => {
    it('should increment clock on update', async () => {
      await syncManager.registerDevice();
      const initialClock = syncManager.vectorClockData[syncManager.deviceIdData!];

      syncManager.incrementClock();

      expect(syncManager.vectorClockData[syncManager.deviceIdData!]).toBe(initialClock + 1);
    });

    it('should merge vector clocks correctly', async () => {
      await syncManager.registerDevice();
      const otherClock = { 'other-device': 5 };
      
      syncManager.mergeVectorClock(otherClock);

      expect(syncManager.vectorClockData).toHaveProperty('other-device', 5);
      expect(syncManager.vectorClockData).toHaveProperty(syncManager.deviceIdData!, 1);
    });

    it('should take maximum value for clock entries', async () => {
      await syncManager.registerDevice();
      syncManager.vectorClockData[syncManager.deviceIdData!] = 3;
      
      const otherClock = { [syncManager.deviceIdData!]: 5, 'other': 2 };
      syncManager.mergeVectorClock(otherClock);

      expect(syncManager.vectorClockData[syncManager.deviceIdData!]).toBe(5);
    });
  });

  describe('data synchronization', () => {
    beforeEach(async () => {
      await syncManager.registerDevice();
    });

    it('should prepare data for sync with metadata', () => {
      const data = { name: 'Test Recipe', ingredients: ['chicken'] };
      const preparedData = syncManager.prepareDataForSync('recipes', data);

      expect(preparedData).toHaveProperty('data');
      expect(preparedData).toHaveProperty('deviceId');
      expect(preparedData).toHaveProperty('timestamp');
      expect(preparedData).toHaveProperty('vectorClock');
      expect(preparedData).toHaveProperty('version');
    });

    it('should increment version on data preparation', () => {
      const data = { id: '1', name: 'Test Recipe' };
      const prepared1 = syncManager.prepareDataForSync('recipes', data);
      const prepared2 = syncManager.prepareDataForSync('recipes', data);

      expect(prepared2.version).toBe(prepared1.version + 1);
    });

    it('should detect conflicts correctly', () => {
      const localData = {
        data: { name: 'Local Recipe' },
        deviceId: 'device1',
        timestamp: Date.now() - 1000,
        vectorClock: { device1: 2, device2: 1 }
      };

      const remoteData = {
        data: { name: 'Remote Recipe' },
        deviceId: 'device2',
        timestamp: Date.now(),
        vectorClock: { device1: 2, device2: 2 }
      };

      const hasConflict = syncManager.hasConflict(localData, remoteData);
      expect(hasConflict).toBe(true);
    });

    it('should resolve conflicts using latest-wins strategy', () => {
      const localData = {
        data: { name: 'Local Recipe' },
        deviceId: 'device1',
        timestamp: Date.now() - 1000,
        vectorClock: { device1: 2, device2: 1 }
      };

      const remoteData = {
        data: { name: 'Remote Recipe' },
        deviceId: 'device2',
        timestamp: Date.now(),
        vectorClock: { device1: 2, device2: 2 }
      };

      const resolved = syncManager.resolveConflict(localData, remoteData, CONFLICT_STRATEGIES.LATEST_WINS);
      expect(resolved.data.name).toBe('Remote Recipe');
    });

    it('should resolve conflicts using manual merge strategy', () => {
      const localData = {
        data: { name: 'Local Recipe', ingredients: ['chicken'] },
        deviceId: 'device1',
        timestamp: Date.now() - 1000,
        vectorClock: { device1: 2, device2: 1 }
      };

      const remoteData = {
        data: { name: 'Remote Recipe', ingredients: ['rice'] },
        deviceId: 'device2',
        timestamp: Date.now(),
        vectorClock: { device1: 2, device2: 2 }
      };

      const resolved = syncManager.resolveConflict(localData, remoteData, CONFLICT_STRATEGIES.MANUAL_MERGE);
      expect(resolved.data.name).toBe('Remote Recipe');
      expect(resolved.data.ingredients).toEqual(['rice']);
    });
  });

  describe('sync session management', () => {
    beforeEach(async () => {
      await syncManager.registerDevice();
    });

    it('should start sync session', () => {
      syncManager.startSyncSession();
      expect(syncManager.isSyncingData).toBe(true);
    });

    it('should end sync session', () => {
      syncManager.startSyncSession();
      syncManager.endSyncSession();
      expect(syncManager.isSyncingData).toBe(false);
    });

    it('should track sync statistics', () => {
      syncManager.recordSyncResult('recipes', 'success');
      syncManager.recordSyncResult('pantry', 'conflict');
      syncManager.recordSyncResult('meals', 'error');

      const stats = syncManager.getSyncStats();
      expect(stats.success).toBe(1);
      expect(stats.conflicts).toBe(1);
      expect(stats.errors).toBe(1);
    });

    it('should reset sync statistics', () => {
      syncManager.recordSyncResult('recipes', 'success');
      syncManager.resetSyncStats();
      
      const stats = syncManager.getSyncStats();
      expect(stats.success).toBe(0);
      expect(stats.conflicts).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });

  describe('data type configuration', () => {
    it('should have configuration for all data types', () => {
      expect(DATA_TYPE_CONFIG.recipes).toBeDefined();
      expect(DATA_TYPE_CONFIG.pantry).toBeDefined();
      expect(DATA_TYPE_CONFIG.meals).toBeDefined();
      expect(DATA_TYPE_CONFIG.preferences).toBeDefined();
    });

    it('should use correct conflict strategy for data type', () => {
      const recipeStrategy = DATA_TYPE_CONFIG.recipes.conflictStrategy;
      const pantryStrategy = DATA_TYPE_CONFIG.pantry.conflictStrategy;
      
      expect(recipeStrategy).toBe(CONFLICT_STRATEGIES.LATEST_WINS);
      expect(pantryStrategy).toBe(CONFLICT_STRATEGIES.MANUAL_MERGE);
    });

    it('should respect data type priority', () => {
      const recipePriority = DATA_TYPE_CONFIG.recipes.priority;
      const pantryPriority = DATA_TYPE_CONFIG.pantry.priority;
      
      expect(typeof recipePriority).toBe('number');
      expect(typeof pantryPriority).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should handle registration errors gracefully', async () => {
      // Mock a registration error
      const originalGenerateId = syncManager.generateDeviceId;
      syncManager.generateDeviceId = jest.fn().mockRejectedValue(new Error('Registration failed'));

      await expect(syncManager.registerDevice()).rejects.toThrow('Registration failed');
      
      // Restore original method
      syncManager.generateDeviceId = originalGenerateId;
    });

    it('should handle sync errors gracefully', () => {
      syncManager.startSyncSession();
      
      expect(() => syncManager.recordSyncResult('invalid-type', 'success')).not.toThrow();
      
      syncManager.endSyncSession();
    });
  });

  describe('cleanup and reset', () => {
    it('should reset sync manager state', async () => {
      await syncManager.registerDevice();
      syncManager.startSyncSession();
      syncManager.recordSyncResult('recipes', 'success');

      syncManager.reset();

      expect(syncManager.isRegisteredData).toBe(false);
      expect(syncManager.deviceIdData).toBeNull();
      expect(syncManager.isSyncingData).toBe(false);
      expect(syncManager.getSyncStats().success).toBe(0);
    });

    it('should cleanup resources', () => {
      syncManager.startSyncSession();
      syncManager.cleanup();
      
      expect(syncManager.isSyncingData).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle complete sync workflow', async () => {
      await syncManager.registerDevice();
      
      // Start sync session
      syncManager.startSyncSession();
      
      // Prepare data for sync
      const recipeData = { id: '1', name: 'Test Recipe' };
      const preparedData = syncManager.prepareDataForSync('recipes', recipeData);
      
      // Simulate receiving remote data
      const remoteData = {
        data: { id: '1', name: 'Updated Recipe' },
        deviceId: 'remote-device',
        timestamp: Date.now(),
        vectorClock: { 'remote-device': 2 }
      };
      
      // Handle conflict resolution
      const resolved = syncManager.resolveConflict(preparedData, remoteData, CONFLICT_STRATEGIES.LATEST_WINS);
      
      // Record sync result
      syncManager.recordSyncResult('recipes', 'success');
      
      // End sync session
      syncManager.endSyncSession();
      
      // Verify results
      expect(resolved.data.name).toBe('Updated Recipe');
      expect(syncManager.getSyncStats().success).toBe(1);
      expect(syncManager.isSyncingData).toBe(false);
    });
  });
});
