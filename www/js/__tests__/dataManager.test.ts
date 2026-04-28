// @ts-check
import { DataManager } from '../data/dataManager';

jest.mock('../advanced/recipeImages', () => ({
  addImagesToRecipes: (recipes: any[]) =>
    recipes.map((recipe) => ({
      ...recipe,
      image: recipe.image || 'mocked-image',
    })),
}));

jest.mock('../utils/dietFilters', () => ({
  normalizeCuisine: (cuisine: string) => cuisine?.toLowerCase() || 'other',
}));

jest.mock('../logic/searchIndex', () => ({
  SearchIndex: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue([]),
    getRecipeById: jest.fn().mockReturnValue(undefined),
    getRandomRecipes: jest.fn().mockReturnValue([]),
    getAllRecipes: jest.fn().mockReturnValue([]),
    getRecipesByCuisine: jest.fn().mockReturnValue([]),
    getRecipesByIngredient: jest.fn().mockReturnValue([]),
    addRecipe: jest.fn(),
    removeRecipe: jest.fn(),
  })),
}));

describe('DataManager', () => {
  let setRecipes: jest.Mock;
  let setAutocompleteIngredients: jest.Mock;
  let updateMeals: jest.Mock;
  let manager: DataManager;

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
      manager.validateNutrition({ calories: 10, protein: 1, carbs: 2, fat: 3 })
    ).toBe(true);
    expect(manager.validateNutrition({ calories: 10 })).toBe(false);
    expect(manager.validateNutrition(null as any)).toBe(false);
    expect(manager.validateNutrition(undefined as any)).toBe(false);
    expect(manager.validateNutrition('not an object' as any)).toBe(false);
  });

  it('checks if running on native platform', () => {
    // Should return false in test environment (no Capacitor)
    expect(manager.isNativePlatform()).toBe(false);
  });

  it('searches recipes using search index', () => {
    const mockSearchIndex = {
      search: jest.fn().mockReturnValue([
        { id: '1', name: 'Chicken Recipe' },
        { id: '2', name: 'Beef Recipe' }
      ])
    };

    (manager as any).searchIndex = mockSearchIndex;

    const results = manager.searchRecipes('chicken');

    expect(mockSearchIndex.search).toHaveBeenCalledWith('chicken', undefined);
    expect(results).toEqual([
      { id: '1', name: 'Chicken Recipe' },
      { id: '2', name: 'Beef Recipe' }
    ]);
  });

  it('searches with filters', () => {
    const mockSearchIndex = {
      search: jest.fn().mockReturnValue([
        { id: '1', name: 'Italian Recipe', cuisine: 'italian' }
      ])
    };

    (manager as any).searchIndex = mockSearchIndex;

    const results = manager.searchRecipes('recipe', { cuisine: 'italian', maxTime: 30 });

    expect(mockSearchIndex.search).toHaveBeenCalledWith('recipe', { cuisine: 'italian', maxTime: 30 });
    expect(results).toHaveLength(1);
  });

  it('returns empty array when search index not initialized', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const results = manager.searchRecipes('test');
    
    expect(results).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('[DataManager] Search index not initialized');
    consoleSpy.mockRestore();
  });

  it('gets recipe by id', () => {
    const mockRecipe = { id: '1', name: 'Test Recipe' };
    const mockSearchIndex = {
      getRecipeById: jest.fn().mockReturnValue(mockRecipe)
    };

    (manager as any).searchIndex = mockSearchIndex;

    const result = manager.getRecipeById('1');

    expect(mockSearchIndex.getRecipeById).toHaveBeenCalledWith('1');
    expect(result).toEqual(mockRecipe);
  });

  it('returns undefined for missing recipe', () => {
    const result = manager.getRecipeById('missing');
    expect(result).toBeUndefined();
  });

  it('gets random recipes', () => {
    const mockRecipes = [
      { id: '1', name: 'Recipe 1' },
      { id: '2', name: 'Recipe 2' }
    ];
    const mockSearchIndex = {
      getRandomRecipes: jest.fn().mockReturnValue(mockRecipes)
    };

    (manager as any).searchIndex = mockSearchIndex;

    const results = manager.getRandomRecipes(2);

    expect(mockSearchIndex.getRandomRecipes).toHaveBeenCalledWith(2, undefined);
    expect(results).toEqual(mockRecipes);
  });

  it('saves recipe to search index', async () => {
    const mockSearchIndex = {
      addRecipe: jest.fn(),
      getAllRecipes: jest.fn().mockReturnValue([])
    };

    (manager as any).searchIndex = mockSearchIndex;

    const newRecipe = { 
      id: '1', 
      name: 'New Recipe',
      ingredients: [{ id: 'ing1', name: 'ingredient1', amount: 1, unit: 'cup' }],
      instructions: ['Cook it'],
      minutes: 30,
      difficulty: 'easy' as const
    };

    await manager.saveRecipe(newRecipe);

    expect(mockSearchIndex.addRecipe).toHaveBeenCalledWith(newRecipe);
    expect(setRecipes).toHaveBeenCalled();
  });

  it('deletes recipe from search index', async () => {
    const mockSearchIndex = {
      removeRecipe: jest.fn(),
      getAllRecipes: jest.fn().mockReturnValue([])
    };

    (manager as any).searchIndex = mockSearchIndex;

    await manager.deleteRecipe('1');

    expect(mockSearchIndex.removeRecipe).toHaveBeenCalledWith('1');
    expect(setRecipes).toHaveBeenCalled();
  });

  it('gets recipes by cuisine', () => {
    const mockRecipes = [
      { id: '1', name: 'Pasta', cuisine: 'italian' },
      { id: '2', name: 'Curry', cuisine: 'indian' }
    ];
    const mockSearchIndex = {
      getRecipesByCuisine: jest.fn().mockReturnValue([mockRecipes[0]])
    };

    (manager as any).searchIndex = mockSearchIndex;

    const results = manager.getRecipesByCuisine('italian');

    expect(mockSearchIndex.getRecipesByCuisine).toHaveBeenCalledWith('italian');
    expect(results).toEqual([mockRecipes[0]]);
  });

  it('gets recipes by ingredient', () => {
    const mockRecipes = [
      { id: '1', name: 'Chicken Rice' },
      { id: '2', name: 'Beef Stew' }
    ];
    const mockSearchIndex = {
      getRecipesByIngredient: jest.fn().mockReturnValue([mockRecipes[0]])
    };

    (manager as any).searchIndex = mockSearchIndex;

    const results = manager.getRecipesByIngredient('chicken');

    expect(mockSearchIndex.getRecipesByIngredient).toHaveBeenCalledWith('chicken');
    expect(results).toEqual([mockRecipes[0]]);
  });

  it('returns empty array when getting recipes by cuisine without search index', () => {
    const results = manager.getRecipesByCuisine('italian');
    expect(results).toEqual([]);
  });

  it('returns empty array when getting recipes by ingredient without search index', () => {
    const results = manager.getRecipesByIngredient('chicken');
    expect(results).toEqual([]);
  });

  it('throws error when saving recipe without search index', async () => {
    const newRecipe = { 
      id: '1', 
      name: 'New Recipe',
      ingredients: [{ id: 'ing1', name: 'ingredient1', amount: 1, unit: 'cup' }],
      instructions: ['Cook it'],
      minutes: 30,
      difficulty: 'easy' as const
    };

    await expect(manager.saveRecipe(newRecipe)).rejects.toThrow('Search index not initialized');
  });

  it('throws error when deleting recipe without search index', async () => {
    await expect(manager.deleteRecipe('1')).rejects.toThrow('Search index not initialized');
  });
});
