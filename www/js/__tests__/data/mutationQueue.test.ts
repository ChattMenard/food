// @ts-check
import { enqueue, getPending, markSynced, markFailed, incrementRetry } from '../../data/mutationQueue';

jest.mock('../../data/db', () => ({
  ready: Promise.resolve(),
  addMutation: jest.fn().mockResolvedValue(undefined),
  getPendingMutations: jest.fn().mockResolvedValue([]),
  markMutationSynced: jest.fn().mockResolvedValue(undefined),
  markMutationFailed: jest.fn().mockResolvedValue(undefined),
  incrementMutationRetry: jest.fn().mockResolvedValue(1)
}));

import db from '../../data/db';

describe('MutationQueue', () => {
  let mockUUID: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUUID = jest.fn().mockReturnValue('test-uuid-123');
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: mockUUID },
      writable: true
    });
  });

  describe('enqueue', () => {
    it('should enqueue a mutation with all required fields', async () => {
      const mutation = { type: 'ADD_ITEM', payload: { id: 1 }, entityId: 'pantry:apple' };
      const result = await enqueue(mutation);
      
      expect(result.id).toBe('test-uuid-123');
      expect(result.type).toBe('ADD_ITEM');
      expect(result.payload).toEqual({ id: 1 });
      expect(result.entityId).toBe('pantry:apple');
      expect(result.timestamp).toBeDefined();
      expect(result.retryCount).toBe(0);
      expect(result.status).toBe('pending');
      expect(db.addMutation).toHaveBeenCalledWith(result);
    });

    it('should generate unique UUID for each mutation', async () => {
      (global.crypto.randomUUID as jest.Mock) = jest.fn()
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');
      
      await enqueue({ type: 'ADD_ITEM', payload: {}, entityId: 'test1' });
      await enqueue({ type: 'UPDATE_ITEM', payload: {}, entityId: 'test2' });
      
      expect(db.addMutation).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors', async () => {
      (db.addMutation as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(enqueue({ type: 'ADD_ITEM', payload: {}, entityId: 'test' })).rejects.toThrow('Database error');
    });
  });

  describe('getPending', () => {
    it('should return pending mutations', async () => {
      const mockMutations = [
        { id: '1', type: 'ADD_ITEM', status: 'pending' },
        { id: '2', type: 'UPDATE_ITEM', status: 'pending' }
      ];
      (db.getPendingMutations as jest.Mock).mockResolvedValue(mockMutations);
      
      const result = await getPending();
      
      expect(result).toEqual(mockMutations);
      expect(db.getPendingMutations).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      (db.getPendingMutations as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(getPending()).rejects.toThrow('Database error');
    });
  });

  describe('markSynced', () => {
    it('should mark mutation as synced', async () => {
      const mutationId = 'test-mutation-id';
      
      await markSynced(mutationId);
      
      expect(db.markMutationSynced).toHaveBeenCalledWith(mutationId);
    });

    it('should handle database errors', async () => {
      (db.markMutationSynced as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(markSynced('test-id')).rejects.toThrow('Database error');
    });
  });

  describe('markFailed', () => {
    it('should mark mutation as failed with error', async () => {
      const mutationId = 'test-mutation-id';
      const error = 'Network timeout';
      
      await markFailed(mutationId, error);
      
      expect(db.markMutationFailed).toHaveBeenCalledWith(mutationId, error);
    });

    it('should handle database errors', async () => {
      (db.markMutationFailed as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(markFailed('test-id', 'error')).rejects.toThrow('Database error');
    });
  });

  describe('incrementRetry', () => {
    it('should increment retry count and return new count', async () => {
      const mutationId = 'test-mutation-id';
      (db.incrementMutationRetry as jest.Mock).mockResolvedValue(3);
      
      const result = await incrementRetry(mutationId);
      
      expect(result).toBe(3);
      expect(db.incrementMutationRetry).toHaveBeenCalledWith(mutationId);
    });

    it('should handle database errors', async () => {
      (db.incrementMutationRetry as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(incrementRetry('test-id')).rejects.toThrow('Database error');
    });
  });

  describe('mutation validation', () => {
    it('should validate required fields', async () => {
      const invalidMutation = { type: '', payload: null, entityId: '' };
      
      await expect(enqueue(invalidMutation)).rejects.toThrow();
    });

    it('should accept valid mutation types', async () => {
      const validTypes = ['ADD_ITEM', 'UPDATE_ITEM', 'DELETE_ITEM'];
      
      for (const type of validTypes) {
        const mutation = { type, payload: { id: 1 }, entityId: 'test' };
        await expect(enqueue(mutation)).resolves.toBeDefined();
      }
    });
  });

  describe('timestamp handling', () => {
    it('should include timestamp in enqueued mutation', async () => {
      const before = Date.now();
      const mutation = { type: 'ADD_ITEM', payload: {}, entityId: 'test' };
      const result = await enqueue(mutation);
      const after = Date.now();
      
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('retry count initialization', () => {
    it('should initialize retry count to 0', async () => {
      const mutation = { type: 'ADD_ITEM', payload: {}, entityId: 'test' };
      const result = await enqueue(mutation);
      
      expect(result.retryCount).toBe(0);
    });
  });

  describe('status initialization', () => {
    it('should initialize status to pending', async () => {
      const mutation = { type: 'ADD_ITEM', payload: {}, entityId: 'test' };
      const result = await enqueue(mutation);
      
      expect(result.status).toBe('pending');
    });
  });
});
