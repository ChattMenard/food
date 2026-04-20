/**
 * Storage Manager
 * Handles IndexedDB quota management and graceful error handling
 */

/**
 * Check available storage space
 * @returns {Promise<{usage: number, quota: number, usagePercentage: number}>}
 */
export async function checkStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0;
        
        return {
            usage,
            quota,
            usagePercentage
        };
    }
    
    return {
        usage: 0,
        quota: 0,
        usagePercentage: 0
    };
}

/**
 * Check if storage is near quota limit
 * @param {number} threshold - Warning threshold percentage (default: 90)
 * @returns {Promise<boolean>}
 */
export async function isStorageNearQuota(threshold = 90) {
    const { usagePercentage } = await checkStorageQuota();
    return usagePercentage >= threshold;
}

/**
 * Clear old data to free up space
 * @param {string} dbName - Database name
 * @returns {Promise<void>}
 */
export async function clearOldDatabaseData(dbName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        
        request.onsuccess = () => {
            console.log(`[Storage] Cleared old database: ${dbName}`);
            resolve();
        };
        
        request.onerror = () => {
            console.error(`[Storage] Failed to clear database: ${dbName}`);
            reject(request.error);
        };
    });
}

/**
 * Wrap IndexedDB operations with quota error handling
 * @param {Function} operation - The IndexedDB operation to execute
 * @param {Object} options - Options for handling quota errors
 * @returns {Promise<any>}
 */
export async function withQuotaHandling(operation, options = {}) {
    const {
        onQuotaExceeded = null,
        maxRetries = 3,
        fallbackToLocalStorage = false
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Check if it's a quota error
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn(`[Storage] Quota exceeded on attempt ${attempt + 1}/${maxRetries}`);
                
                if (onQuotaExceeded) {
                    await onQuotaExceeded(attempt);
                }
                
                // Try to free space by clearing old caches
                if (attempt < maxRetries - 1) {
                    await clearOldCaches();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Fallback to localStorage if enabled
                if (fallbackToLocalStorage && attempt === maxRetries - 1) {
                    console.warn('[Storage] Falling back to localStorage');
                    return operation(true); // Pass flag to use localStorage
                }
            } else {
                // Not a quota error, don't retry
                throw error;
            }
        }
    }
    
    throw lastError;
}

/**
 * Clear old service worker caches
 * @returns {Promise<void>}
 */
export async function clearOldCaches() {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        const pantryCaches = cacheNames.filter(name => name.startsWith('main-'));
        
        await Promise.all(
            pantryCaches.map(name => {
                console.log(`[Storage] Clearing cache: ${name}`);
                return caches.delete(name);
            })
        );
    }
}

/**
 * Get storage usage breakdown by type
 * @returns {Promise<Object>}
 */
export async function getStorageBreakdown() {
    const breakdown = {
        indexedDB: 0,
        cache: 0,
        serviceWorkers: 0
    };
    
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usageDetails) {
            breakdown.indexedDB = estimate.usageDetails.indexedDB || 0;
            breakdown.cache = estimate.usageDetails.caches || 0;
            breakdown.serviceWorkers = estimate.usageDetails.serviceWorkers || 0;
        }
    }
    
    return breakdown;
}

/**
 * Migrate data from IndexedDB to localStorage if quota is exceeded
 * @param {string} dbName - Database name
 * @param {string} storeName - Store name to migrate
 * @param {string} localStorageKey - LocalStorage key to use
 * @returns {Promise<void>}
 */
export async function migrateToLocalStorage(dbName, storeName, localStorageKey) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        
        request.onsuccess = async () => {
            const db = request.result;
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
                const data = getAllRequest.result;
                try {
                    localStorage.setItem(localStorageKey, JSON.stringify(data));
                    console.log(`[Storage] Migrated ${storeName} to localStorage`);
                    resolve();
                } catch (e) {
                    console.error('[Storage] Failed to migrate to localStorage:', e);
                    reject(e);
                }
            };
            
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

/**
 * Show storage quota warning to user
 * @param {number} usagePercentage - Current usage percentage
 */
export function showQuotaWarning(usagePercentage) {
    const warning = document.createElement('div');
    warning.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
    warning.innerHTML = `
        <div class="font-semibold mb-1">⚠️ Storage Almost Full</div>
        <div class="text-sm">Storage usage is at ${usagePercentage.toFixed(1)}%. Some features may be limited.</div>
        <button onclick="this.parentElement.remove()" class="mt-2 text-xs bg-white text-red-500 px-2 py-1 rounded">Dismiss</button>
    `;
    document.body.appendChild(warning);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (warning.parentElement) {
            warning.remove();
        }
    }, 10000);
}

/**
 * Monitor storage usage and warn when near quota
 * @param {number} checkInterval - Check interval in milliseconds (default: 60000)
 * @param {number} warningThreshold - Warning threshold percentage (default: 85)
 */
export function startStorageMonitoring(checkInterval = 60000, warningThreshold = 85) {
    const check = async () => {
        const { usagePercentage } = await checkStorageQuota();
        
        if (usagePercentage >= warningThreshold) {
            showQuotaWarning(usagePercentage);
        }
    };
    
    // Initial check
    check();
    
    // Periodic checks
    const intervalId = setInterval(check, checkInterval);
    
    return () => clearInterval(intervalId);
}
