import 'fake-indexeddb/auto';
import * as storageManager from '../data/storageManager.js';

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
  jest.restoreAllMocks();
});

describe('checkStorageQuota & isStorageNearQuota', () => {
  it('returns usage metrics from navigator storage', async () => {
    const result = await checkStorageQuota();
    expect(result).toEqual({ usage: 200, quota: 1000, usagePercentage: 20 });
    expect(navigator.storage.estimate).toHaveBeenCalled();
  });

  it('falls back to zeros when storage API missing', async () => {
    Object.defineProperty(global, 'navigator', { value: {}, configurable: true });
    const result = await checkStorageQuota();
    expect(result).toEqual({ usage: 0, quota: 0, usagePercentage: 0 });
  });

  it('detects when usage exceeds threshold', async () => {
    const spy = jest.spyOn(storageManager, 'checkStorageQuota').mockResolvedValue({ usagePercentage: 95 });
    const nearQuota = await isStorageNearQuota(90);
    expect(nearQuota).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('clearOldDatabaseData', () => {
  it('deletes IndexedDB database successfully', async () => {
    await expect(clearOldDatabaseData('storage-test-db')).resolves.toBeUndefined();
  });
});

describe('withQuotaHandling', () => {
  it('retries on quota errors and succeeds', async () => {
    const onQuotaExceeded = jest.fn();
    const operation = jest
      .fn()
      .mockRejectedValueOnce({ name: 'QuotaExceededError' })
      .mockResolvedValueOnce('saved');

    const result = await withQuotaHandling(operation, { onQuotaExceeded });

    expect(result).toBe('saved');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onQuotaExceeded).toHaveBeenCalledTimes(1);
  });

  it('falls back to localStorage when enabled', async () => {
    const operation = jest.fn(async (useLocalStorage = false) => {
      if (!useLocalStorage) {
        throw { name: 'QuotaExceededError' };
      }
      return 'local-storage';
    });

    const result = await withQuotaHandling(operation, { fallbackToLocalStorage: true, maxRetries: 2 });
    expect(result).toBe('local-storage');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('throws non-quota errors immediately', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(withQuotaHandling(operation)).rejects.toThrow('boom');
  });
});

describe('clearOldCaches', () => {
  it('removes caches with main prefix', async () => {
    await clearOldCaches();
    expect(caches.keys).toHaveBeenCalled();
    expect(caches.delete).toHaveBeenCalledWith('main-v1');
    expect(caches.delete).not.toHaveBeenCalledWith('misc-cache');
  });
});

describe('getStorageBreakdown', () => {
  it('returns usage details when available', async () => {
    navigator.storage.estimate.mockResolvedValue({
      usageDetails: { indexedDB: 100, caches: 50, serviceWorkers: 10 },
    });
    const breakdown = await getStorageBreakdown();
    expect(breakdown).toEqual({ indexedDB: 100, cache: 50, serviceWorkers: 10 });
  });
});

describe('migrateToLocalStorage', () => {
  it('exports a store to localStorage', async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('migration-db', 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.createObjectStore('items', { keyPath: 'id' });
        store.put({ id: 'item-1', name: 'Test Item' });
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = reject;
    });

    await migrateToLocalStorage('migration-db', 'items', 'legacy-items');
    const stored = JSON.parse(localStorage.getItem('legacy-items'));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Test Item');
  });
});

describe('quota warnings & monitoring', () => {
  it('injects warning into DOM', () => {
    showQuotaWarning(92.5);
    const warning = document.querySelector('.fixed.top-4.right-4');
    expect(warning).not.toBeNull();
    jest.runAllTimers();
  });

  it('monitors storage and fires warnings', async () => {
    jest.spyOn(storageManager, 'checkStorageQuota').mockResolvedValue({ usagePercentage: 90 });
    const warnSpy = jest.spyOn(storageManager, 'showQuotaWarning').mockImplementation(() => {});

    const stop = startStorageMonitoring(1000, 80);

    await Promise.resolve();
    jest.advanceTimersByTime(0);

    expect(warnSpy).toHaveBeenCalled();

    stop();
    warnSpy.mockRestore();
  });
});
