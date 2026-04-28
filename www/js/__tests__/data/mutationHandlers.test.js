// @ts-check
import { handleAddItem, handleUpdateItem, handleDeleteItem, registerAllHandlers } from '../../data/mutationHandlers.js';

jest.mock('../../data/db.js', () => ({
  ready: Promise.resolve(),
  add: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue(null),
  put: jest.fn().mockResolvedValue(),
  delete: jest.fn().mockResolvedValue(),
  getPantry: jest.fn().mockResolvedValue([])
}));

jest.mock('../../core/appState.js', () => ({
  savePantryState: jest.fn().mockResolvedValue()
}));

import db from '../../data/db.js';
import { savePantryState } from '../../core/appState.js';

describe('MutationHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleAddItem', () => {
    it('should add item to pantry with normalized data', async () => {
      const mutation = {
        type: 'ADD_ITEM',
        payload: {
          name: '  Apple  ',
          quantity: '5',
          unit: 'kg',
          category: 'fruit'
        }
      };

      const result = await handleAddItem(mutation);

      expect(result.success).toBe(true);
      expect(db.add).toHaveBeenCalledWith('pantry', {
        name: 'apple',
        quantity: 5,
        unit: 'kg',
        category: 'fruit',
        purchaseDate: expect.any(String),
        expiryDate: null
      });
      expect(savePantryState).toHaveBeenCalled();
    });

    it('should handle missing quantity with default', async () => {
      const mutation = {
        type: 'ADD_ITEM',
        payload: { name: 'Banana' }
      };

      await handleAddItem(mutation);

      expect(db.add).toHaveBeenCalledWith('pantry', expect.objectContaining({
        quantity: 1,
        unit: 'item'
      }));
    });

    it('should return error on failure', async () => {
      db.add.mockRejectedValue(new Error('DB error'));

      const mutation = {
        type: 'ADD_ITEM',
        payload: { name: 'Apple' }
      };

      const result = await handleAddItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('handleUpdateItem', () => {
    it('should update existing item', async () => {
      const existingItem = { id: 'item-1', name: 'Apple', quantity: 5 };
      db.get.mockResolvedValue(existingItem);

      const mutation = {
        type: 'UPDATE_ITEM',
        payload: {
          id: 'item-1',
          updates: { quantity: 10, category: 'updated' }
        }
      };

      const result = await handleUpdateItem(mutation);

      expect(result.success).toBe(true);
      expect(db.put).toHaveBeenCalledWith('pantry', {
        id: 'item-1',
        name: 'Apple',
        quantity: 10,
        category: 'updated'
      });
      expect(savePantryState).toHaveBeenCalled();
    });

    it('should return error if item not found', async () => {
      db.get.mockResolvedValue(null);

      const mutation = {
        type: 'UPDATE_ITEM',
        payload: {
          id: 'nonexistent',
          updates: { quantity: 10 }
        }
      };

      const result = await handleUpdateItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should return error on failure', async () => {
      db.get.mockRejectedValue(new Error('DB error'));

      const mutation = {
        type: 'UPDATE_ITEM',
        payload: { id: 'item-1', updates: {} }
      };

      const result = await handleUpdateItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('handleDeleteItem', () => {
    it('should delete item from pantry', async () => {
      const mutation = {
        type: 'DELETE_ITEM',
        payload: { id: 'item-1' }
      };

      const result = await handleDeleteItem(mutation);

      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalledWith('pantry', 'item-1');
      expect(savePantryState).toHaveBeenCalled();
    });

    it('should return error on failure', async () => {
      db.delete.mockRejectedValue(new Error('DB error'));

      const mutation = {
        type: 'DELETE_ITEM',
        payload: { id: 'item-1' }
      };

      const result = await handleDeleteItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  describe('registerAllHandlers', () => {
    it('should register all handlers with sync processor', () => {
      const mockSyncProcessor = {
        registerHandler: jest.fn()
      };

      registerAllHandlers(mockSyncProcessor);

      expect(mockSyncProcessor.registerHandler).toHaveBeenCalledWith('ADD_ITEM', handleAddItem);
      expect(mockSyncProcessor.registerHandler).toHaveBeenCalledWith('UPDATE_ITEM', handleUpdateItem);
      expect(mockSyncProcessor.registerHandler).toHaveBeenCalledWith('DELETE_ITEM', handleDeleteItem);
      expect(mockSyncProcessor.registerHandler).toHaveBeenCalledTimes(3);
    });
  });
});
