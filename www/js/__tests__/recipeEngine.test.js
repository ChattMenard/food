import { RecipeEngine } from '../logic/recipeEngine.js';

describe('RecipeEngine', () => {
  let engine;
  let mockRecipes;
  let mockRecipeRatings;

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
      persistRecipeRatings: () => {},
      announce: () => {},
    });
  });

  describe('constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(engine.getRecipes).toBeDefined();
      expect(engine.getRecipeRatings).toBeDefined();
      expect(engine.persistRecipeRatings).toBeDefined();
      expect(engine.announce).toBeDefined();
    });

    it('should initialize ingredientVectors as null', () => {
      expect(engine.ingredientVectors).toBeNull();
    });
  });

  describe('buildIngredientVectors', () => {
    it('should build ingredient vectors when recipes exist', () => {
      engine.buildIngredientVectors();
      expect(engine.ingredientVectors).not.toBeNull();
    });

    it('should not build vectors when recipes are empty', () => {
      const emptyEngine = new RecipeEngine({
        getRecipes: () => [],
        getRecipeRatings: () => ({}),
        persistRecipeRatings: () => {},
        announce: () => {},
      });
      emptyEngine.buildIngredientVectors();
      expect(emptyEngine.ingredientVectors).toBeNull();
    });
  });

  describe('findSimilarRecipes', () => {
    it('should find similar recipes based on ingredient overlap', () => {
      const currentRecipe = mockRecipes[0];
      const similar = engine.findSimilarRecipes(currentRecipe, 2);
      expect(Array.isArray(similar)).toBe(true);
      expect(similar.length).toBeLessThanOrEqual(2);
    });

    it('should not return the same recipe in results', () => {
      const currentRecipe = mockRecipes[0];
      const similar = engine.findSimilarRecipes(currentRecipe, 5);
      expect(similar).not.toContain(currentRecipe);
    });

    it('should respect limit parameter', () => {
      const currentRecipe = mockRecipes[0];
      const similar = engine.findSimilarRecipes(currentRecipe, 1);
      expect(similar.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array when no similar recipes found', () => {
      const uniqueRecipe = {
        name: 'Unique Recipe',
        ingredients: ['dragon fruit', 'star fruit', 'kiwi'],
      };
      const similar = engine.findSimilarRecipes(uniqueRecipe, 5);
      expect(similar).toEqual([]);
    });
  });

  describe('getRecipeModalData', () => {
    it('should return recipe data when recipe exists', () => {
      const data = engine.getRecipeModalData('Pasta Carbonara');
      expect(data).not.toBeNull();
      expect(data.recipe).toBeDefined();
      expect(data.recipeRatings).toBeDefined();
      expect(data.similarRecipes).toBeDefined();
      expect(data.currentRating).toBe(5);
    });

    it('should return null when recipe does not exist', () => {
      const data = engine.getRecipeModalData('Nonexistent Recipe');
      expect(data).toBeNull();
    });

    it('should return 0 rating for unrated recipe', () => {
      const data = engine.getRecipeModalData('Cheese Pasta');
      expect(data.currentRating).toBe(0);
    });
  });

  describe('rateRecipe', () => {
    it('should update recipe rating', () => {
      engine.rateRecipe('Cheese Pasta', 3);
      expect(mockRecipeRatings['Cheese Pasta']).toBe(3);
    });

    it('should persist recipe ratings', () => {
      let persisted = false;
      const engineWithPersist = new RecipeEngine({
        getRecipes: () => mockRecipes,
        getRecipeRatings: () => mockRecipeRatings,
        persistRecipeRatings: () => {
          persisted = true;
        },
        announce: () => {},
      });
      engineWithPersist.rateRecipe('Cheese Pasta', 3);
      expect(persisted).toBe(true);
    });
  });
});
