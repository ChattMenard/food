/**
 * Mutation Queue
 * Single entry point for durable mutation queuing
 * All write operations go through here for offline sync support
 */

import db from './db.js';

/**
 * Enqueue a mutation for durable storage and eventual sync
 * @param {Object} params
 * @param {string} params.type - Mutation type (ADD_ITEM, UPDATE_ITEM, DELETE_ITEM, etc.)
 * @param {Object} params.payload - Mutation data
 * @param {string} params.entityId - Unique entity identifier (e.g., "pantry:apple")
 * @returns {Promise<Object>} The queued mutation object
 */
export async function enqueue({ type, payload, entityId }) {
  const mutation = {
    id: crypto.randomUUID(),
    type,
    payload,
    entityId,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  };

  await db.addMutation(mutation);

  console.log('[MutationQueue] Enqueued:', mutation.id, type, entityId);
  return mutation;
}

/**
 * Get all pending mutations
 * @returns {Promise<Array>}
 */
export async function getPending() {
  return db.getPendingMutations();
}

/**
 * Mark mutation as synced
 * @param {string} id
 */
export async function markSynced(id) {
  await db.markMutationSynced(id);
  console.log('[MutationQueue] Marked synced:', id);
}

/**
 * Mark mutation as failed
 * @param {string} id
 * @param {string} error
 */
export async function markFailed(id, error) {
  await db.markMutationFailed(id, error);
  console.log('[MutationQueue] Marked failed:', id, error);
}

/**
 * Increment retry count
 * @param {string} id
 * @returns {Promise<number>} New retry count
 */
export async function incrementRetry(id) {
  const count = await db.incrementMutationRetry(id);
  console.log('[MutationQueue] Retry incremented:', id, count);
  return count;
}
