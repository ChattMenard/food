// @ts-check
import 'fake-indexeddb/auto';
import * as storageManager from '../data/storageManager';

const {
  checkStorageQuota,
  isStorageNearQuota,
  clearOldDatabaseData,
  withQuotaHandling,
  clearOldCaches,
  getStorageBreakdown,
  migrateToLocalStorage,
  showQuotaWarning,
  startStorageMonitoring,
} = storageManager;

const originalNavigator = global.navigator;
const originalCaches = global.caches;

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(global, 'navigator', {
    value: {
      storage: {
        estimate: jest.fn().mockResolvedValue({ usage: 200, quota: 1000 }),
      },
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(global, 'caches', {
    value: {
      keys: jest.fn().mockResolvedValue(['main-v1', 'misc-cache']),
      delete: jest.fn().mockResolvedValue(true),
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  jest.useRealTimers();
  if (originalNavigator) {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  }
  if (originalCaches) {
    Object.defineProperty(global, 'caches', {
      value: originalCaches,
      configurable: true,
    });
  }
});

describe('storageManager', () => {
  describe('checkStorageQuota', () => {
    it('returns storage quota information', async () => {
      const quota = await checkStorageQuota();
      
      expect(quota).toHaveProperty('usage');
      expect(quota).toHaveProperty('quota');
      expect(quota).toHaveProperty('percentage');
      expect(quota).toHaveProperty('available');
      
      expect(quota.usage).toBe(200);
      expect(quota.quota).toBe(1000);
      expect(quota.percentage).toBe(20);
      expect(quota.available).toBe(800);
    });

    it('handles missing storage API', async () => {
      delete (global.navigator as any).storage;
      
      const quota = await checkStorageQuota();
      
      expect(quota.usage).toBe(0);
      expect(quota.quota).toBe(0);
      expect(quota.percentage).toBe(0);
    });

    it('handles quota estimation errors', async () => {
      (global.navigator.storage.estimate as jest.Mock).mockRejectedValue(new Error('Quota error'));
      
      const quota = await checkStorageQuota();
      
      expect(quota.usage).toBe(0);
      expect(quota.quota).toBe(0);
    });
  });

  describe('isStorageNearQuota', () => {
    it('returns false when storage is not near quota', async () => {
      const nearQuota = await isStorageNearQuota();
      expect(nearQuota).toBe(false);
    });

    it('returns true when storage is near quota', async () => {
      (global.navigator.storage.estimate as jest.Mock).mockResolvedValue({ usage: 900, quota: 1000 });
      
      const nearQuota = await isStorageNearQuota();
      expect(nearQuota).toBe(true);
    });

    it('uses custom threshold', async () => {
      (global.navigator.storage.estimate as jest.Mock).mockResolvedValue({ usage: 600, quota: 1000 });
      
      const nearQuota = await isStorageNearQuota(0.5);
      expect(nearQuota).toBe(true);
    });
  });

  describe('clearOldDatabaseData', () => {
    it('clears old IndexedDB databases', async () => {
      const mockDatabases = [
        { name: 'old-db-v1', version: 1 },
        { name: 'current-db', version: 2 },
      ];

      const mockIndexedDB = {
        databases: jest.fn().mockResolvedValue(mockDatabases),
        deleteDatabase: jest.fn().mockReturnValue({}),
      };

      Object.defineProperty(global, 'indexedDB', {
        value: mockIndexedDB,
        configurable: true,
        writable: true,
      });

      await clearOldDatabaseData();
      
      expect(mockIndexedDB.databases).toHaveBeenCalled();
      expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith('old-db-v1');
    });

    it('handles missing IndexedDB', async () => {
      delete (global as any).indexedDB;
      
      await expect(clearOldDatabaseData()).resolves.toBeUndefined();
    });

    it('handles database errors', async () => {
      const mockIndexedDB = {
        databases: jest.fn().mockRejectedValue(new Error('Database error')),
        deleteDatabase: jest.fn(),
      };

      Object.defineProperty(global, 'indexedDB', {
        value: mockIndexedDB,
        configurable: true,
        writable: true,
      });

      await expect(clearOldDatabaseData()).resolves.toBeUndefined();
    });
  });

  describe('withQuotaHandling', () => {
    it('executes function when quota is available', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await withQuotaHandling(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();
    });

    it('clears data when quota exceeded', async () => {
      (global.navigator.storage.estimate as jest.Mock).mockResolvedValue({ usage: 950, quota: 1000 });
      
      const mockFn = jest.fn().mockResolvedValue('success');
      const mockClearData = jest.fn().mockResolvedValue(undefined);
      
      // Mock the clear functions
      (storageManager as any).clearOldDatabaseData = mockClearData;
      (storageManager as any).clearOldCaches = jest.fn().mockResolvedValue(undefined);
      
      await withQuotaHandling(mockFn);
      
      expect(mockClearData).toHaveBeenCalled();
    });

    it('retries function after clearing data', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call fails with quota error
          const error = new Error('Quota exceeded');
          (error as any).name = 'QuotaExceededError';
          throw error;
        }
        return 'success';
      });

      const mockClearData = jest.fn().mockResolvedValue(undefined);
      (storageManager as any).clearOldDatabaseData = mockClearData;
      (storageManager as any).clearOldCaches = jest.fn().mockResolvedValue(undefined);
      
      const result = await withQuotaHandling(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockClearData).toHaveBeenCalled();
    });

    it('throws error if retry fails', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Quota exceeded'));
      const mockClearData = jest.fn().mockResolvedValue(undefined);
      
      (storageManager as any).clearOldDatabaseData = mockClearData;
      (storageManager as any).clearOldCaches = jest.fn().mockResolvedValue(undefined);
      
      await expect(withQuotaHandling(mockFn)).rejects.toThrow('Quota exceeded');
    });
  });

  describe('clearOldCaches', () => {
    it('deletes old cache versions', async () => {
      (global.caches.keys as jest.Mock).mockResolvedValue(['main-v1', 'main-v2', 'main-current']);
      
      await clearOldCaches('main');
      
      expect(global.caches.delete).toHaveBeenCalledWith('main-v1');
      expect(global.caches.delete).toHaveBeenCalledWith('main-v2');
      expect(global.caches.delete).not.toHaveBeenCalledWith('main-current');
    });

    it('handles missing caches API', async () => {
      delete (global as any).caches;
      
      await expect(clearOldCaches()).resolves.toBeUndefined();
    });

    it('handles cache deletion errors', async () => {
      (global.caches.delete as jest.Mock).mockRejectedValue(new Error('Cache error'));
      
      await expect(clearOldCaches()).resolves.toBeUndefined();
    });
  });

  describe('getStorageBreakdown', () => {
    it('returns detailed storage breakdown', async () => {
      const breakdown = await getStorageBreakdown();
      
      expect(breakdown).toHaveProperty('total');
      expect(breakdown).toHaveProperty('quota');
      expect(breakdown).toHaveProperty('usage');
      expect(breakdown).toHaveProperty('available');
      expect(breakdown).toHaveProperty('percentage');
      
      expect(breakdown.total).toBe(200);
      expect(breakdown.quota).toBe(1000);
      expect(breakdown.percentage).toBe(20);
    });

    it('includes cache information', async () => {
      const breakdown = await getStorageBreakdown();
      
      expect(breakdown).toHaveProperty('caches');
      expect(Array.isArray(breakdown.caches)).toBe(true);
    });

    it('includes database information', async () => {
      const mockDatabases = [
        { name: 'db1', version: 1 },
        { name: 'db2', version: 2 },
      ];

      const mockIndexedDB = {
        databases: jest.fn().mockResolvedValue(mockDatabases),
      };

      Object.defineProperty(global, 'indexedDB', {
        value: mockIndexedDB,
        configurable: true,
        writable: true,
      });

      const breakdown = await getStorageBreakdown();
      
      expect(breakdown).toHaveProperty('databases');
      expect(breakdown.databases).toHaveLength(2);
    });
  });

  describe('migrateToLocalStorage', () => {
    it('migrates data to localStorage', async () => {
      const mockData = { key: 'value' };
      
      const result = await migrateToLocalStorage('test-key', mockData);
      
      expect(result).toBe(true);
      expect(localStorage.getItem('test-key')).toBe(JSON.stringify(mockData));
    });

    it('handles localStorage quota exceeded', async () => {
      const largeData = 'x'.repeat(10000000);
      
      // Mock localStorage quota error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        const error = new Error('Quota exceeded');
        (error as any).name = 'QuotaExceededError';
        throw error;
      });

      const result = await migrateToLocalStorage('test-key', largeData);
      
      expect(result).toBe(false);
      
      // Restore original setItem
      localStorage.setItem = originalSetItem;
    });

    it('handles serialization errors', async () => {
      const circularData = {};
      circularData.self = circularData;
      
      const result = await migrateToLocalStorage('test-key', circularData);
      
      expect(result).toBe(false);
    });
  });

  describe('showQuotaWarning', () => {
    it('displays quota warning', () => {
      const mockAlert = jest.fn();
      (global as any).alert = mockAlert;
      
      showQuotaWarning();
      
      expect(mockAlert).toHaveBeenCalled();
      expect(mockAlert.mock.calls[0][0]).toContain('storage');
    });

    it('uses custom message', () => {
      const mockAlert = jest.fn();
      (global as any).alert = mockAlert;
      
      const customMessage = 'Custom storage warning';
      showQuotaWarning(customMessage);
      
      expect(mockAlert).toHaveBeenCalledWith(customMessage);
    });

    it('handles missing alert function', () => {
      delete (global as any).alert;
      
      expect(() => showQuotaWarning()).not.toThrow();
    });
  });

  describe('startStorageMonitoring', () => {
    it('starts monitoring storage usage', () => {
      const mockCallback = jest.fn();
      
      const stopMonitoring = startStorageMonitoring(mockCallback, 1000);
      
      expect(typeof stopMonitoring).toBe('function');
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      expect(mockCallback).toHaveBeenCalled();
    });

    it('stops monitoring when called', () => {
      const mockCallback = jest.fn();
      
      const stopMonitoring = startStorageMonitoring(mockCallback, 1000);
      
      // Stop monitoring
      stopMonitoring();
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('handles monitoring errors gracefully', () => {
      (global.navigator.storage.estimate as jest.Mock).mockRejectedValue(new Error('Monitoring error'));
      
      const mockCallback = jest.fn();
      
      const stopMonitoring = startStorageMonitoring(mockCallback, 1000);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0]).toHaveProperty('error');
    });

    it('uses default interval', () => {
      const mockCallback = jest.fn();
      
      const stopMonitoring = startStorageMonitoring(mockCallback);
      
      // Fast-forward time (default 5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('handles complete quota management workflow', async () => {
      // Check quota
      const quota = await checkStorageQuota();
      expect(quota.percentage).toBe(20);
      
      // Check if near quota
      const nearQuota = await isStorageNearQuota();
      expect(nearQuota).toBe(false);
      
      // Execute function with quota handling
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await withQuotaHandling(mockFn);
      expect(result).toBe('success');
      
      // Get storage breakdown
      const breakdown = await getStorageBreakdown();
      expect(breakdown).toHaveProperty('total');
    });

    it('handles quota exceeded scenario', async () => {
      // Simulate quota exceeded
      (global.navigator.storage.estimate as jest.Mock).mockResolvedValue({ usage: 950, quota: 1000 });
      
      const mockFn = jest.fn().mockRejectedValue(new Error('Quota exceeded'));
      const mockClearData = jest.fn().mockResolvedValue(undefined);
      
      (storageManager as any).clearOldDatabaseData = mockClearData;
      (storageManager as any).clearOldCaches = jest.fn().mockResolvedValue(undefined);
      
      await expect(withQuotaHandling(mockFn)).rejects.toThrow('Quota exceeded');
      expect(mockClearData).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles zero quota', async () => {
      (global.navigator.storage.estimate as jest.Mock).mockResolvedValue({ usage: 0, quota: 0 });
      
      const quota = await checkStorageQuota();
      expect(quota.usage).toBe(0);
      expect(quota.quota).toBe(0);
      expect(quota.percentage).toBe(0);
    });

    it('handles negative usage', async () => {
      (global.navigator.storage.estimate as jest.Mock).mockResolvedValue({ usage: -100, quota: 1000 });
      
      const quota = await checkStorageQuota();
      expect(quota.usage).toBe(0); // Should normalize to 0
    });

    it('handles very large numbers', async () => {
      (global.navigator.storage.estimate as jest.Mock).mockResolvedValue({ 
        usage: Number.MAX_SAFE_INTEGER, 
        quota: Number.MAX_SAFE_INTEGER 
      });
      
      const quota = await checkStorageQuota();
      expect(quota.usage).toBe(Number.MAX_SAFE_INTEGER);
      expect(quota.quota).toBe(Number.MAX_SAFE_INTEGER);
      expect(quota.percentage).toBe(100);
    });
  });
});
