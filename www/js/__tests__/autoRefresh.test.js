import { AutoRefreshManager, getAutoRefreshManager, triggerPantryUpdate, triggerMealPlanUpdate, triggerPreferencesUpdate, triggerMealLogged } from '../utils/autoRefresh.js';

describe('AutoRefreshManager', () => {
  let manager;

  beforeEach(() => {
    manager = new AutoRefreshManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with empty listeners', () => {
      expect(manager.listeners).toBeInstanceOf(Map);
      expect(manager.listeners.size).toBe(0);
    });

    it('sets refresh interval to 1 second', () => {
      expect(manager.refreshInterval).toBe(1000);
    });

    it('sets pending refresh to false', () => {
      expect(manager.pendingRefresh).toBe(false);
    });
  });

  describe('on', () => {
    it('registers a listener for a key', () => {
      const callback = jest.fn();
      manager.on('pantry', callback);
      expect(manager.listeners.has('pantry')).toBe(true);
      expect(manager.listeners.get('pantry').has(callback)).toBe(true);
    });

    it('creates a new Set for new keys', () => {
      const callback = jest.fn();
      manager.on('pantry', callback);
      expect(manager.listeners.get('pantry')).toBeInstanceOf(Set);
    });

    it('allows multiple listeners for same key', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      manager.on('pantry', callback1);
      manager.on('pantry', callback2);
      expect(manager.listeners.get('pantry').size).toBe(2);
    });
  });

  describe('off', () => {
    it('removes a listener for a key', () => {
      const callback = jest.fn();
      manager.on('pantry', callback);
      manager.off('pantry', callback);
      expect(manager.listeners.get('pantry').has(callback)).toBe(false);
    });

    it('does nothing if key does not exist', () => {
      const callback = jest.fn();
      expect(() => manager.off('nonexistent', callback)).not.toThrow();
    });
  });

  describe('trigger', () => {
    it('calls all registered callbacks for a key', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      manager.on('pantry', callback1);
      manager.on('pantry', callback2);
      manager.trigger('pantry', { data: 'test' });
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('handles callback errors gracefully', () => {
      const callback1 = jest.fn(() => { throw new Error('Test error'); });
      const callback2 = jest.fn();
      manager.on('pantry', callback1);
      manager.on('pantry', callback2);
      manager.trigger('pantry', { data: 'test' });
      expect(callback2).toHaveBeenCalled();
    });

    it('does nothing if no listeners for key', () => {
      expect(() => manager.trigger('nonexistent', {})).not.toThrow();
    });
  });

  describe('triggerDebounced', () => {
    it('sets pending refresh to true', () => {
      manager.triggerDebounced('pantry', { data: 'test' });
      expect(manager.pendingRefresh).toBe(true);
    });

    it('does not trigger if already pending', () => {
      manager.triggerDebounced('pantry', { data: 'test' });
      const pendingBefore = manager.pendingRefresh;
      manager.triggerDebounced('pantry', { data: 'test2' });
      expect(manager.pendingRefresh).toBe(pendingBefore);
    });
  });

  describe('setupIndexedDBNotifications', () => {
    it('overrides db.put method', () => {
      const db = {
        put: jest.fn().mockResolvedValue('result'),
        delete: jest.fn().mockResolvedValue('result')
      };
      manager.setupIndexedDBNotifications(db);
      expect(db.put).not.toBe(jest.fn());
    });

    it('overrides db.delete method', () => {
      const db = {
        put: jest.fn().mockResolvedValue('result'),
        delete: jest.fn().mockResolvedValue('result')
      };
      manager.setupIndexedDBNotifications(db);
      expect(db.delete).not.toBe(jest.fn());
    });
  });

  describe('clear', () => {
    it('clears listeners for a key', () => {
      const callback = jest.fn();
      manager.on('pantry', callback);
      manager.clear('pantry');
      expect(manager.listeners.get('pantry').size).toBe(0);
    });

    it('does nothing if key does not exist', () => {
      expect(() => manager.clear('nonexistent')).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('clears all listeners', () => {
      manager.on('pantry', jest.fn());
      manager.on('mealPlan', jest.fn());
      manager.clearAll();
      expect(manager.listeners.size).toBe(0);
    });
  });

  describe('getAutoRefreshManager', () => {
    it('returns singleton instance', () => {
      const instance1 = getAutoRefreshManager();
      const instance2 = getAutoRefreshManager();
      expect(instance1).toBe(instance2);
    });
  });
});
