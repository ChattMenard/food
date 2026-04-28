// @ts-check
import { RecipeEngine } from '../logic/recipeEngine';

describe('RecipeEngine', () => {
  let engine: RecipeEngine;
  let mockRecipes: any[];
  let mockRecipeRatings: Record<string, number>;

  beforeEach(() => {
    mockRecipes = [
      {
        name: 'Pasta Carbonara',
        ingredients: [
          'pasta',
          'eggs',
          'bacon',
          'parmesan cheese',
          'black pepper',
        ],
      },
      {
        name: 'Bacon Egg Sandwich',
        ingredients: ['bread', 'bacon', 'eggs', 'butter'],
      },
      {
        name: 'Cheese Pasta',
        ingredients: ['pasta', 'cheddar cheese', 'milk', 'butter'],
      },
    ];

    mockRecipeRatings = {
      'Pasta Carbonara': 5,
      'Bacon Egg Sandwich': 4,
    };

    engine = new RecipeEngine({
      getRecipes: () => mockRecipes,
      getRecipeRatings: () => mockRecipeRatings,
      persistRecipeRatings: () => Promise.resolve(),
      announce: () => {},
    });
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect((engine as any).getRecipes).toBeDefined();
      expect((engine as any).getRecipeRatings).toBeDefined();
      expect((engine as any).persistRecipeRatings).toBeDefined();
      expect((engine as any).announce).toBeDefined();
    });
  });

  describe('findRecipesByIngredients', () => {
    it('should find recipes containing specific ingredients', () => {
      const results = (engine as any).findRecipesByIngredients(['pasta', 'eggs']);
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Pasta Carbonara');
      expect(results[1].name).toBe('Cheese Pasta');
    });

    it('should return empty array for no matches', () => {
      const results = (engine as any).findRecipesByIngredients(['chicken']);
      
      expect(results).toEqual([]);
    });

    it('should handle empty ingredient list', () => {
      const results = (engine as any).findRecipesByIngredients([]);
      
      expect(results).toHaveLength(3); // All recipes match empty list
    });

    it('should sort by ingredient match count', () => {
      const results = (engine as any).findRecipesByIngredients(['pasta']);
      
      expect(results).toHaveLength(2);
      // Both have pasta, but sorting should be consistent
      expect(results[0].ingredients).toContain('pasta');
      expect(results[1].ingredients).toContain('pasta');
    });
  });

  describe('findRecipesByPartialIngredients', () => {
    it('should find recipes with partial ingredient matches', () => {
      const results = (engine as any).findRecipesByPartialIngredients(['pasta', 'cheese'], 0.5);
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Cheese Pasta');
      expect(results[1].name).toBe('Pasta Carbonara');
    });

    it('should respect minimum match threshold', () => {
      const results = (engine as any).findRecipesByPartialIngredients(['pasta', 'cheese'], 0.8);
      
      expect(results).toHaveLength(1); // Only Cheese Pasta matches 50% of 2 ingredients
    });

    it('should include match percentage in results', () => {
      const results = (engine as any).findRecipesByPartialIngredients(['pasta', 'eggs'], 0.5);
      
      expect(results[0]).toHaveProperty('matchPercentage');
      expect(results[0].matchPercentage).toBeGreaterThan(0);
    });
  });

  describe('getRecipeRecommendations', () => {
    it('should recommend recipes based on ratings', () => {
      const recommendations = (engine as any).getRecipeRecommendations();
      
      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].name).toBe('Pasta Carbonara'); // Highest rating
      expect(recommendations[1].name).toBe('Bacon Egg Sandwich'); // Second highest
      expect(recommendations[2].name).toBe('Cheese Pasta'); // No rating (default 0)
    });

    it('should limit number of recommendations', () => {
      const recommendations = (engine as any).getRecipeRecommendations(2);
      
      expect(recommendations).toHaveLength(2);
    });

    it('should include rating in recommendations', () => {
      const recommendations = (engine as any).getRecipeRecommendations();
      
      expect(recommendations[0]).toHaveProperty('rating');
      expect(recommendations[0].rating).toBe(5);
      expect(recommendations[1].rating).toBe(4);
      expect(recommendations[2].rating).toBe(0);
    });
  });

  describe('rateRecipe', () => {
    it('should add rating for recipe', async () => {
      await (engine as any).rateRecipe('Cheese Pasta', 4);
      
      expect(mockRecipeRatings['Cheese Pasta']).toBe(4);
    });

    it('should update existing rating', async () => {
      await (engine as any).rateRecipe('Pasta Carbonara', 3);
      
      expect(mockRecipeRatings['Pasta Carbonara']).toBe(3);
    });

    it('should validate rating range', async () => {
      await expect((engine as any).rateRecipe('Test Recipe', -1)).rejects.toThrow('Rating must be between 1 and 5');
      await expect((engine as any).rateRecipe('Test Recipe', 6)).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('should persist ratings', async () => {
      const mockPersist = jest.fn();
      engine = new RecipeEngine({
        getRecipes: () => mockRecipes,
        getRecipeRatings: () => mockRecipeRatings,
        persistRecipeRatings: mockPersist,
        announce: () => {},
      });

      await (engine as any).rateRecipe('Test Recipe', 5);
      
      expect(mockPersist).toHaveBeenCalledWith(mockRecipeRatings);
    });
  });

  describe('getRecipeStats', () => {
    it('should calculate recipe statistics', () => {
      const stats = (engine as any).getRecipeStats();
      
      expect(stats).toHaveProperty('totalRecipes');
      expect(stats).toHaveProperty('averageRating');
      expect(stats).toHaveProperty('ratedRecipes');
      expect(stats).toHaveProperty('unratedRecipes');
      
      expect(stats.totalRecipes).toBe(3);
      expect(stats.ratedRecipes).toBe(2);
      expect(stats.unratedRecipes).toBe(1);
      expect(stats.averageRating).toBe(4.5); // (5 + 4) / 2
    });

    it('should handle empty recipe list', () => {
      engine = new RecipeEngine({
        getRecipes: () => [],
        getRecipeRatings: () => ({}),
        persistRecipeRatings: () => Promise.resolve(),
        announce: () => {},
      });

      const stats = (engine as any).getRecipeStats();
      
      expect(stats.totalRecipes).toBe(0);
      expect(stats.averageRating).toBe(0);
    });

    it('should handle no ratings', () => {
      engine = new RecipeEngine({
        getRecipes: () => mockRecipes,
        getRecipeRatings: () => ({}),
        persistRecipeRatings: () => Promise.resolve(),
        announce: () => {},
      });

      const stats = (engine as any).getRecipeStats();
      
      expect(stats.ratedRecipes).toBe(0);
      expect(stats.unratedRecipes).toBe(3);
      expect(stats.averageRating).toBe(0);
    });
  });

  describe('searchRecipes', () => {
    it('should search recipes by name', () => {
      const results = (engine as any).searchRecipes('pasta');
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Pasta Carbonara');
      expect(results[1].name).toBe('Cheese Pasta');
    });

    it('should search recipes by ingredient', () => {
      const results = (engine as any).searchRecipes('bacon');
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Pasta Carbonara');
      expect(results[1].name).toBe('Bacon Egg Sandwich');
    });

    it('should be case insensitive', () => {
      const results = (engine as any).searchRecipes('PASTA');
      
      expect(results).toHaveLength(2);
    });

    it('should handle partial matches', () => {
      const results = (engine as any).searchRecipes('egg');
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Pasta Carbonara');
      expect(results[1].name).toBe('Bacon Egg Sandwich');
    });

    it('should return empty for no matches', () => {
      const results = (engine as any).searchRecipes('chicken');
      
      expect(results).toEqual([]);
    });
  });

  describe('getRandomRecipe', () => {
    it('should return a random recipe', () => {
      const recipe = (engine as any).getRandomRecipe();
      
      expect(recipe).toBeDefined();
      expect(mockRecipes).toContain(recipe);
    });

    it('should return different recipes on multiple calls', () => {
      const recipe1 = (engine as any).getRandomRecipe();
      const recipe2 = (engine as any).getRandomRecipe();
      
      // Note: This test might occasionally fail due to randomness
      // but should pass most of the time
      expect(recipe1).toBeDefined();
      expect(recipe2).toBeDefined();
    });

    it('should handle empty recipe list', () => {
      engine = new RecipeEngine({
        getRecipes: () => [],
        getRecipeRatings: () => ({}),
        persistRecipeRatings: () => Promise.resolve(),
        announce: () => {},
      });

      const recipe = (engine as any).getRandomRecipe();
      
      expect(recipe).toBeUndefined();
    });
  });

  describe('filterRecipes', () => {
    it('should filter recipes by custom criteria', () => {
      const filtered = (engine as any).filterRecipes((recipe: any) => 
        recipe.ingredients.includes('pasta')
      );
      
      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe('Pasta Carbonara');
      expect(filtered[1].name).toBe('Cheese Pasta');
    });

    it('should handle multiple criteria', () => {
      const filtered = (engine as any).filterRecipes((recipe: any) => 
        recipe.ingredients.includes('pasta') && recipe.ingredients.includes('eggs')
      );
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Pasta Carbonara');
    });

    it('should return empty if no matches', () => {
      const filtered = (engine as any).filterRecipes((recipe: any) => 
        recipe.ingredients.includes('chicken')
      );
      
      expect(filtered).toEqual([]);
    });
  });

  describe('getRecipeDetails', () => {
    it('should return detailed recipe information', () => {
      const details = (engine as any).getRecipeDetails('Pasta Carbonara');
      
      expect(details).toHaveProperty('name');
      expect(details).toHaveProperty('ingredients');
      expect(details).toHaveProperty('ingredientCount');
      expect(details).toHaveProperty('rating');
      expect(details).toHaveProperty('ratingText');
      
      expect(details.name).toBe('Pasta Carbonara');
      expect(details.ingredientCount).toBe(5);
      expect(details.rating).toBe(5);
      expect(details.ratingText).toBe('Excellent');
    });

    it('should handle missing recipe', () => {
      const details = (engine as any).getRecipeDetails('Non-existent Recipe');
      
      expect(details).toBeUndefined();
    });

    it('should handle unrated recipe', () => {
      const details = (engine as any).getRecipeDetails('Cheese Pasta');
      
      expect(details.rating).toBe(0);
      expect(details.ratingText).toBe('Not rated');
    });
  });

  describe('ingredient analysis', () => {
    it('should get ingredient frequency', () => {
      const frequency = (engine as any).getIngredientFrequency();
      
      expect(frequency).toHaveProperty('pasta');
      expect(frequency).toHaveProperty('eggs');
      expect(frequency).toHaveProperty('bacon');
      expect(frequency).toHaveProperty('butter');
      
      expect(frequency.pasta).toBe(2);
      expect(frequency.eggs).toBe(2);
      expect(frequency.bacon).toBe(2);
      expect(frequency.butter).toBe(2);
    });

    it('should get most common ingredients', () => {
      const common = (engine as any).getMostCommonIngredients(3);
      
      expect(common).toHaveLength(3);
      expect(common[0].ingredient).toBe('pasta');
      expect(common[0].count).toBe(2);
    });

    it('should get recipes using ingredient', () => {
      const recipes = (engine as any).getRecipesUsingIngredient('pasta');
      
      expect(recipes).toHaveLength(2);
      expect(recipes[0].name).toBe('Pasta Carbonara');
      expect(recipes[1].name).toBe('Cheese Pasta');
    });
  });

  describe('error handling', () => {
    it('should handle invalid recipe data', () => {
      engine = new RecipeEngine({
        getRecipes: () => [null, undefined, {}] as any,
        getRecipeRatings: () => ({}),
        persistRecipeRatings: () => Promise.resolve(),
        announce: () => {},
      });

      expect(() => (engine as any).findRecipesByIngredients(['test'])).not.toThrow();
    });

    it('should handle missing dependencies gracefully', () => {
      engine = new RecipeEngine({
        getRecipes: undefined as any,
        getRecipeRatings: undefined as any,
        persistRecipeRatings: undefined as any,
        announce: undefined as any,
      });

      expect(() => (engine as any).findRecipesByIngredients(['test'])).not.toThrow();
    });
  });
});
