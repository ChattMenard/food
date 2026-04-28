// @ts-check
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  enqueue,
  getPending,
  markSynced,
  markFailed,
  incrementRetry,
} from '../data/mutationQueue';
import { SyncProcessor } from '../data/syncProcessor';
import db from '../data/db';

// Mock the db module
jest.mock('../data/db');

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Offline → Sync Integration', () => {
  let syncProcessor: SyncProcessor;
  let mockStore: Map<string, any>;
  let mockMutations: Map<string, any>;

  beforeEach(() => {
    // Setup mock store
    mockStore = new Map();
    mockMutations = new Map();

    // Mock db methods
    (db as any)._store = {
      clear: jest.fn(() => {
        mockStore.clear();
        mockMutations.clear();
      }),
    };
    (db as any)._mutations = {
      get: jest.fn((id: string) => mockMutations.get(id)),
      set: jest.fn((id: string, data: any) => mockMutations.set(id, data)),
    };
    (db as any).addMutation = jest.fn(async (mutation: any) => {
      const id = `mutation-${Date.now()}`;
      mockMutations.set(id, { ...mutation, id, status: 'pending' });
      return id;
    });
    (db as any).getPendingMutations = jest.fn(async () => {
      return Array.from(mockMutations.values()).filter((m: any) => m.status === 'pending');
    });
    (db as any).markMutationSynced = jest.fn(async (id: string) => {
      const mutation = mockMutations.get(id);
      if (mutation) {
        mutation.status = 'synced';
      }
    });
    (db as any).markMutationFailed = jest.fn(async (id: string, error: string) => {
      const mutation = mockMutations.get(id);
      if (mutation) {
        mutation.status = 'failed';
        mutation.error = error;
      }
    });
    (db as any).incrementMutationRetry = jest.fn(async (id: string) => {
      const mutation = mockMutations.get(id);
      if (mutation) {
        mutation.retryCount = (mutation.retryCount || 0) + 1;
        return mutation.retryCount;
      }
      return 0;
    });

    syncProcessor = new SyncProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Offline Mutation Queue', () => {
    it('should queue mutations when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const mutation = { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test' };
      const mutationId = await enqueue(mutation);

      expect(mutationId).toBeDefined();
      expect((db as any).addMutation).toHaveBeenCalled();
      
      const pending = await getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(mutationId);
    });

    it('should handle multiple offline mutations', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const mutations = [
        { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test1' },
        { type: 'UPDATE_ITEM', payload: { id: 2 }, entityId: 'test2' },
        { type: 'DELETE_ITEM', payload: { id: 3 }, entityId: 'test3' }
      ];

      const mutationIds = await Promise.all(mutations.map(m => enqueue(m)));
      
      expect(mutationIds).toHaveLength(3);
      
      const pending = await getPending();
      expect(pending).toHaveLength(3);
    });

    it('should preserve mutation order', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const mutations = [
        { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test1' },
        { type: 'ADD_ITEM', payload: { id: 2 }, entityId: 'test2' },
        { type: 'ADD_ITEM', payload: { id: 3 }, entityId: 'test3' }
      ];

      await Promise.all(mutations.map(m => enqueue(m)));
      
      const pending = await getPending();
      expect(pending).toHaveLength(3);
      
      // Check that order is preserved
      for (let i = 0; i < mutations.length; i++) {
        expect(pending[i].payload.id).toBe(mutations[i].payload.id);
      }
    });
  });

  describe('Sync When Online', () => {
    it('should process queued mutations when coming online', async () => {
      // Start offline and queue mutations
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mutation = { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test' };
      await enqueue(mutation);

      // Register a handler for the mutation
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      syncProcessor.registerHandler('ADD_ITEM', mockHandler);

      // Come online
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      // Trigger sync
      await (syncProcessor as any).processMutations();

      expect(mockHandler).toHaveBeenCalledWith(mutation.payload);
      expect((db as any).markMutationSynced).toHaveBeenCalled();
    });

    it('should handle sync failures gracefully', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mutation = { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test' };
      await enqueue(mutation);

      // Register a failing handler
      const mockHandler = jest.fn().mockRejectedValue(new Error('Sync failed'));
      syncProcessor.registerHandler('ADD_ITEM', mockHandler);

      Object.defineProperty(navigator, 'onLine', { value: true });
      
      await (syncProcessor as any).processMutations();

      expect((db as any).incrementMutationRetry).toHaveBeenCalled();
      expect((db as any).markMutationFailed).not.toHaveBeenCalled(); // Should retry first
    });

    it('should mark mutation as failed after max retries', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mutation = { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test' };
      await enqueue(mutation);

      const mockHandler = jest.fn().mockRejectedValue(new Error('Always fails'));
      syncProcessor.registerHandler('ADD_ITEM', mockHandler);

      Object.defineProperty(navigator, 'onLine', { value: true });
      
      // Simulate max retries
      for (let i = 0; i < 5; i++) {
        await (syncProcessor as any).processMutations();
      }

      expect((db as any).markMutationFailed).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts during sync', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mutation = { type: 'UPDATE_ITEM', payload: { id: 1, version: 1 }, entityId: 'test' };
      await enqueue(mutation);

      // Simulate remote update
      const mockHandler = jest.fn().mockResolvedValue({
        success: false,
        conflict: true,
        remoteVersion: 2
      });
      syncProcessor.registerHandler('UPDATE_ITEM', mockHandler);

      Object.defineProperty(navigator, 'onLine', { value: true });
      
      await (syncProcessor as any).processMutations();

      expect(mockHandler).toHaveBeenCalled();
      // Should handle conflict appropriately
    });

    it('should retry conflicted mutations with updated data', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mutation = { type: 'UPDATE_ITEM', payload: { id: 1, data: 'old' }, entityId: 'test' };
      await enqueue(mutation);

      let callCount = 0;
      const mockHandler = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: false,
            conflict: true,
            updatedData: { id: 1, data: 'merged' }
          });
        }
        return Promise.resolve({ success: true });
      });
      syncProcessor.registerHandler('UPDATE_ITEM', mockHandler);

      Object.defineProperty(navigator, 'onLine', { value: true });
      
      await (syncProcessor as any).processMutations();

      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect((db as any).markMutationSynced).toHaveBeenCalled();
    });
  });

  describe('Network Interruption', () => {
    it('should handle network going offline during sync', async () => {
      // Start online with queued mutations
      const mutation = { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test' };
      await enqueue(mutation);

      const mockHandler = jest.fn().mockImplementation(async () => {
        // Simulate network going offline during sync
        Object.defineProperty(navigator, 'onLine', { value: false });
        throw new Error('Network error');
      });
      syncProcessor.registerHandler('ADD_ITEM', mockHandler);

      await (syncProcessor as any).processMutations();

      expect(mockHandler).toHaveBeenCalled();
      // Mutation should remain in queue for retry
      const pending = await getPending();
      expect(pending).toHaveLength(1);
    });

    it('should resume sync when network returns', async () => {
      // Queue mutations while offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mutations = [
        { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test1' },
        { type: 'ADD_ITEM', payload: { id: 2 }, entityId: 'test2' }
      ];
      
      await Promise.all(mutations.map(m => enqueue(m)));

      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      syncProcessor.registerHandler('ADD_ITEM', mockHandler);

      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      await (syncProcessor as any).processMutations();

      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect((db as any).markMutationSynced).toHaveBeenCalledTimes(2);
      
      const pending = await getPending();
      expect(pending).toHaveLength(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of mutations efficiently', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      // Queue many mutations
      const mutations = Array.from({ length: 100 }, (_, i) => ({
        type: 'ADD_ITEM',
        payload: { id: i },
        entityId: `test${i}`
      }));
      
      await Promise.all(mutations.map(m => enqueue(m)));

      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      syncProcessor.registerHandler('ADD_ITEM', mockHandler);

      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const startTime = Date.now();
      await (syncProcessor as any).processMutations();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(mockHandler).toHaveBeenCalledTimes(100);
      
      const pending = await getPending();
      expect(pending).toHaveLength(0);
    });

    it('should batch mutations for efficiency', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mutations = Array.from({ length: 10 }, (_, i) => ({
        type: 'ADD_ITEM',
        payload: { id: i },
        entityId: `test${i}`
      }));
      
      await Promise.all(mutations.map(m => enqueue(m)));

      let batchSizes: number[] = [];
      const mockHandler = jest.fn().mockImplementation(async (payload: any) => {
        batchSizes.push(Array.isArray(payload) ? payload.length : 1);
        return { success: true };
      });
      syncProcessor.registerHandler('ADD_ITEM', mockHandler);

      Object.defineProperty(navigator, 'onLine', { value: true });
      
      await (syncProcessor as any).processMutations();

      expect(batchSizes.some((size: number) => size > 1)).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from database errors', async () => {
      // Simulate database error during enqueue
      (db as any).addMutation.mockRejectedValueOnce(new Error('Database error'));

      const mutation = { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test' };
      
      await expect(enqueue(mutation)).rejects.toThrow('Database error');
      
      // Should recover on next attempt
      (db as any).addMutation.mockResolvedValue('mutation-id');
      const result = await enqueue(mutation);
      expect(result).toBe('mutation-id');
    });

    it('should maintain data integrity during errors', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mutations = [
        { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'test1' },
        { type: 'ADD_ITEM', payload: { id: 2 }, entityId: 'test2' }
      ];
      
      await Promise.all(mutations.map(m => enqueue(m)));

      // First handler succeeds, second fails
      const mockHandler = jest.fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Handler error'));
      
      syncProcessor.registerHandler('ADD_ITEM', mockHandler);

      Object.defineProperty(navigator, 'onLine', { value: true });
      
      await (syncProcessor as any).processMutations();

      // One should be synced, one should remain pending
      expect((db as any).markMutationSynced).toHaveBeenCalledTimes(1);
      
      const pending = await getPending();
      expect(pending).toHaveLength(1);
    });
  });
});
