import { DataManager } from '../data/dataManager.js';

jest.mock('../advanced/recipeImages.js', () => ({
  addImagesToRecipes: recipes =>
    recipes.map(recipe => ({ ...recipe, image: recipe.image || 'mocked-image' })),
}));

jest.mock('../utils/dietFilters.js', () => ({
  normalizeCuisine: cuisine => cuisine?.toLowerCase() || 'other',
}));

const flushPromises = () => new Promise(setImmediate);

describe('DataManager', () => {
  let setRecipes;
  let setAutocompleteIngredients;
  let updateMeals;
  let manager;

  beforeEach(() => {
    jest.useFakeTimers();
    setRecipes = jest.fn();
    setAutocompleteIngredients = jest.fn();
    updateMeals = jest.fn();
    manager = new DataManager({ setRecipes, setAutocompleteIngredients, updateMeals });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
    global.fetch = undefined;
  });

  it('validates nutrition objects correctly', () => {
    expect(manager.validateNutrition({ calories: 10, protein: 1, carbs: 2, fat: 3 })).toBe(true);
    expect(manager.validateNutrition({ calories: 10 })).toBe(false);
    expect(manager.validateNutrition(null)).toBe(false);
  });

  it('loads datasets, sets recipes, and builds search index', async () => {
    const ingredientsResponse = { json: jest.fn().mockResolvedValue(['salt', 'pepper']) };
    const fallbackRecipes = [
      { name: 'Apple Pie', ingredients: ['apple', 'flour'], nutrition: { calories: 200, protein: 5, carbs: 20, fat: 5 } },
      { name: 'Banana Bread', ingredients: ['banana', 'flour'], nutrition: { calories: 250, protein: 6, carbs: 30, fat: 6 } },
    ];

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(ingredientsResponse)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(fallbackRecipes) });

    await manager.loadData();
    await flushPromises();

    expect(setAutocompleteIngredients).toHaveBeenCalledWith(['salt', 'pepper']);
    expect(setRecipes).toHaveBeenNthCalledWith(1, expect.arrayContaining(fallbackRecipes));

    jest.runAllTimers();
    await flushPromises();

    expect(setRecipes).toHaveBeenNthCalledWith(2, expect.arrayContaining(fallbackRecipes));
    expect(updateMeals).toHaveBeenCalled();

    const results = manager.searchRecipes('apple');
    expect(results[0].name).toBe('Apple Pie');
  });

  it('returns empty array if search index not ready', () => {
    const results = manager.searchRecipes('anything');
    expect(results).toEqual([]);
  });
});
