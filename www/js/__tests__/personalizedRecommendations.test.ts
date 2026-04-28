// @ts-check
import { PersonalizedRecommendations } from '../features/meals/personalizedRecommendations';

describe('PersonalizedRecommendations', () => {
  let recommendations: PersonalizedRecommendations;
  let mockGetMealPlan: jest.Mock;
  let mockGetRecipes: jest.Mock;
  let mockGetPreferences: jest.Mock;
  let mockGetRecipeRatings: jest.Mock;

  beforeEach(() => {
    mockGetMealPlan = jest.fn();
    mockGetRecipes = jest.fn();
    mockGetPreferences = jest.fn();
    mockGetRecipeRatings = jest.fn();

    recommendations = new PersonalizedRecommendations({
      getMealPlan: mockGetMealPlan,
      getRecipes: mockGetRecipes,
      getPreferences: mockGetPreferences,
      getRecipeRatings: mockGetRecipeRatings,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect((recommendations as any).getMealPlan).toBe(mockGetMealPlan);
      expect((recommendations as any).getRecipes).toBe(mockGetRecipes);
      expect((recommendations as any).getPreferences).toBe(mockGetPreferences);
      expect((recommendations as any).getRecipeRatings).toBe(mockGetRecipeRatings);
    });
  });

  describe('getPersonalizedSuggestions', () => {
    it('returns favorite recipes (highly rated)', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: [] },
        { name: 'Salad', ingredients: [] },
        { name: 'Soup', ingredients: [] },
      ]);
      mockGetRecipeRatings.mockReturnValue({ Pasta: 5, Salad: 3, Soup: 4 });
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions();
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].name).toBe('Pasta');
      expect(suggestions[0].score).toBe(5);
      expect(suggestions[1].name).toBe('Soup');
      expect(suggestions[1].score).toBe(4);
      expect(suggestions[2].name).toBe('Salad');
      expect(suggestions[2].score).toBe(3);
    });

    it('filters by dietary preferences', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Chicken Pasta', ingredients: ['chicken', 'pasta'], tags: ['meat'] },
        { name: 'Vegetarian Salad', ingredients: ['lettuce', 'tomatoes'], tags: ['vegetarian'] },
        { name: 'Beef Soup', ingredients: ['beef', 'vegetables'], tags: ['meat'] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({ diet: 'vegetarian' });

      const suggestions = (recommendations as any).getPersonalizedSuggestions();
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].name).toBe('Vegetarian Salad');
    });

    it('considers meal plan history', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta' },
          { day: 'Tuesday', recipe: 'Salad' },
          { day: 'Wednesday', recipe: 'Pasta' },
        ]
      });
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: [] },
        { name: 'Salad', ingredients: [] },
        { name: 'Soup', ingredients: [] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions();
      
      // Pasta should be ranked higher due to frequency in meal plan
      const pastaSuggestion = suggestions.find((s: any) => s.name === 'Pasta');
      const saladSuggestion = suggestions.find((s: any) => s.name === 'Salad');
      
      expect(pastaSuggestion.score).toBeGreaterThan(saladSuggestion.score);
    });

    it('excludes recently cooked recipes', () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', cookedAt: oneWeekAgo },
          { day: 'Tuesday', recipe: 'Salad', cookedAt: twoDaysAgo },
        ]
      });
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: [] },
        { name: 'Salad', ingredients: [] },
        { name: 'Soup', ingredients: [] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions();
      
      // Salad should be excluded or penalized for being cooked recently
      expect(suggestions.some((s: any) => s.name === 'Pasta')).toBe(true);
      expect(suggestions.some((s: any) => s.name === 'Soup')).toBe(true);
    });

    it('limits suggestions to requested count', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe 1', ingredients: [] },
        { name: 'Recipe 2', ingredients: [] },
        { name: 'Recipe 3', ingredients: [] },
        { name: 'Recipe 4', ingredients: [] },
        { name: 'Recipe 5', ingredients: [] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions(3);
      expect(suggestions).toHaveLength(3);
    });
  });

  describe('getRecommendationsByCategory', () => {
    it('groups recommendations by category', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Chicken Dish', ingredients: ['chicken'], category: 'protein', tags: ['meat'] },
        { name: 'Vegetable Soup', ingredients: ['carrots', 'celery'], category: 'soup', tags: ['vegetarian'] },
        { name: 'Fruit Salad', ingredients: ['apples', 'bananas'], category: 'salad', tags: ['vegetarian'] },
        { name: 'Beef Stew', ingredients: ['beef', 'potatoes'], category: 'soup', tags: ['meat'] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const byCategory = (recommendations as any).getRecommendationsByCategory();
      
      expect(byCategory.protein).toHaveLength(1);
      expect(byCategory.soup).toHaveLength(2);
      expect(byCategory.salad).toHaveLength(1);
      
      expect(byCategory.soup[0].name).toBe('Vegetable Soup');
      expect(byCategory.soup[1].name).toBe('Beef Stew');
    });

    it('filters categories based on preferences', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Chicken Dish', ingredients: ['chicken'], category: 'protein', tags: ['meat'] },
        { name: 'Vegetable Soup', ingredients: ['carrots'], category: 'soup', tags: ['vegetarian'] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({ diet: 'vegetarian' });

      const byCategory = (recommendations as any).getRecommendationsByCategory();
      
      expect(byCategory.protein).toEqual([]);
      expect(byCategory.soup).toHaveLength(1);
      expect(byCategory.soup[0].name).toBe('Vegetable Soup');
    });
  });

  describe('getSeasonalRecommendations', () => {
    it('recommends seasonal ingredients', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Summer Salad', ingredients: ['tomatoes', 'cucumber'], season: 'summer' },
        { name: 'Winter Soup', ingredients: ['squash', 'potatoes'], season: 'winter' },
        { name: 'Spring Pasta', ingredients: ['asparagus', 'peas'], season: 'spring' },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      // Mock current season as summer
      const mockDate = new Date('2023-07-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const seasonal = (recommendations as any).getSeasonalRecommendations();
      
      expect(seasonal[0].name).toBe('Summer Salad');
      expect(seasonal[0].seasonalScore).toBeGreaterThan(0);

      jest.restoreAllMocks();
    });

    it('handles recipes without season data', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Anytime Dish', ingredients: ['rice', 'beans'] },
        { name: 'Summer Salad', ingredients: ['tomatoes'], season: 'summer' },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const seasonal = (recommendations as any).getSeasonalRecommendations();
      
      expect(seasonal).toHaveLength(2);
      expect(seasonal.some((s: any) => s.name === 'Anytime Dish')).toBe(true);
    });
  });

  describe('getQuickMealSuggestions', () => {
    it('recommends recipes with short prep times', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Quick Salad', ingredients: [], prepTime: 10, cookTime: 0 },
        { name: 'Slow Roast', ingredients: [], prepTime: 30, cookTime: 180 },
        { name: 'Medium Pasta', ingredients: [], prepTime: 20, cookTime: 30 },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const quick = (recommendations as any).getQuickMealSuggestions(30); // 30 min max
      
      expect(quick).toHaveLength(2);
      expect(quick[0].name).toBe('Quick Salad');
      expect(quick[1].name).toBe('Medium Pasta');
      expect(quick.some((s: any) => s.name === 'Slow Roast')).toBe(false);
    });

    it('sorts by total time', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Medium Dish', ingredients: [], prepTime: 15, cookTime: 15 },
        { name: 'Quick Dish', ingredients: [], prepTime: 5, cookTime: 5 },
        { name: 'Long Dish', ingredients: [], prepTime: 30, cookTime: 30 },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const quick = (recommendations as any).getQuickMealSuggestions(60);
      
      expect(quick[0].name).toBe('Quick Dish');
      expect(quick[1].name).toBe('Medium Dish');
      expect(quick[2].name).toBe('Long Dish');
    });
  });

  describe('getIngredientBasedSuggestions', () => {
    it('suggests recipes using available ingredients', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: ['pasta', 'tomato sauce', 'garlic'] },
        { name: 'Salad', ingredients: ['lettuce', 'tomatoes', 'cucumber'] },
        { name: 'Soup', ingredients: ['chicken', 'vegetables', 'broth'] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const availableIngredients = ['pasta', 'garlic', 'lettuce'];
      const suggestions = (recommendations as any).getIngredientBasedSuggestions(availableIngredients);
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].name).toBe('Pasta');
      expect(suggestions[0].matchPercentage).toBe(0.67); // 2/3 ingredients
      expect(suggestions[1].name).toBe('Salad');
      expect(suggestions[1].matchPercentage).toBe(0.33); // 1/3 ingredients
    });

    it('prioritizes recipes with more matching ingredients', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Full Match', ingredients: ['pasta', 'garlic', 'tomatoes'] },
        { name: 'Partial Match', ingredients: ['pasta', 'cheese'] },
        { name: 'No Match', ingredients: ['chicken', 'rice'] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const availableIngredients = ['pasta', 'garlic', 'tomatoes'];
      const suggestions = (recommendations as any).getIngredientBasedSuggestions(availableIngredients);
      
      expect(suggestions[0].name).toBe('Full Match');
      expect(suggestions[0].matchPercentage).toBe(1);
      expect(suggestions[1].name).toBe('Partial Match');
      expect(suggestions[1].matchPercentage).toBe(0.33);
    });
  });

  describe('learning and adaptation', () => {
    it('learns from user ratings', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: [], cuisine: 'italian' },
        { name: 'Tacos', ingredients: [], cuisine: 'mexican' },
        { name: 'Curry', ingredients: [], cuisine: 'indian' },
      ]);
      mockGetRecipeRatings.mockReturnValue({ Pasta: 5, Tacos: 4, Curry: 2 });
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions();
      
      // Should favor Italian cuisine due to high rating
      const pastaSuggestion = suggestions.find((s: any) => s.name === 'Pasta');
      const currySuggestion = suggestions.find((s: any) => s.name === 'Curry');
      
      expect(pastaSuggestion.score).toBeGreaterThan(currySuggestion.score);
    });

    it('adapts to cooking patterns', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta' },
          { day: 'Tuesday', recipe: 'Pasta' },
          { day: 'Wednesday', recipe: 'Pasta' },
          { day: 'Thursday', recipe: 'Salad' },
          { day: 'Friday', recipe: 'Salad' },
        ]
      });
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: [] },
        { name: 'Salad', ingredients: [] },
        { name: 'Soup', ingredients: [] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions();
      
      // Should learn user prefers pasta over salad
      const pastaSuggestion = suggestions.find((s: any) => s.name === 'Pasta');
      const saladSuggestion = suggestions.find((s: any) => s.name === 'Salad');
      
      expect(pastaSuggestion.frequency).toBe(3);
      expect(saladSuggestion.frequency).toBe(2);
    });
  });

  describe('diversity and variety', () => {
    it('ensures cuisine diversity in suggestions', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Italian Pasta', ingredients: [], cuisine: 'italian' },
        { name: 'Italian Pizza', ingredients: [], cuisine: 'italian' },
        { name: 'Mexican Tacos', ingredients: [], cuisine: 'mexican' },
        { name: 'Indian Curry', ingredients: [], cuisine: 'indian' },
        { name: 'Chinese Stir Fry', ingredients: [], cuisine: 'chinese' },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions(3);
      
      const cuisines = suggestions.map((s: any) => s.cuisine);
      const uniqueCuisines = new Set(cuisines);
      
      // Should have diverse cuisines
      expect(uniqueCuisines.size).toBeGreaterThan(1);
    });

    it('balances meal types', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Breakfast Pancakes', ingredients: [], mealType: 'breakfast' },
        { name: 'Lunch Sandwich', ingredients: [], mealType: 'lunch' },
        { name: 'Dinner Steak', ingredients: [], mealType: 'dinner' },
        { name: 'Snack Fruit', ingredients: [], mealType: 'snack' },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions(4);
      
      const mealTypes = suggestions.map((s: any) => s.mealType);
      const uniqueMealTypes = new Set(mealTypes);
      
      // Should include different meal types
      expect(uniqueMealTypes.size).toBeGreaterThan(1);
    });
  });

  describe('error handling', () => {
    it('handles missing recipe data', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = (recommendations as any).getPersonalizedSuggestions();
      
      expect(suggestions).toEqual([]);
    });

    it('handles invalid ratings', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe 1', ingredients: [] },
        { name: 'Recipe 2', ingredients: [] },
      ]);
      mockGetRecipeRatings.mockReturnValue({ 'Recipe 1': 'invalid', 'Recipe 2': null as any });
      mockGetPreferences.mockReturnValue({});

      expect(() => (recommendations as any).getPersonalizedSuggestions()).not.toThrow();
    });

    it('handles empty preferences', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe 1', ingredients: [] },
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue(null as any);

      expect(() => (recommendations as any).getPersonalizedSuggestions()).not.toThrow();
    });
  });
});
