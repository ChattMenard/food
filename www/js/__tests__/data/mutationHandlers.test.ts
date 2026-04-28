// @ts-check
import { handleAddItem, handleUpdateItem, handleDeleteItem, registerAllHandlers } from '../../data/mutationHandlers';

jest.mock('../../data/db', () => ({
  ready: Promise.resolve(),
  add: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  put: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  getPantry: jest.fn().mockResolvedValue([])
}));

jest.mock('../../core/appState', () => ({
  savePantryState: jest.fn().mockResolvedValue(undefined)
}));

import db from '../../data/db';
import { savePantryState } from '../../core/appState';

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

    it('should handle missing optional fields', async () => {
      const mutation = {
        type: 'ADD_ITEM',
        payload: {
          name: 'Banana',
          quantity: '3'
        }
      };

      const result = await handleAddItem(mutation);

      expect(result.success).toBe(true);
      expect(db.add).toHaveBeenCalledWith('pantry', {
        name: 'banana',
        quantity: 3,
        unit: null,
        category: null,
        purchaseDate: expect.any(String),
        expiryDate: null
      });
    });

    it('should handle database errors', async () => {
      (db.add as jest.Mock).mockRejectedValue(new Error('Database error'));

      const mutation = {
        type: 'ADD_ITEM',
        payload: { name: 'Apple', quantity: '1' }
      };

      const result = await handleAddItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('handleUpdateItem', () => {
    it('should update existing item', async () => {
      const existingItem = {
        id: 'item-1',
        name: 'apple',
        quantity: 5,
        unit: 'kg',
        category: 'fruit'
      };

      (db.get as jest.Mock).mockResolvedValue(existingItem);

      const mutation = {
        type: 'UPDATE_ITEM',
        payload: {
          id: 'item-1',
          quantity: '10',
          unit: 'kg'
        }
      };

      const result = await handleUpdateItem(mutation);

      expect(result.success).toBe(true);
      expect(db.put).toHaveBeenCalledWith('pantry', {
        id: 'item-1',
        name: 'apple',
        quantity: 10,
        unit: 'kg',
        category: 'fruit'
      });
      expect(savePantryState).toHaveBeenCalled();
    });

    it('should return error if item not found', async () => {
      (db.get as jest.Mock).mockResolvedValue(null);

      const mutation = {
        type: 'UPDATE_ITEM',
        payload: {
          id: 'non-existent',
          quantity: '10'
        }
      };

      const result = await handleUpdateItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle database errors', async () => {
      (db.get as jest.Mock).mockRejectedValue(new Error('Database error'));

      const mutation = {
        type: 'UPDATE_ITEM',
        payload: { id: 'item-1', quantity: '10' }
      };

      const result = await handleUpdateItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('handleDeleteItem', () => {
    it('should delete existing item', async () => {
      const existingItem = {
        id: 'item-1',
        name: 'apple',
        quantity: 5
      };

      (db.get as jest.Mock).mockResolvedValue(existingItem);

      const mutation = {
        type: 'DELETE_ITEM',
        payload: { id: 'item-1' }
      };

      const result = await handleDeleteItem(mutation);

      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalledWith('pantry', 'item-1');
      expect(savePantryState).toHaveBeenCalled();
    });

    it('should return error if item not found', async () => {
      (db.get as jest.Mock).mockResolvedValue(null);

      const mutation = {
        type: 'DELETE_ITEM',
        payload: { id: 'non-existent' }
      };

      const result = await handleDeleteItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item not found');
    });

    it('should handle database errors', async () => {
      (db.get as jest.Mock).mockRejectedValue(new Error('Database error'));

      const mutation = {
        type: 'DELETE_ITEM',
        payload: { id: 'item-1' }
      };

      const result = await handleDeleteItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('registerAllHandlers', () => {
    it('should register all mutation handlers', () => {
      const mockRegister = jest.fn();
      
      registerAllHandlers(mockRegister);

      expect(mockRegister).toHaveBeenCalledWith('ADD_ITEM', expect.any(Function));
      expect(mockRegister).toHaveBeenCalledWith('UPDATE_ITEM', expect.any(Function));
      expect(mockRegister).toHaveBeenCalledWith('DELETE_ITEM', expect.any(Function));
    });
  });

  describe('data normalization', () => {
    it('should normalize item names', async () => {
      const mutation = {
        type: 'ADD_ITEM',
        payload: {
          name: '  ORANGE  ',
          quantity: '2',
          unit: 'kg'
        }
      };

      await handleAddItem(mutation);

      expect(db.add).toHaveBeenCalledWith('pantry', expect.objectContaining({
        name: 'orange'
      }));
    });

    it('should convert string quantities to numbers', async () => {
      const mutation = {
        type: 'ADD_ITEM',
        payload: {
          name: 'Apple',
          quantity: '5.5',
          unit: 'kg'
        }
      };

      await handleAddItem(mutation);

      expect(db.add).toHaveBeenCalledWith('pantry', expect.objectContaining({
        quantity: 5.5
      }));
    });

    it('should handle invalid quantities', async () => {
      const mutation = {
        type: 'ADD_ITEM',
        payload: {
          name: 'Apple',
          quantity: 'invalid'
        }
      };

      const result = await handleAddItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid quantity');
    });
  });

  describe('validation', () => {
    it('should validate required fields', async () => {
      const mutation = {
        type: 'ADD_ITEM',
        payload: {
          name: '',
          quantity: '1'
        }
      };

      const result = await handleAddItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should validate quantity is positive', async () => {
      const mutation = {
        type: 'ADD_ITEM',
        payload: {
          name: 'Apple',
          quantity: '-5'
        }
      };

      const result = await handleAddItem(mutation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Quantity must be positive');
    });
  });
});
