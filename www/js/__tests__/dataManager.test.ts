// @ts-check
import { DataManager } from '../data/dataManager';

jest.mock('../advanced/recipeImages', () => ({
  addImagesToRecipes: (recipes) =>
    recipes.map((recipe) => ({
      ...recipe,
      image: recipe.image || 'mocked-image',
    })),
}));

jest.mock('../utils/dietFilters', () => ({
  normalizeCuisine: (cuisine) => cuisine?.toLowerCase() || 'other',
}));

jest.mock('../logic/searchIndex', () => ({
  SearchIndex: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue([]),
  })),
}));

describe('DataManager', () => {
  let setRecipes;
  let setAutocompleteIngredients;
  let updateMeals;
  let manager;

  beforeEach(() => {
    setRecipes = jest.fn();
    setAutocompleteIngredients = jest.fn();
    updateMeals = jest.fn();
    manager = new DataManager({
      setRecipes,
      setAutocompleteIngredients,
      updateMeals,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('validates nutrition objects correctly', () => {
    expect(
      manager.validateNutrition({ calories: 10, protein: 1, carbs: 2, fat: 3 }),
    ).toBe(true);
    expect(manager.validateNutrition({ calories: 10 })).toBe(false);
    expect(manager.validateNutrition(null)).toBe(false);
    expect(manager.validateNutrition(undefined)).toBe(false);
    expect(manager.validateNutrition('not an object')).toBe(false);
    expect(
      manager.validateNutrition({ calories: 10, protein: 1, carbs: 2 }),
    ).toBe(false);
  });

  it('returns empty array if search index not ready', () => {
    const results = manager.searchRecipes('anything');
    expect(results).toEqual([]);
  });

  it('handles load errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await manager.loadData();

    expect(setRecipes).not.toHaveBeenCalled();
    expect(setAutocompleteIngredients).not.toHaveBeenCalled();
  });

  it('loads datasets and sets recipes', async () => {
    const ingredientsResponse = {
      json: jest.fn().mockResolvedValue(['salt', 'pepper']),
    };
    const recipes = [
      {
        name: 'Test Recipe',
        ingredients: ['test'],
        nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5 },
      },
    ];

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(ingredientsResponse)
      .mockRejectedValueOnce(new Error('Gzip not supported'))
      .mockResolvedValueOnce({ json: jest.fn().mockImplementation(() => Promise.resolve(recipes)) });

    await manager.loadData();

    expect(setAutocompleteIngredients).toHaveBeenCalledWith(['salt', 'pepper']);
    expect(setRecipes).toHaveBeenCalled();
  });

  it('filters out recipes with invalid schema', async () => {
    const ingredientsResponse = { json: jest.fn().mockImplementation(() => Promise.resolve(['salt'])) };
    const invalidRecipes = [
      {
        name: 'Valid Recipe',
        ingredients: ['test'],
        nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5 },
      },
      {
        ingredients: ['test'],
        nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5 },
      },
      {
        name: 'No Ingredients',
        nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5 },
      },
      {
        name: 'Invalid Ingredients',
        ingredients: 'not an array',
        nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5 },
      },
    ];

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(ingredientsResponse)
      .mockRejectedValueOnce(new Error('Gzip error'))
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(invalidRecipes),
      });

    await manager.loadData();

    const call = setRecipes.mock.calls[0][0];
    expect(call).toHaveLength(1);
    expect(call[0].name).toBe('Valid Recipe');
  });

  it('removes invalid nutrition data from recipes', async () => {
    const ingredientsResponse = { json: jest.fn().mockImplementation(() => Promise.resolve(['salt'])) };
    const recipes = [
      {
        name: 'Valid Recipe',
        ingredients: ['test'],
        nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5 },
      },
      {
        name: 'Invalid Nutrition',
        ingredients: ['test'],
        nutrition: { calories: 100 },
      },
    ];

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(ingredientsResponse)
      .mockRejectedValueOnce(new Error('Gzip error'))
      .mockResolvedValueOnce({ json: jest.fn().mockImplementation(() => Promise.resolve(recipes)) });

    await manager.loadData();

    const call = setRecipes.mock.calls[0][0];
    const invalidRecipeResult = call.find(
      (r) => r.name === 'Invalid Nutrition'
    );
    expect(invalidRecipeResult.nutrition).toBeUndefined();
  });

  it('normalizes cuisine values for recipes with category', async () => {
    const ingredientsResponse = { json: jest.fn().mockImplementation(() => Promise.resolve(['salt'])) };
    const recipes = [
      {
        name: 'Italian Recipe',
        ingredients: ['test'],
        category: 'ITALIAN',
        nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5 },
      },
    ];

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(ingredientsResponse)
      .mockRejectedValueOnce(new Error('Gzip error'))
      .mockResolvedValueOnce({ json: jest.fn().mockImplementation(() => Promise.resolve(recipes)) });

    await manager.loadData();

    const call = setRecipes.mock.calls[0][0];
    expect(call[0].category).toBe('italian');
  });

  it('loads first 500 recipes immediately', async () => {
    const ingredientsResponse = { json: jest.fn().mockImplementation(() => Promise.resolve(['salt'])) };
    const recipes = Array.from({ length: 600 }, (_, i) => ({
      name: `Recipe ${i}`,
      ingredients: ['test'],
      nutrition: { calories: 100, protein: 5, carbs: 10, fat: 5 },
    }));

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(ingredientsResponse)
      .mockRejectedValueOnce(new Error('Gzip error'))
      .mockResolvedValueOnce({ json: jest.fn().mockImplementation(() => Promise.resolve(recipes)) });

    await manager.loadData();

    expect(setRecipes.mock.calls[0][0].length).toBe(500);
  });
});
