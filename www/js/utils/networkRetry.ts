// @ts-check
/**
 * Network Retry Utility
 * Implements exponential backoff for failed network requests
 */

/**
 * Retry a network request with exponential backoff
 * @param {Function} requestFn - Function that returns a Promise for the request
 * @param {Object} options - Retry options
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(requestFn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryableErrors = ['NetworkError', 'TypeError', 'AbortError'],
    shouldRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await requestFn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isRetryable = retryableErrors.some(
        (errType) =>
          error.name === errType ||
          error.message?.includes(errType.toLowerCase()) ||
          error.message?.includes('network') ||
          error.message?.includes('fetch')
      );

      const customShouldRetry = shouldRetry
        ? shouldRetry(error, attempt)
        : true;

      if (!isRetryable || !customShouldRetry || attempt === maxRetries) {
        throw error;
      }

      console.warn(
        `[Network] Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
        error.message
      );

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Fetch with retry and timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const { timeout = 30000, ...fetchOptions } = options;

  const requestFn = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  return retryWithBackoff(requestFn, retryOptions);
}

/**
 * Fetch JSON with retry
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<any>}
 */
export async function fetchJSONWithRetry(url, options = {}, retryOptions = {}) {
  const response = await fetchWithRetry(url, options, retryOptions);
  return response.json();
}

/**
 * Batch fetch multiple URLs with retry
 * @param {Array<string>} urls - Array of URLs to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryOptions - Retry options
 * @returns {Promise<Array>} Array of responses
 */
export async function batchFetchWithRetry(
  urls,
  options = {},
  retryOptions = {}
) {
  const results = await Promise.allSettled(
    urls.map((url) => fetchWithRetry(url, options, retryOptions))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value, url: urls[index] };
    } else {
      return { success: false, error: result.reason, url: urls[index] };
    }
  });
}

/**
 * Check if online, with retry for flaky connections
 * @param {number} maxAttempts - Maximum check attempts
 * @returns {Promise<boolean>}
 */
export async function checkOnlineStatus(maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    if (navigator.onLine) {
      // Try to fetch a small resource to verify actual connectivity
      try {
        await fetchWithRetry(
          'https://www.google.com/favicon.ico',
          {
            method: 'HEAD',
            timeout: 5000,
          },
          {
            maxRetries: 1,
            initialDelay: 500,
          }
        );
        return true;
      } catch (_error) {
        console.warn(
          `[Network] Connectivity check failed (attempt ${i + 1}/${maxAttempts})`
        );
      }
    }

    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return false;
}

/**
 * Queue requests for when offline, then sync when online
 */
export class OfflineRequestQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.storageKey = 'main-offline-queue';

    this.loadQueue();
    this.setupOnlineListener();
  }

  /**
   * Load queue from localStorage
   */
  loadQueue() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.queue = JSON.parse(saved);
        console.log(`[Network] Loaded ${this.queue.length} queued requests`);
      }
    } catch (error) {
      console.error('[Network] Failed to load queue:', error);
    }
  }

  /**
   * Save queue to localStorage
   */
  saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[Network] Failed to save queue:', error);
    }
  }

  /**
   * Add a request to the queue
   * @param {Object} request - Request object with url, options, and metadata
   */
  add(request) {
    this.queue.push({
      ...request,
      timestamp: Date.now(),
      attempts: 0,
    });
    this.saveQueue();
    console.log(`[Network] Queued request: ${request.url}`);
  }

  /**
   * Process queued requests when online
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;
    console.log(`[Network] Processing ${this.queue.length} queued requests`);

    const failed = [];

    for (let i = 0; i < this.queue.length; i++) {
      const request = this.queue[i];

      try {
        await fetchWithRetry(request.url, request.options, {
          maxRetries: 3,
          initialDelay: 1000,
        });

        // Request succeeded, remove from queue
        console.log(`[Network] Synced queued request: ${request.url}`);
      } catch (_error) {
        // Request failed, keep in queue
        request.attempts++;
        console.warn(
          `[Network] Failed to sync request (attempt ${request.attempts}): ${request.url}`
        );

        if (request.attempts < 5) {
          failed.push(request);
        }
      }
    }

    this.queue = failed;
    this.saveQueue();
    this.isProcessing = false;
  }

  /**
   * Setup online/offline event listeners
   */
  setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('[Network] Connection restored, processing queue');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[Network] Connection lost, requests will be queued');
    });
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Get queue size
   * @returns {number}
   */
  size() {
    return this.queue.length;
  }
}

// Global queue instance
let globalQueue = null;

/**
 * Get or create the global offline request queue
 * @returns {OfflineRequestQueue}
 */
export function getOfflineQueue() {
  if (!globalQueue) {
    globalQueue = new OfflineRequestQueue();
  }
  return globalQueue;
}
