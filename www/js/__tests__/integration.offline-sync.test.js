import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { enqueue, getPending, markSynced, markFailed, incrementRetry } from '../data/mutationQueue.js';
import { SyncProcessor } from '../data/syncProcessor.js';
import db from '../data/db.js';

describe('Offline → Sync Integration', () => {
    let syncProcessor;

    beforeEach(() => {
        // Clear mock store
        db._store.clear();
        
        // Create sync processor instance
        syncProcessor = new SyncProcessor();
    });

    afterEach(() => {
        // Cleanup
        syncProcessor.stopPeriodicSync();
    });

    describe('Mutation Queue', () => {
        it('should enqueue a mutation when offline', async () => {
            const mutation = await enqueue({
                type: 'ADD_ITEM',
                payload: { name: 'apple', quantity: 5, unit: 'pieces' },
                entityId: 'pantry:apple'
            });

            expect(mutation).toBeDefined();
            expect(mutation.id).toBeDefined();
            expect(mutation.type).toBe('ADD_ITEM');
            expect(mutation.status).toBe('pending');
            expect(mutation.retryCount).toBe(0);
        });

        it('should retrieve pending mutations', async () => {
            await enqueue({
                type: 'ADD_ITEM',
                payload: { name: 'banana', quantity: 3, unit: 'pieces' },
                entityId: 'pantry:banana'
            });

            await enqueue({
                type: 'UPDATE_ITEM',
                payload: { name: 'apple', quantity: 10, unit: 'pieces' },
                entityId: 'pantry:apple'
            });

            const pending = await getPending();
            expect(pending.length).toBeGreaterThanOrEqual(2);
        });

        it('should mark mutation as synced', async () => {
            const mutation = await enqueue({
                type: 'ADD_ITEM',
                payload: { name: 'orange', quantity: 2, unit: 'pieces' },
                entityId: 'pantry:orange'
            });

            await markSynced(mutation.id);

            // In the mock, synced mutations are removed from pending
            const pending = await getPending();
            const syncedMutation = pending.find(m => m.id === mutation.id);
            expect(syncedMutation).toBeUndefined();
        });

        it('should mark mutation as failed', async () => {
            const mutation = await enqueue({
                type: 'ADD_ITEM',
                payload: { name: 'grape', quantity: 1, unit: 'pieces' },
                entityId: 'pantry:grape'
            });

            await markFailed(mutation.id, 'Network error');

            // Check mutations store directly since failed mutations aren't in pending
            const failedMutation = db._mutations.get(mutation.id);
            expect(failedMutation).toBeDefined();
            expect(failedMutation.status).toBe('failed');
            expect(failedMutation.lastError).toBe('Network error');
        });

        it('should increment retry count', async () => {
            const mutation = await enqueue({
                type: 'ADD_ITEM',
                payload: { name: 'lemon', quantity: 2, unit: 'pieces' },
                entityId: 'pantry:lemon'
            });

            const newCount = await incrementRetry(mutation.id);
            expect(newCount).toBe(1);
        });
    });

    describe('Sync Processor', () => {
        it('should register handler for mutation type', () => {
            const mockHandler = jest.fn().mockResolvedValue({ success: true });
            syncProcessor.registerHandler('ADD_ITEM', mockHandler);

            const status = syncProcessor.getStatus();
            expect(status.registeredHandlers).toContain('ADD_ITEM');
        });

        it('should return sync status', () => {
            const status = syncProcessor.getStatus();
            expect(status).toHaveProperty('isOnline');
            expect(status).toHaveProperty('isProcessing');
            expect(status).toHaveProperty('registeredHandlers');
            expect(status).toHaveProperty('intervalActive');
        });

        it('should stop periodic sync', () => {
            syncProcessor.stopPeriodicSync();
            const status = syncProcessor.getStatus();
            expect(status.intervalActive).toBe(false);
        });
    });

    describe('Mutation Queue Operations', () => {
        it('should handle multiple enqueue operations', async () => {
            const mutations = await Promise.all([
                enqueue({ type: 'ADD_ITEM', payload: { name: 'item1' }, entityId: 'pantry:item1' }),
                enqueue({ type: 'ADD_ITEM', payload: { name: 'item2' }, entityId: 'pantry:item2' }),
                enqueue({ type: 'UPDATE_ITEM', payload: { name: 'item3' }, entityId: 'pantry:item3' })
            ]);

            expect(mutations).toHaveLength(3);
            expect(mutations.every(m => m.id)).toBe(true);
        });

        it('should generate unique IDs for each mutation', async () => {
            const mutation1 = await enqueue({ type: 'ADD_ITEM', payload: { name: 'item1' }, entityId: 'pantry:item1' });
            const mutation2 = await enqueue({ type: 'ADD_ITEM', payload: { name: 'item2' }, entityId: 'pantry:item2' });

            expect(mutation1.id).not.toBe(mutation2.id);
        });
    });
});
