// @ts-check
import { CommunityRecipes } from '../advanced/communityRecipes';

describe('CommunityRecipes', () => {
  let manager;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      put: jest.fn().mockResolvedValue(),
      get: jest.fn(),
      getAll: jest.fn().mockResolvedValue([]),
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

    it('returns invalid when name is empty', () => {
      const recipe = {
        name: '   ',
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

    it('returns invalid when ingredients are empty', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: [],
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

    it('returns invalid when instructions are empty', () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: '   ',
        time: 30,
        servings: 4,
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
        servings: 4,
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
        servings: 4,
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
        time: 30,
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
        servings: 0,
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
        servings: 0,
      };

      const result = manager.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(5);
    });
  });

  describe('reportRecipe', () => {
    it('reports recipe successfully', async () => {
      const result = await manager.reportRecipe(
        'recipe123',
        'inappropriate content'
      );
      expect(result.success).toBe(true);
      expect(window.analytics.track).toHaveBeenCalledWith('recipe_reported', {
        recipeId: 'recipe123',
        reason: 'inappropriate content',
      });
    });

    it('handles missing analytics', async () => {
      delete window.analytics;
      const result = await manager.reportRecipe('recipe123', 'spam');
      expect(result.success).toBe(true);
    });
  });

  describe('submitRecipe', () => {
    it('submits valid recipe', async () => {
      const recipe = {
        name: 'Test Recipe',
        ingredients: ['ingredient1'],
        instructions: 'Step 1',
        time: 30,
        servings: 4,
      };

      const result = await manager.submitRecipe(recipe);
      expect(result.id).toBeDefined();
      expect(result.submittedAt).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.likes).toBe(0);
      expect(result.saves).toBe(0);
      expect(mockDb.put).toHaveBeenCalledWith(
        'communitySubmissions',
        expect.objectContaining({ name: 'Test Recipe' }),
      );
    });

    it('throws error for invalid recipe', async () => {
      const recipe = {
        name: '',
        ingredients: [],
        instructions: '',
        time: -1,
        servings: 0,
      };

      await expect(manager.submitRecipe(recipe)).rejects.toThrow();
    });
  });

  describe('getCommunityRecipes', () => {
    it('returns approved recipes', async () => {
      mockDb.getAll.mockResolvedValue([
        { id: '1', name: 'Recipe 1', status: 'approved', likes: 10 },
        { id: '2', name: 'Recipe 2', status: 'pending', likes: 5 },
      ]);

      const recipes = await manager.getCommunityRecipes();
      expect(recipes).toHaveLength(1);
      expect(recipes[0].name).toBe('Recipe 1');
    });

    it('filters by cuisine', async () => {
      mockDb.getAll.mockResolvedValue([
        {
          id: '1',
          name: 'Recipe 1',
          status: 'approved',
          cuisine: 'Italian',
          likes: 10,
        },
        {
          id: '2',
          name: 'Recipe 2',
          status: 'approved',
          cuisine: 'Mexican',
          likes: 5,
        },
      ]);

      const recipes = await manager.getCommunityRecipes({ cuisine: 'Italian' });
      expect(recipes).toHaveLength(1);
      expect(recipes[0].cuisine).toBe('Italian');
    });

    it('filters by dietary', async () => {
      mockDb.getAll.mockResolvedValue([
        {
          id: '1',
          name: 'Recipe 1',
          status: 'approved',
          dietary: ['vegan'],
          likes: 10,
        },
        {
          id: '2',
          name: 'Recipe 2',
          status: 'approved',
          dietary: ['gluten-free'],
          likes: 5,
        },
      ]);

      const recipes = await manager.getCommunityRecipes({ dietary: 'vegan' });
      expect(recipes).toHaveLength(1);
    });

    it('sorts by likes', async () => {
      mockDb.getAll.mockResolvedValue([
        { id: '1', name: 'Recipe 1', status: 'approved', likes: 5 },
        { id: '2', name: 'Recipe 2', status: 'approved', likes: 10 },
      ]);

      const recipes = await manager.getCommunityRecipes();
      expect(recipes[0].likes).toBeGreaterThanOrEqual(recipes[1].likes);
    });
  });

  describe('likeRecipe', () => {
    it('increments like count', async () => {
      mockDb.get.mockResolvedValue({ id: '1', name: 'Recipe 1', likes: 5 });

      const result = await manager.likeRecipe('1');
      expect(result.likes).toBe(6);
      expect(mockDb.put).toHaveBeenCalledWith(
        'communitySubmissions',
        expect.objectContaining({ likes: 6 }),
      );
      expect(window.analytics.track).toHaveBeenCalledWith('recipe_liked', {
        recipeId: '1',
      });
    });

    it('throws error for non-existent recipe', async () => {
      mockDb.get.mockResolvedValue(null);

      await expect(manager.likeRecipe('nonexistent')).rejects.toThrow(
        'Recipe not found'
      );
    });
  });

  describe('saveRecipe', () => {
    it('increments save count and adds to saved', async () => {
      mockDb.get.mockResolvedValue({ id: '1', name: 'Recipe 1', saves: 2 });
      mockDb.getAll.mockResolvedValue(['recipe2']);

      const result = await manager.saveRecipe('1');
      expect(result.saves).toBe(3);
      expect(window.analytics.track).toHaveBeenCalledWith('recipe_saved', {
        recipeId: '1',
      });
    });

    it('throws error for non-existent recipe', async () => {
      mockDb.get.mockResolvedValue(null);

      await expect(manager.saveRecipe('nonexistent')).rejects.toThrow(
        'Recipe not found'
      );
    });
  });

  describe('getSavedRecipes', () => {
    it('returns saved recipe IDs', async () => {
      mockDb.getAll.mockResolvedValue(['recipe1', 'recipe2']);

      const saved = await manager.getSavedRecipes();
      expect(saved).toEqual(['recipe1', 'recipe2']);
    });

    it('returns empty array when no saved recipes', async () => {
      mockDb.getAll.mockResolvedValue(null);

      const saved = await manager.getSavedRecipes();
      expect(saved).toEqual([]);
    });
  });

  describe('getMySubmissions', () => {
    it('returns user submissions', async () => {
      mockDb.getAll.mockResolvedValue([
        { id: '1', name: 'My Recipe 1' },
        { id: '2', name: 'My Recipe 2' },
      ]);

      const submissions = await manager.getMySubmissions();
      expect(submissions).toHaveLength(2);
    });
  });

  describe('addReview', () => {
    it('adds review to recipe', async () => {
      const recipe = { id: '1', name: 'Recipe 1', reviews: [] };
      mockDb.get.mockResolvedValue(recipe);

      const result = await manager.addReview('1', {
        rating: 5,
        comment: 'Great!',
      });
      expect(result.reviews).toHaveLength(1);
      expect(result.rating).toBe(5);
      expect(result.reviews[0].rating).toBe(5);
    });

    it('calculates average rating', async () => {
      const recipe = { id: '1', name: 'Recipe 1', reviews: [{ rating: 4 }] };
      mockDb.get.mockResolvedValue(recipe);

      const result = await manager.addReview('1', {
        rating: 5,
        comment: 'Great!',
      });
      expect(result.rating).toBe(4.5);
    });

    it('throws error for non-existent recipe', async () => {
      mockDb.get.mockResolvedValue(null);

      await expect(
        manager.addReview('nonexistent', { rating: 5 }),
      ).rejects.toThrow('Recipe not found');
    });
  });

  describe('searchRecipes', () => {
    it('searches by recipe name', async () => {
      mockDb.getAll.mockResolvedValue([
        {
          id: '1',
          name: 'Pasta Carbonara',
          status: 'approved',
          ingredients: ['pasta'],
        },
        {
          id: '2',
          name: 'Chicken Salad',
          status: 'approved',
          ingredients: ['chicken'],
        },
      ]);

      const results = await manager.searchRecipes('pasta');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Pasta Carbonara');
    });

    it('searches by ingredient', async () => {
      mockDb.getAll.mockResolvedValue([
        {
          id: '1',
          name: 'Pasta Dish',
          status: 'approved',
          ingredients: ['pasta', 'tomato'],
        },
        {
          id: '2',
          name: 'Chicken Salad',
          status: 'approved',
          ingredients: ['chicken'],
        },
      ]);

      const results = await manager.searchRecipes('tomato');
      expect(results).toHaveLength(1);
    });

    it('returns empty array for no matches', async () => {
      mockDb.getAll.mockResolvedValue([
        {
          id: '1',
          name: 'Pasta Dish',
          status: 'approved',
          ingredients: ['pasta'],
        },
      ]);

      const results = await manager.searchRecipes('nonexistent');
      expect(results).toEqual([]);
    });

    it('case insensitive search', async () => {
      mockDb.getAll.mockResolvedValue([
        {
          id: '1',
          name: 'Pasta Carbonara',
          status: 'approved',
          ingredients: ['pasta'],
        },
      ]);

      const results = await manager.searchRecipes('PASTA');
      expect(results).toHaveLength(1);
    });
  });
});
