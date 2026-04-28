// @ts-check
import { CommunityRecipes } from '../advanced/communityRecipes';

// Extend Window interface for analytics
declare global {
  interface Window {
    analytics?: {
      track: jest.Mock;
    };
  }
}

describe('CommunityRecipes', () => {
  let manager: CommunityRecipes;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      getAll: jest.fn().mockResolvedValue([])
    };
    manager = new CommunityRecipes(mockDb);
    window.analytics = { track: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete window.analytics;
  });

  describe('constructor', () => {
    it('stores db instance', () => {
      expect(manager.dbData).toBe(mockDb);
    });
  });

  describe('validateRecipe', () => {
    it('returns valid for complete recipe', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1', 'ingredient2'],
        instructions: 'Step 1, Step 2',
        time: 30,
        servings: 4,
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns invalid when name is missing', () => {
      const recipe = {
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: 30,
        servings: 4,
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Recipe name is required');
    });

    it('returns invalid when ingredients are missing', () => {
      const recipe = {
        name: 'Test Recipe',
        instructions: 'Step 1',
        time: 30,
        servings: 4,
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one ingredient is required');
    });

    it('returns invalid when instructions are missing', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        time: 30,
        servings: 4,
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Instructions are required');
    });

    it('returns invalid when time is invalid', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: -5,
        servings: 4,
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Time must be positive');
    });

    it('returns invalid when servings is invalid', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: 30,
        servings: 0,
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Servings must be positive');
    });
  });

  describe('submitRecipe', () => {
    it('submits valid recipe successfully', async () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1', 'ingredient2'],
        instructions: 'Step 1, Step 2',
        time: 30,
        servings: 4,
        author: 'Test Author',
      };

      const result = await manager.submitRecipe(recipe);

      expect(result.success).toBe(true);
      expect(result.recipeId).toBeDefined();
      expect(mockDb.put).toHaveBeenCalledWith('community-recipes', expect.objectContaining({
        name: 'Test Recipe',
        status: 'pending'
      }));
      expect(window.analytics?.track).toHaveBeenCalledWith('recipe_submitted', {
        recipeName: 'Test Recipe'
      });
    });

    it('rejects invalid recipe', async () => {
      const recipe = {
        name: '',
        ingredients: [],
        instructions: '',
        time: 0,
        servings: 0,
      };

      const result = await manager.submitRecipe(recipe);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles database errors', async () => {
      mockDb.put.mockRejectedValue(new Error('Database error'));

      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: 30,
        servings: 4,
      };

      const result = await manager.submitRecipe(recipe);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getRecipes', () => {
    it('returns all recipes', async () => {
      const mockRecipes = [
        { id: '1', name: 'Recipe 1', status: 'approved' },
        { id: '2', name: 'Recipe 2', status: 'approved' }
      ];
      mockDb.getAll.mockResolvedValue(mockRecipes);

      const result = await manager.getRecipes();

      expect(result).toEqual(mockRecipes);
      expect(mockDb.getAll).toHaveBeenCalledWith('community-recipes');
    });

    it('filters by status', async () => {
      const mockRecipes = [
        { id: '1', name: 'Recipe 1', status: 'approved' },
        { id: '2', name: 'Recipe 2', status: 'pending' }
      ];
      mockDb.getAll.mockResolvedValue(mockRecipes);

      const result = await manager.getRecipes({ status: 'approved' });

      expect(result).toEqual([mockRecipes[0]]);
    });

    it('handles database errors', async () => {
      mockDb.getAll.mockRejectedValue(new Error('Database error'));

      await expect(manager.getRecipes()).rejects.toThrow('Database error');
    });
  });

  describe('approveRecipe', () => {
    it('approves recipe successfully', async () => {
      const recipe = {
        id: '1',
        name: 'Test Recipe',
        status: 'pending'
      };
      mockDb.get.mockResolvedValue(recipe);

      const result = await manager.approveRecipe('1');

      expect(result.success).toBe(true);
      expect(mockDb.put).toHaveBeenCalledWith('community-recipes', expect.objectContaining({
        id: '1',
        status: 'approved'
      }));
      expect(window.analytics?.track).toHaveBeenCalledWith('recipe_approved', {
        recipeId: '1'
      });
    });

    it('returns error if recipe not found', async () => {
      mockDb.get.mockResolvedValue(null);

      const result = await manager.approveRecipe('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipe not found');
    });

    it('handles database errors', async () => {
      mockDb.get.mockRejectedValue(new Error('Database error'));

      const result = await manager.approveRecipe('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('rejectRecipe', () => {
    it('rejects recipe with reason', async () => {
      const recipe = {
        id: '1',
        name: 'Test Recipe',
        status: 'pending'
      };
      mockDb.get.mockResolvedValue(recipe);

      const result = await manager.rejectRecipe('1', 'Incomplete instructions');

      expect(result.success).toBe(true);
      expect(mockDb.put).toHaveBeenCalledWith('community-recipes', expect.objectContaining({
        id: '1',
        status: 'rejected',
        rejectionReason: 'Incomplete instructions'
      }));
      expect(window.analytics?.track).toHaveBeenCalledWith('recipe_rejected', {
        recipeId: '1',
        reason: 'Incomplete instructions'
      });
    });

    it('returns error if recipe not found', async () => {
      mockDb.get.mockResolvedValue(null);

      const result = await manager.rejectRecipe('non-existent', 'Reason');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipe not found');
    });
  });

  describe('rateRecipe', () => {
    it('rates recipe successfully', async () => {
      const recipe = {
        id: '1',
        name: 'Test Recipe',
        ratings: []
      };
      mockDb.get.mockResolvedValue(recipe);

      const result = await manager.rateRecipe('1', 5, 'Great recipe!');

      expect(result.success).toBe(true);
      expect(mockDb.put).toHaveBeenCalledWith('community-recipes', expect.objectContaining({
        id: '1',
        ratings: expect.arrayContaining([expect.objectContaining({
          rating: 5,
          comment: 'Great recipe!'
        })])
      }));
    });

    it('validates rating range', async () => {
      const result = await manager.rateRecipe('1', 6, 'Too high');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rating must be between 1 and 5');
    });
  });

  describe('searchRecipes', () => {
    it('searches recipes by name', async () => {
      const mockRecipes = [
        { id: '1', name: 'Chicken Pasta', status: 'approved' },
        { id: '2', name: 'Beef Stir Fry', status: 'approved' }
      ];
      mockDb.getAll.mockResolvedValue(mockRecipes);

      const result = await manager.searchRecipes('chicken');

      expect(result).toEqual([mockRecipes[0]]);
    });

    it('searches recipes by ingredient', async () => {
      const mockRecipes = [
        { id: '1', name: 'Recipe 1', ingredients: ['chicken', 'pasta'], status: 'approved' },
        { id: '2', name: 'Recipe 2', ingredients: ['beef', 'rice'], status: 'approved' }
      ];
      mockDb.getAll.mockResolvedValue(mockRecipes);

      const result = await manager.searchRecipes('pasta');

      expect(result).toEqual([mockRecipes[0]]);
    });

    it('returns empty array for no matches', async () => {
      const mockRecipes = [
        { id: '1', name: 'Chicken Pasta', status: 'approved' }
      ];
      mockDb.getAll.mockResolvedValue(mockRecipes);

      const result = await manager.searchRecipes('fish');

      expect(result).toEqual([]);
    });
  });
});
