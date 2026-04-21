import { CommunityRecipes } from '../advanced/communityRecipes.js';

describe('CommunityRecipes', () => {
  let manager;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      put: jest.fn().mockResolvedValue(),
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
      expect(manager.db).toBe(mockDb);
    });
  });

  describe('validateRecipe', () => {
    it('returns valid for complete recipe', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1', 'ingredient2'],
        instructions: 'Step 1, Step 2',
        time: 30,
        servings: 4
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
        servings: 4
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Recipe name is required');
    });

    it('returns invalid when name is empty', () => {
      const recipe = {
        name: '   ',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: 30,
        servings: 4
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
        servings: 4
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one ingredient is required');
    });

    it('returns invalid when ingredients are empty', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: [],
        instructions: 'Step 1',
        time: 30,
        servings: 4
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
        servings: 4
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Instructions are required');
    });

    it('returns invalid when instructions are empty', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: '   ',
        time: 30,
        servings: 4
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Instructions are required');
    });

    it('returns invalid when time is missing', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        servings: 4
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid cooking time is required');
    });

    it('returns invalid when time is negative', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: -5,
        servings: 4
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid cooking time is required');
    });

    it('returns invalid when servings are missing', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: 30
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid serving size is required');
    });

    it('returns invalid when servings are less than 1', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: 30,
        servings: 0
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid serving size is required');
    });

    it('returns multiple errors for invalid recipe', () => {
      const recipe = {
        name: '',
        ingredients: [],
        instructions: '',
        time: -1,
        servings: 0
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(5);
    });
  });

  describe('reportRecipe', () => {
    it('reports recipe successfully', async () => {
      const result = await manager.reportRecipe('recipe123', 'inappropriate content');
      expect(result.success).toBe(true);
      expect(window.analytics.track).toHaveBeenCalledWith('recipe_reported', { recipeId: 'recipe123', reason: 'inappropriate content' });
    });

    it('handles missing analytics', async () => {
      delete window.analytics;
      const result = await manager.reportRecipe('recipe123', 'spam');
      expect(result.success).toBe(true);
    });
  });
});
