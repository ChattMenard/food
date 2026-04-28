// @ts-check
import { CacheManager, aiCache, apiCache } from '../utils/cacheManager.js;

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager({ ttl: 1000, maxSize: 3 });
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('constructor', () => {
    it('initializes with default options', () => {
      const defaultCache = new CacheManager();
      expect(defaultCache.ttl).toBe(30 * 60 * 1000);
      expect(defaultCache.maxSize).toBe(50);
      expect(defaultCache.storageKey).toBe('app-cache');
    });

    it('initializes with custom options', () => {
      expect(cache.ttl).toBe(1000);
      expect(cache.maxSize).toBe(3);
      expect(cache.storageKey).toBe('app-cache');
    });

    it('initializes empty cache', () => {
      expect(cache.cache.size).toBe(0);
    });
  });

  describe('get', () => {
    it('returns null for non-existent key', () => {
      expect(cache.get('nonexistent')).toBe(null);
    });

    it('returns cached value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('returns null for expired entry', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(1100);
      expect(cache.get('key1')).toBe(null);
      jest.useRealTimers();
    });

    it('updates access count on get', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      const entry = cache.cache.get('key1');
      expect(entry.accessCount).toBe(1);
    });

    it('updates last access time on get', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      const beforeTime = cache.cache.get('key1').lastAccessed;
      jest.advanceTimersByTime(100);
      cache.get('key1');
      const afterTime = cache.cache.get('key1').lastAccessed;
      expect(afterTime).toBeGreaterThan(beforeTime);
      jest.useRealTimers();
    });
  });

  describe('set', () => {
    it('sets value in cache', () => {
      cache.set('key1', 'value1');
      expect(cache.cache.has('key1')).toBe(true);
      expect(cache.cache.get('key1').value).toBe('value1');
    });

    it('evicts LRU entry when at capacity', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(100);
      cache.set('key2', 'value2');
      jest.advanceTimersByTime(100);
      cache.set('key3', 'value3');
      jest.advanceTimersByTime(100);
      cache.set('key4', 'value4');
      expect(cache.cache.size).toBe(3);
      expect(cache.cache.has('key1')).toBe(false);
      jest.useRealTimers();
    });

    it('updates existing key without eviction', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key1', 'updated');
      expect(cache.cache.size).toBe(3);
      expect(cache.get('key1')).toBe('updated');
    });

    it('sets timestamp and access count', () => {
      cache.set('key1', 'value1');
      const entry = cache.cache.get('key1');
      expect(entry.timestamp).toBeDefined();
      expect(entry.lastAccessed).toBeDefined();
      expect(entry.accessCount).toBe(0);
    });
  });

  describe('evictLRU', () => {
    it('removes least recently used entry', () => {
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(100);
      cache.set('key2', 'value2');
      jest.advanceTimersByTime(100);
      cache.set('key3', 'value3');
      cache.evictLRU();
      expect(cache.cache.has('key1')).toBe(false);
      expect(cache.cache.size).toBe(2);
    });

    it('does nothing if cache is empty', () => {
      expect(() => cache.evictLRU()).not.toThrow();
      expect(cache.cache.size).toBe(0);
    });
  });

  describe('cleanExpired', () => {
    it('removes expired entries', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(1100);
      const count = cache.cleanExpired();
      expect(count).toBe(1);
      expect(cache.cache.size).toBe(0);
      jest.useRealTimers();
    });

    it('keeps non-expired entries', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(500);
      const count = cache.cleanExpired();
      expect(count).toBe(0);
      expect(cache.cache.size).toBe(1);
      jest.useRealTimers();
    });

    it('returns count of expired entries', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      jest.advanceTimersByTime(1100);
      const count = cache.cleanExpired();
      expect(count).toBe(2);
      jest.useRealTimers();
    });
  });

  describe('clear', () => {
    it('clears all cache entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.cache.size).toBe(0);
    });

    it('removes cache from localStorage', () => {
      cache.set('key1', 'value1');
      cache.clear();
      expect(localStorage.getItem('app-cache')).toBe(null);
    });
  });

  describe('getStats', () => {
    it('returns cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.ttl).toBe(1000);
      expect(stats.expired).toBe(0);
    });

    it('calculates average access count', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      cache.set('key2', 'value2');
      cache.get('key2');
      const stats = cache.getStats();
      expect(stats.avgAccessCount).toBe(1.5);
    });

    it('returns zero average for empty cache', () => {
      const stats = cache.getStats();
      expect(stats.avgAccessCount).toBe(0);
    });

    it('counts expired entries', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(1100);
      const stats = cache.getStats();
      expect(stats.expired).toBe(1);
      jest.useRealTimers();
    });
  });

  describe('saveToStorage', () => {
    it('saves cache to localStorage', () => {
      cache.set('key1', 'value1');
      cache.saveToStorage();
      const saved = localStorage.getItem('app-cache');
      expect(saved).toBeTruthy();
      const data = JSON.parse(saved);
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].key).toBe('key1');
    });

    it('handles quota exceeded error', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw { name: 'QuotaExceededError' };
      });
      cache.set('key1', 'value1');
      expect(() => cache.saveToStorage()).not.toThrow();
      localStorage.setItem = originalSetItem;
    });

    it('cleans expired entries before saving', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(1100);
      cache.saveToStorage();
      const saved = localStorage.getItem('app-cache');
      const data = JSON.parse(saved);
      expect(data.entries).toHaveLength(0);
      jest.useRealTimers();
    });
  });

  describe('loadFromStorage', () => {
    it('loads cache from localStorage', () => {
      const data = {
        entries: [
          {
            key: 'key1',
            value: 'value1',
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 0,
          },
        ],
        savedAt: Date.now(),
      };
      localStorage.setItem('app-cache', JSON.stringify(data));
      const newCache = new CacheManager({ ttl: 1000, maxSize: 3 });
      expect(newCache.cache.size).toBe(1);
      expect(newCache.get('key1')).toBe('value1');
    });

    it('ignores expired entries on load', () => {
      const data = {
        entries: [
          {
            key: 'key1',
            value: 'value1',
            timestamp: Date.now() - 2000,
            lastAccessed: Date.now() - 2000,
            accessCount: 0,
          },
        ],
        savedAt: Date.now(),
      };
      localStorage.setItem('app-cache', JSON.stringify(data));
      const newCache = new CacheManager({ ttl: 1000, maxSize: 3 });
      expect(newCache.cache.size).toBe(0);
    });

    it('handles corrupted data gracefully', () => {
      localStorage.setItem('app-cache', 'invalid json');
      expect(() => new CacheManager({ ttl: 1000, maxSize: 3 })).not.toThrow();
    });

    it('handles missing data gracefully', () => {
      localStorage.setItem('app-cache', JSON.stringify({}));
      expect(() => new CacheManager({ ttl: 1000, maxSize: 3 })).not.toThrow();
    });
  });

  describe('singleton instances', () => {
    it('creates aiCache instance', () => {
      expect(aiCache).toBeInstanceOf(CacheManager);
      expect(aiCache.ttl).toBe(30 * 60 * 1000);
      expect(aiCache.maxSize).toBe(50);
      expect(aiCache.storageKey).toBe('main-ai-cache');
    });

    it('creates apiCache instance', () => {
      expect(apiCache).toBeInstanceOf(CacheManager);
      expect(apiCache.ttl).toBe(5 * 60 * 1000);
      expect(apiCache.maxSize).toBe(100);
      expect(apiCache.storageKey).toBe('main-api-cache');
    });
  });
});
