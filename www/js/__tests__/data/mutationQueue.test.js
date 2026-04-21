import { enqueue, getPending, markSynced, markFailed, incrementRetry } from '../../data/mutationQueue.js';

jest.mock('../../data/db.js', () => ({
  ready: Promise.resolve(),
  addMutation: jest.fn().mockResolvedValue(),
  getPendingMutations: jest.fn().mockResolvedValue([]),
  markMutationSynced: jest.fn().mockResolvedValue(),
  markMutationFailed: jest.fn().mockResolvedValue(),
  incrementMutationRetry: jest.fn().mockResolvedValue(1)
}));

import db from '../../data/db.js';

describe('MutationQueue', () => {
  let mockUUID;

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
      global.crypto.randomUUID = jest.fn()
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');
      
      await enqueue({ type: 'ADD_ITEM', payload: {}, entityId: 'test1' });
      await enqueue({ type: 'UPDATE_ITEM', payload: {}, entityId: 'test2' });
      
      expect(db.addMutation).toHaveBeenCalledTimes(2);
      expect(db.addMutation).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'uuid-1' }));
      expect(db.addMutation).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'uuid-2' }));
    });
  });

  describe('getPending', () => {
    it('should get all pending mutations', async () => {
      const pendingMutations = [{ id: '1', status: 'pending' }];
      db.getPendingMutations.mockResolvedValue(pendingMutations);
      
      const result = await getPending();
      expect(result).toEqual(pendingMutations);
      expect(db.getPendingMutations).toHaveBeenCalled();
    });
  });

  describe('markSynced', () => {
    it('should mark mutation as synced', async () => {
      await markSynced('mutation-123');
      expect(db.markMutationSynced).toHaveBeenCalledWith('mutation-123');
    });
  });

  describe('markFailed', () => {
    it('should mark mutation as failed with error', async () => {
      await markFailed('mutation-123', 'Network error');
      expect(db.markMutationFailed).toHaveBeenCalledWith('mutation-123', 'Network error');
    });
  });

  describe('incrementRetry', () => {
    it('should increment retry count and return new count', async () => {
      db.incrementMutationRetry.mockResolvedValue(2);
      
      const count = await incrementRetry('mutation-123');
      expect(count).toBe(2);
      expect(db.incrementMutationRetry).toHaveBeenCalledWith('mutation-123');
    });
  });
});
