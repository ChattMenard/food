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

  it('validates recipe objects correctly', () => {
    const validRecipe = {
      id: '1',
      name: 'Test Recipe',
      ingredients: ['ingredient1', 'ingredient2'],
      instructions: 'Step 1, Step 2',
      time: 30,
      servings: 4,
      nutrition: { calories: 200, protein: 10, carbs: 20, fat: 8 }
    };

    expect(manager.validateRecipe(validRecipe)).toBe(true);
    expect(manager.validateRecipe({} as any)).toBe(false);
    expect(manager.validateRecipe(null as any)).toBe(false);
  });

  it('processes recipes correctly', async () => {
    const mockRecipes = [
      {
        id: '1',
        name: 'Test Recipe',
        ingredients: ['ingredient1', 'ingredient2'],
        instructions: 'Step 1',
        time: 30,
        servings: 4,
        nutrition: { calories: 200, protein: 10, carbs: 20, fat: 8 }
      }
    ];

    await manager.processRecipes(mockRecipes);

    expect(setRecipes).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          name: 'Test Recipe',
          image: 'mocked-image'
        })
      ])
    );
  });

  it('extracts ingredients from recipes', () => {
    const mockRecipes = [
      {
        ingredients: ['chicken', 'rice', 'vegetables']
      },
      {
        ingredients: ['beef', 'potatoes', 'carrots']
      }
    ];

    const ingredients = manager.extractIngredients(mockRecipes);

    expect(ingredients).toContain('chicken');
    expect(ingredients).toContain('rice');
    expect(ingredients).toContain('vegetables');
    expect(ingredients).toContain('beef');
    expect(ingredients).toContain('potatoes');
    expect(ingredients).toContain('carrots');
  });

  it('removes duplicate ingredients', () => {
    const mockRecipes = [
      {
        ingredients: ['chicken', 'rice', 'chicken']
      },
      {
        ingredients: ['rice', 'vegetables']
      }
    ];

    const ingredients = manager.extractIngredients(mockRecipes);

    const chickenCount = ingredients.filter((i: string) => i === 'chicken').length;
    const riceCount = ingredients.filter((i: string) => i === 'rice').length;

    expect(chickenCount).toBe(1);
    expect(riceCount).toBe(1);
  });

  it('handles empty ingredient lists', () => {
    const mockRecipes = [
      { ingredients: [] },
      { ingredients: ['chicken'] },
      { ingredients: [] }
    ];

    const ingredients = manager.extractIngredients(mockRecipes);

    expect(ingredients).toEqual(['chicken']);
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

    expect(mockSearchIndex.search).toHaveBeenCalledWith('chicken');
    expect(results).toEqual([
      { id: '1', name: 'Chicken Recipe' },
      { id: '2', name: 'Beef Recipe' }
    ]);
  });

  it('filters recipes by dietary restrictions', () => {
    const mockRecipes = [
      {
        id: '1',
        name: 'Vegetarian Recipe',
        diet: ['vegetarian'],
        ingredients: ['vegetables', 'rice']
      },
      {
        id: '2',
        name: 'Meat Recipe',
        diet: [],
        ingredients: ['chicken', 'rice']
      }
    ];

    const vegetarianRecipes = manager.filterByDiet(mockRecipes, 'vegetarian');

    expect(vegetarianRecipes).toHaveLength(1);
    expect(vegetarianRecipes[0].id).toBe('1');
  });

  it('filters recipes by available ingredients', () => {
    const mockRecipes = [
      {
        id: '1',
        name: 'Recipe 1',
        ingredients: ['chicken', 'rice', 'vegetables']
      },
      {
        id: '2',
        name: 'Recipe 2',
        ingredients: ['beef', 'potatoes']
      }
    ];

    const availableIngredients = ['chicken', 'rice'];
    const filteredRecipes = manager.filterByIngredients(mockRecipes, availableIngredients);

    expect(filteredRecipes).toHaveLength(1);
    expect(filteredRecipes[0].id).toBe('1');
  });

  it('calculates recipe match percentage', () => {
    const recipe = {
      ingredients: ['chicken', 'rice', 'vegetables', 'spices']
    };
    const availableIngredients = ['chicken', 'rice'];

    const matchPercentage = manager.calculateMatchPercentage(recipe, availableIngredients);

    expect(matchPercentage).toBe(50); // 2 out of 4 ingredients
  });

  it('sorts recipes by match percentage', () => {
    const mockRecipes = [
      {
        id: '1',
        ingredients: ['chicken', 'rice']
      },
      {
        id: '2',
        ingredients: ['chicken']
      },
      {
        id: '3',
        ingredients: ['chicken', 'rice', 'vegetables']
      }
    ];

    const availableIngredients = ['chicken', 'rice'];
    const sortedRecipes = manager.sortByMatchPercentage(mockRecipes, availableIngredients);

    expect(sortedRecipes[0].id).toBe('1'); // 100% match
    expect(sortedRecipes[1].id).toBe('3'); // 66% match
    expect(sortedRecipes[2].id).toBe('2'); // 50% match
  });

  it('handles recipe loading errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await manager.loadRecipes();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('initializes search index on construction', () => {
    expect((manager as any).searchIndex).toBeDefined();
  });

  it('updates autocomplete ingredients when processing recipes', async () => {
    const mockRecipes = [
      {
        id: '1',
        ingredients: ['chicken', 'rice']
      }
    ];

    await manager.processRecipes(mockRecipes);

    expect(setAutocompleteIngredients).toHaveBeenCalledWith(['chicken', 'rice']);
  });

  it('normalizes cuisine types', () => {
    const mockRecipes = [
      {
        id: '1',
        cuisine: 'Italian',
        ingredients: ['pasta', 'tomato']
      },
      {
        id: '2',
        cuisine: null,
        ingredients: ['rice', 'vegetables']
      }
    ];

    const processedRecipes = manager.normalizeCuisineTypes(mockRecipes);

    expect(processedRecipes[0].cuisine).toBe('italian');
    expect(processedRecipes[1].cuisine).toBe('other');
  });

  it('handles recipe updates', () => {
    const updatedRecipe = {
      id: '1',
      name: 'Updated Recipe',
      ingredients: ['new ingredient']
    };

    manager.updateRecipe(updatedRecipe);

    expect(updateMeals).toHaveBeenCalledWith(updatedRecipe);
  });
});
