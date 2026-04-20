/**
 * Cache Manager
 * Provides TTL-based caching with LRU eviction
 * Clear boundary: cache NEVER affects canonical state (IndexedDB)
 */

export class CacheManager {
    constructor(options = {}) {
        this.ttl = options.ttl || 30 * 60 * 1000; // 30 minutes default
        this.maxSize = options.maxSize || 50;
        this.cache = new Map(); // key -> { value, timestamp, accessCount }
        this.storageKey = options.storageKey || 'app-cache';
        this.loadFromStorage();
    }

    /**
     * Get item from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if expired/missing
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            this.saveToStorage();
            return null;
        }

        // Update access time for LRU
        entry.lastAccessed = Date.now();
        entry.accessCount = (entry.accessCount || 0) + 1;
        
        return entry.value;
    }

    /**
     * Set item in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     */
    set(key, value) {
        // Evict if at capacity (LRU - remove least recently used)
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 0
        });

        this.saveToStorage();
    }

    /**
     * Remove least recently used entry
     */
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            console.log(`[CacheManager] Evicted LRU entry: ${oldestKey}`);
        }
    }

    /**
     * Clear expired entries
     */
    cleanExpired() {
        const now = Date.now();
        let expiredCount = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            console.log(`[CacheManager] Cleaned ${expiredCount} expired entries`);
            this.saveToStorage();
        }

        return expiredCount;
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        localStorage.removeItem(this.storageKey);
        console.log('[CacheManager] Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const entries = Array.from(this.cache.values());
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
            expired: entries.filter(e => Date.now() - e.timestamp > this.ttl).length,
            avgAccessCount: entries.length > 0 
                ? entries.reduce((sum, e) => sum + (e.accessCount || 0), 0) / entries.length 
                : 0
        };
    }

    /**
     * Save cache to localStorage (performance only, not critical state)
     */
    saveToStorage() {
        try {
            // Clean expired before saving
            this.cleanExpired();
            
            const data = {
                entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
                    key,
                    value: entry.value,
                    timestamp: entry.timestamp,
                    lastAccessed: entry.lastAccessed,
                    accessCount: entry.accessCount
                })),
                savedAt: Date.now()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('[CacheManager] Failed to save cache:', error);
            // If storage fails (quota exceeded), clear and continue
            if (error.name === 'QuotaExceededError') {
                this.evictLRU();
            }
        }
    }

    /**
     * Load cache from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const data = JSON.parse(saved);
            if (!data.entries || !Array.isArray(data.entries)) return;

            const now = Date.now();

            // Restore valid entries (check TTL)
            for (const entry of data.entries) {
                if (now - entry.timestamp <= this.ttl) {
                    this.cache.set(entry.key, {
                        value: entry.value,
                        timestamp: entry.timestamp,
                        lastAccessed: entry.lastAccessed || entry.timestamp,
                        accessCount: entry.accessCount || 0
                    });
                }
            }

            console.log(`[CacheManager] Loaded ${this.cache.size} entries from storage`);
        } catch (error) {
            console.warn('[CacheManager] Failed to load cache:', error);
        }
    }
}

// Singleton instance for AI cache
export const aiCache = new CacheManager({
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 50,
    storageKey: 'main-ai-cache'
});

// Singleton instance for API responses
export const apiCache = new CacheManager({
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    storageKey: 'main-api-cache'
});
