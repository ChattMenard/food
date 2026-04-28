// @ts-check
import {
  BackgroundSyncManager,
  getBackgroundSyncManager,
} from '../utils/backgroundSync.js';

// Mock navigator and window for testing
global.navigator = {
  onLine: true,
  serviceWorker: {
    ready: Promise.resolve({
      periodicSync: {
        register: jest.fn().mockResolvedValue(),
      },
    }),
  },
};

global.window = {
  addEventListener: jest.fn(),
};

global.document = {
  addEventListener: jest.fn(),
  hidden: false,
};

global.Notification = jest.fn(function (title, options) {
  this.title = title;
  this.options = options;
});
global.Notification.permission = 'granted';

describe('BackgroundSyncManager', () => {
  let syncManager;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    syncManager = new BackgroundSyncManager();
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with empty sync queue', () => {
      expect(syncManager.syncQueue).toEqual([]);
      expect(syncManager.isSyncing).toBe(false);
      expect(syncManager.storageKey).toBe('main-sync-queue');
    });

    it('sets up event listeners', () => {
      // Just verify the constructor doesn't throw
      expect(() => new BackgroundSyncManager()).not.toThrow();
    });
  });

  describe('loadSyncQueue', () => {
    it('loads queue from localStorage', () => {
      const queue = [
        {
          id: 1,
          type: 'mealPlan',
          data: {},
          timestamp: Date.now(),
          attempts: 0,
        },
      ];
      localStorage.setItem('main-sync-queue', JSON.stringify(queue));

      const newManager = new BackgroundSyncManager();
      expect(newManager.syncQueue).toEqual(queue);
    });

    it('handles corrupted data gracefully', () => {
      localStorage.setItem('main-sync-queue', 'invalid json');
      expect(() => new BackgroundSyncManager()).not.toThrow();
    });

    it('handles missing data gracefully', () => {
      expect(() => new BackgroundSyncManager()).not.toThrow();
    });
  });

  describe('saveSyncQueue', () => {
    it('saves queue to localStorage', () => {
      syncManager.syncQueue = [{ id: 1, type: 'test', data: {} }];
      syncManager.saveSyncQueue();
      const saved = localStorage.getItem('main-sync-queue');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved)).toEqual(syncManager.syncQueue);
    });

    it('handles save errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });
      expect(() => syncManager.saveSyncQueue()).not.toThrow();
      localStorage.setItem = originalSetItem;
    });
  });

  describe('queueSync', () => {
    it('queues a sync operation', () => {
      syncManager.queueSync('mealPlan', { id: 1 });
      expect(syncManager.syncQueue).toHaveLength(1);
      expect(syncManager.syncQueue[0].type).toBe('mealPlan');
    });

    it('generates unique IDs for sync items', () => {
      syncManager.queueSync('mealPlan', { id: 1 });
      syncManager.queueSync('pantry', { id: 2 });
      expect(syncManager.syncQueue[0].id).not.toBe(syncManager.syncQueue[1].id);
    });

    it('sets timestamp on sync items', () => {
      syncManager.queueSync('mealPlan', { id: 1 });
      expect(syncManager.syncQueue[0].timestamp).toBeDefined();
    });

    it('initializes attempts to 0', () => {
      syncManager.queueSync('mealPlan', { id: 1 });
      expect(syncManager.syncQueue[0].attempts).toBe(0);
    });

    it('saves queue after adding item', () => {
      syncManager.queueSync('mealPlan', { id: 1 });
      const saved = localStorage.getItem('main-sync-queue');
      expect(saved).toBeTruthy();
    });
  });

  describe('syncMealPlan', () => {
    it('queues meal plan sync', () => {
      syncManager.syncMealPlan({ id: 1, date: '2024-01-01' });
      expect(syncManager.syncQueue).toHaveLength(1);
      expect(syncManager.syncQueue[0].type).toBe('mealPlan');
    });
  });

  describe('syncPantry', () => {
    it('queues pantry sync', () => {
      syncManager.syncPantry([{ id: 1, name: 'Chicken' }]);
      expect(syncManager.syncQueue).toHaveLength(1);
      expect(syncManager.syncQueue[0].type).toBe('pantry');
    });
  });

  describe('syncPreferences', () => {
    it('queues preferences sync', () => {
      syncManager.syncPreferences({ diet: 'vegetarian' });
      expect(syncManager.syncQueue).toHaveLength(1);
      expect(syncManager.syncQueue[0].type).toBe('preferences');
    });
  });

  describe('syncAll', () => {
    it('does not sync if already syncing', async () => {
      syncManager.isSyncing = true;
      syncManager.syncQueue = [{ id: 1, type: 'mealPlan', data: {} }];
      await syncManager.syncAll();
      expect(syncManager.syncQueue).toHaveLength(1);
    });

    it('does not sync if offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      syncManager.syncQueue = [{ id: 1, type: 'mealPlan', data: {} }];
      await syncManager.syncAll();
      expect(syncManager.syncQueue).toHaveLength(1);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    it('processes all sync items', async () => {
      syncManager.syncQueue = [
        {
          id: 1,
          type: 'mealPlan',
          data: {},
          timestamp: Date.now(),
          attempts: 0,
        },
        { id: 2, type: 'pantry', data: [], timestamp: Date.now(), attempts: 0 },
      ];
      await syncManager.syncAll();
      expect(syncManager.syncQueue).toHaveLength(0);
    });

    it('removes successful items from queue', async () => {
      syncManager.syncQueue = [
        {
          id: 1,
          type: 'mealPlan',
          data: {},
          timestamp: Date.now(),
          attempts: 0,
        },
      ];
      await syncManager.syncAll();
      expect(syncManager.syncQueue).toHaveLength(0);
    });

    it('keeps failed items in queue', async () => {
      syncManager.syncQueue = [
        {
          id: 1,
          type: 'unknown',
          data: {},
          timestamp: Date.now(),
          attempts: 0,
        },
      ];
      await syncManager.syncAll();
      expect(syncManager.syncQueue).toHaveLength(1);
    });

    it('increments attempt count on failure', async () => {
      syncManager.syncQueue = [
        {
          id: 1,
          type: 'unknown',
          data: {},
          timestamp: Date.now(),
          attempts: 0,
        },
      ];
      await syncManager.syncAll();
      expect(syncManager.syncQueue[0].attempts).toBe(1);
    });

    it('removes items after max attempts', async () => {
      syncManager.syncQueue = [
        {
          id: 1,
          type: 'unknown',
          data: {},
          timestamp: Date.now(),
          attempts: 5,
        },
      ];
      await syncManager.syncAll();
      expect(syncManager.syncQueue).toHaveLength(0);
    });

    it('resets isSyncing flag after completion', async () => {
      syncManager.syncQueue = [
        {
          id: 1,
          type: 'mealPlan',
          data: {},
          timestamp: Date.now(),
          attempts: 0,
        },
      ];
      await syncManager.syncAll();
      expect(syncManager.isSyncing).toBe(false);
    });
  });

  describe('processSyncItem', () => {
    it('processes mealPlan items', async () => {
      const item = { type: 'mealPlan', data: {} };
      await expect(syncManager.processSyncItem(item)).resolves.toBeUndefined();
    });

    it('processes pantry items', async () => {
      const item = { type: 'pantry', data: [] };
      await expect(syncManager.processSyncItem(item)).resolves.toBeUndefined();
    });

    it('processes preferences items', async () => {
      const item = { type: 'preferences', data: {} };
      await expect(syncManager.processSyncItem(item)).resolves.toBeUndefined();
    });

    it('throws error for unknown types', async () => {
      const item = { type: 'unknown', data: {} };
      await expect(syncManager.processSyncItem(item)).rejects.toThrow(
        'Unknown sync type: unknown'
      );
    });
  });

  describe('notifySyncComplete', () => {
    it('shows notification when permission granted', () => {
      syncManager.notifySyncComplete(5);
      expect(global.Notification).toHaveBeenCalled();
    });

    it('does not throw when notifications not available', () => {
      const originalNotification = global.Notification;
      delete global.Notification;
      delete window.Notification;
      expect(() => syncManager.notifySyncComplete(5)).not.toThrow();
      global.Notification = originalNotification;
      window.Notification = originalNotification;
    });
  });

  describe('startPeriodicSync', () => {
    it('starts periodic sync interval', () => {
      jest.useFakeTimers();
      syncManager.startPeriodicSync(1000);
      expect(syncManager.syncInterval).toBeTruthy();
      jest.useRealTimers();
    });

    it('clears existing interval before starting new one', () => {
      jest.useFakeTimers();
      syncManager.startPeriodicSync(1000);
      const firstInterval = syncManager.syncInterval;
      syncManager.startPeriodicSync(2000);
      expect(syncManager.syncInterval).not.toBe(firstInterval);
      jest.useRealTimers();
    });
  });

  describe('stopPeriodicSync', () => {
    it('stops periodic sync', () => {
      jest.useFakeTimers();
      syncManager.startPeriodicSync(1000);
      syncManager.stopPeriodicSync();
      expect(syncManager.syncInterval).toBe(null);
      jest.useRealTimers();
    });

    it('does not throw when no interval is running', () => {
      expect(() => syncManager.stopPeriodicSync()).not.toThrow();
    });
  });

  describe('getSyncStatus', () => {
    it('returns sync status', () => {
      syncManager.syncQueue = [{ id: 1 }, { id: 2 }];
      syncManager.isSyncing = true;
      localStorage.setItem('main-last-sync', Date.now().toString());

      const status = syncManager.getSyncStatus();
      expect(status.pending).toBe(2);
      expect(status.isSyncing).toBe(true);
      expect(status.lastSync).toBeTruthy();
    });

    it('returns zero pending when queue is empty', () => {
      const status = syncManager.getSyncStatus();
      expect(status.pending).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('clears sync queue', () => {
      syncManager.syncQueue = [{ id: 1 }, { id: 2 }];
      syncManager.clearQueue();
      expect(syncManager.syncQueue).toEqual([]);
    });

    it('removes queue from localStorage', () => {
      syncManager.syncQueue = [{ id: 1 }];
      syncManager.saveSyncQueue();
      syncManager.clearQueue();
      const saved = localStorage.getItem('main-sync-queue');
      expect(saved).toBe('[]');
    });
  });

  describe('getBackgroundSyncManager', () => {
    it('returns singleton instance', () => {
      const instance1 = getBackgroundSyncManager();
      const instance2 = getBackgroundSyncManager();
      expect(instance1).toBe(instance2);
    });
  });
});
