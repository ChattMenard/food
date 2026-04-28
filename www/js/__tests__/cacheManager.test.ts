// @ts-check
import { CacheManager, aiCache, apiCache } from '../utils/cacheManager';

describe('CacheManager', () => {
  let cache: CacheManager;

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
      expect(defaultCache.ttlData).toBe(30 * 60 * 1000);
      expect(defaultCache.maxSizeData).toBe(50);
      expect(defaultCache.storageKeyData).toBe('app-cache');
    });

    it('initializes with custom options', () => {
      expect(cache.ttlData).toBe(1000);
      expect(cache.maxSizeData).toBe(3);
      expect(cache.storageKeyData).toBe('app-cache');
    });

    it('initializes empty cache', () => {
      expect(cache.cacheData.size).toBe(0);
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

    it('updates last accessed time', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(500);
      cache.get('key1');
      const entry = cache.cacheData.get('key1');
      expect(entry?.lastAccessed).toBeGreaterThan(entry?.createdAt);
      jest.useRealTimers();
    });
  });

  describe('set', () => {
    it('sets value with timestamp', () => {
      cache.set('key1', 'value1');
      const entry = cache.cacheData.get('key1');
      expect(entry?.value).toBe('value1');
      expect(entry?.createdAt).toBeDefined();
      expect(entry?.lastAccessed).toBeDefined();
    });

    it('updates existing value', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('evicts oldest entry when maxSize exceeded', () => {
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(100);
      cache.set('key2', 'value2');
      jest.advanceTimersByTime(100);
      cache.set('key3', 'value3');
      jest.advanceTimersByTime(100);
      cache.set('key4', 'value4');
      
      expect(cache.get('key1')).toBe(null); // Should be evicted
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('saves to localStorage', () => {
      cache.set('key1', 'value1');
      const saved = localStorage.getItem('app-cache');
      expect(saved).toBeTruthy();
      expect(JSON.parse(saved!)).toHaveProperty('key1');
    });
  });

  describe('has', () => {
    it('returns false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('returns true for existing key', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('returns false for expired entry', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(1100);
      expect(cache.has('key1')).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('delete', () => {
    it('removes entry from cache', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBe(null);
    });

    it('returns true when entry existed', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
    });

    it('returns false when entry did not exist', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('updates localStorage', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      const saved = localStorage.getItem('app-cache');
      expect(saved).toBe('{}');
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.cacheData.size).toBe(0);
    });

    it('updates localStorage', () => {
      cache.set('key1', 'value1');
      cache.clear();
      const saved = localStorage.getItem('app-cache');
      expect(saved).toBe('{}');
    });
  });

  describe('cleanup', () => {
    it('removes expired entries', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(500);
      cache.set('key2', 'value2');
      jest.advanceTimersByTime(600);
      
      cache.cleanup();
      
      expect(cache.get('key1')).toBe(null);
      expect(cache.get('key2')).toBe('value2');
      jest.useRealTimers();
    });

    it('returns number of cleaned entries', () => {
      jest.useFakeTimers();
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(500);
      cache.set('key2', 'value2');
      jest.advanceTimersByTime(600);
      
      const cleaned = cache.cleanup();
      
      expect(cleaned).toBe(1);
      jest.useRealTimers();
    });
  });

  describe('size', () => {
    it('returns current cache size', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
    });
  });

  describe('keys', () => {
    it('returns all cache keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });

  describe('persistence', () => {
    it('loads from localStorage on initialization', () => {
      const testCache = new CacheManager({ ttl: 1000, maxSize: 3, storageKey: 'test-cache' });
      testCache.set('key1', 'value1');
      
      const newCache = new CacheManager({ ttl: 1000, maxSize: 3, storageKey: 'test-cache' });
      expect(newCache.get('key1')).toBe('value1');
    });

    it('handles corrupted localStorage data', () => {
      localStorage.setItem('app-cache', 'invalid json');
      expect(() => new CacheManager()).not.toThrow();
    });

    it('handles missing localStorage data', () => {
      expect(() => new CacheManager()).not.toThrow();
    });
  });

  describe('singleton instances', () => {
    it('provides aiCache singleton', () => {
      expect(aiCache).toBeInstanceOf(CacheManager);
      expect(aiCache.storageKeyData).toBe('ai-cache');
    });

    it('provides apiCache singleton', () => {
      expect(apiCache).toBeInstanceOf(CacheManager);
      expect(apiCache.storageKeyData).toBe('api-cache');
    });

    it('returns same singleton instance', () => {
      const cache1 = new CacheManager({ storageKey: 'singleton-test' });
      const cache2 = new CacheManager({ storageKey: 'singleton-test' });
      expect(cache1).not.toBe(cache2); // Different instances
    });
  });

  describe('edge cases', () => {
    it('handles undefined values', () => {
      cache.set('key1', undefined);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('handles null values', () => {
      cache.set('key1', null);
      expect(cache.get('key1')).toBeNull();
    });

    it('handles object values', () => {
      const obj = { name: 'test', value: 123 };
      cache.set('key1', obj);
      expect(cache.get('key1')).toEqual(obj);
    });

    it('handles array values', () => {
      const arr = [1, 2, 3];
      cache.set('key1', arr);
      expect(cache.get('key1')).toEqual(arr);
    });
  });
});
