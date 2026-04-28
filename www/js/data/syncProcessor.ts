// @ts-check
/**
 * Sync Processor
 * Background sync for offline mutations with retry logic
 * Processes pending mutations when connectivity returns
 */

import {
  getPending,
  markSynced,
  markFailed,
  incrementRetry,
} from './mutationQueue';

// Sync configuration
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const SYNC_INTERVAL = 30000; // Check every 30 seconds when online

class SyncProcessor {
  public isProcessing: boolean;
  public isOnline: boolean;
  public intervalId: any;
  public handlers: Map<any, Function>;

  constructor() {
    this.isProcessing = false;
    this.isOnline = navigator.onLine;
    this.intervalId = null;
    this.handlers = new Map(); // Mutation type handlers

    this.setupListeners();
    this.startPeriodicSync();
  }

  /**
   * Register a handler for a mutation type
   * @param {string} type - Mutation type (e.g., 'ADD_ITEM')
   * @param {Function} handler - Async function(mutation) => result
   */
  registerHandler(type: string, handler: Function): void {
    this.handlers.set(type, handler);
    console.log('[SyncProcessor] Registered handler:', type);
  }

  /**
   * Setup online/offline listeners
   */
  setupListeners(): void {
    window.addEventListener('online', () => {
      console.log('[SyncProcessor] Online - triggering sync');
      this.isOnline = true;
      this.processPending();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncProcessor] Offline - pausing sync');
      this.isOnline = false;
    });
  }

  /**
   * Start periodic sync check
   */
  startPeriodicSync(): void {
    this.intervalId = setInterval(() => {
      if (this.isOnline && !this.isProcessing) {
        this.processPending();
      }
    }, SYNC_INTERVAL);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process all pending mutations
   */
  async processPending() {
    if (this.isProcessing || !this.isOnline) return;

    this.isProcessing = true;
    console.log('[SyncProcessor] Processing pending mutations...');

    try {
      const pending = await getPending();

      if (pending.length === 0) {
        console.log('[SyncProcessor] No pending mutations');
        return;
      }

      console.log(`[SyncProcessor] Found ${pending.length} pending mutations`);

      // Process sequentially to avoid conflicts
      for (const mutation of pending) {
        await this.processMutation(mutation);
      }
    } catch (error) {
      console.error('[SyncProcessor] Error processing pending:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single mutation
   */
  async processMutation(mutation: any): Promise<void> {
    const { id, type, payload: _payload, entityId, retryCount = 0 } = mutation;

    // Check max retries
    if (retryCount >= MAX_RETRIES) {
      console.log(
        `[SyncProcessor] Max retries reached for ${id}, marking failed`
      );
      await markFailed(id, 'Max retries exceeded');
      return;
    }

    // Get handler
    const handler = this.handlers.get(type);
    if (!handler) {
      console.warn(`[SyncProcessor] No handler for type: ${type}`);
      await markFailed(id, `No handler for type: ${type}`);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      BASE_RETRY_DELAY * Math.pow(2, retryCount),
      MAX_RETRY_DELAY
    );

    if (retryCount > 0) {
      console.log(
        `[SyncProcessor] Retrying ${id} after ${delay}ms (attempt ${retryCount + 1})`
      );
      await this.sleep(delay);
    }

    try {
      // Execute handler
      console.log(`[SyncProcessor] Executing ${type} for ${entityId}`);
      const result = await handler(mutation);

      if (result.success) {
        console.log(`[SyncProcessor] Success: ${id}`);
        await markSynced(id);
      } else {
        throw new Error(result.error || 'Handler returned failure');
      }
    } catch (error) {
      console.error(`[SyncProcessor] Failed ${id}:`, (error as Error).message);
      const newRetryCount = await incrementRetry(id);

      if (newRetryCount >= MAX_RETRIES) {
        await markFailed(id, (error as Error).message);
      }
    }
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get sync status
   */
  getStatus(): any {
    return {
      isOnline: this.isOnline,
      isProcessing: this.isProcessing,
      registeredHandlers: Array.from(this.handlers.keys()),
      intervalActive: !!this.intervalId,
    };
  }

  /**
   * Force immediate sync attempt
   */
  async forceSync(): Promise<void> {
    console.log('[SyncProcessor] Force sync triggered');
    return this.processPending();
  }
}

// Global instance
const syncProcessor = new SyncProcessor();

export default syncProcessor;
export { SyncProcessor };
