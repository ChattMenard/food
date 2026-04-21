import { PersonalizedRecommendations } from '../features/meals/personalizedRecommendations.js';

describe('PersonalizedRecommendations', () => {
  let recommendations;
  let mockGetMealPlan;
  let mockGetRecipes;
  let mockGetPreferences;
  let mockGetRecipeRatings;

  beforeEach(() => {
    mockGetMealPlan = jest.fn();
    mockGetRecipes = jest.fn();
    mockGetPreferences = jest.fn();
    mockGetRecipeRatings = jest.fn();

    recommendations = new PersonalizedRecommendations({
      getMealPlan: mockGetMealPlan,
      getRecipes: mockGetRecipes,
      getPreferences: mockGetPreferences,
      getRecipeRatings: mockGetRecipeRatings
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect(recommendations.getMealPlan).toBe(mockGetMealPlan);
      expect(recommendations.getRecipes).toBe(mockGetRecipes);
      expect(recommendations.getPreferences).toBe(mockGetPreferences);
      expect(recommendations.getRecipeRatings).toBe(mockGetRecipeRatings);
    });
  });

  describe('getPersonalizedSuggestions', () => {
    it('returns favorite recipes (highly rated)', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: [] },
        { name: 'Salad', ingredients: [] },
        { name: 'Soup', ingredients: [] }
      ]);
      mockGetRecipeRatings.mockReturnValue({ Pasta: 5, Salad: 3, Soup: 4 });
      mockGetPreferences.mockReturnValue({});

      const suggestions = recommendations.getPersonalizedSuggestions();
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].name).toBe('Pasta');
      expect(suggestions[1].name).toBe('Soup');
    });

    it('returns frequently cooked recipes', () => {
      mockGetMealPlan.mockReturnValue({
        Monday: 'Pasta',
        Tuesday: 'Pasta',
        Wednesday: 'Salad'
      });
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: [] },
        { name: 'Salad', ingredients: [] }
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = recommendations.getPersonalizedSuggestions();
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].name).toBe('Pasta');
    });

    it('deduplicates recipes', () => {
      mockGetMealPlan.mockReturnValue({
        Monday: 'Pasta',
        Tuesday: 'Pasta'
      });
      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: [] }
      ]);
      mockGetRecipeRatings.mockReturnValue({ Pasta: 5 });
      mockGetPreferences.mockReturnValue({});

      const suggestions = recommendations.getPersonalizedSuggestions();
      expect(suggestions).toHaveLength(1);
    });

    it('respects limit parameter', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe A', ingredients: [] },
        { name: 'Recipe B', ingredients: [] },
        { name: 'Recipe C', ingredients: [] },
        { name: 'Recipe D', ingredients: [] },
        { name: 'Recipe E', ingredients: [] },
        { name: 'Recipe F', ingredients: [] }
      ]);
      mockGetRecipeRatings.mockReturnValue({
        'Recipe A': 5,
        'Recipe B': 5,
        'Recipe C': 5,
        'Recipe D': 5,
        'Recipe E': 5,
        'Recipe F': 5
      });
      mockGetPreferences.mockReturnValue({});

      const suggestions = recommendations.getPersonalizedSuggestions(3);
      expect(suggestions).toHaveLength(3);
    });

    it('fills with diet-filtered recipes when not enough personalized', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([
        { name: 'Vegetable Soup', ingredients: ['vegetable', 'broth'] },
        { name: 'Chicken Salad', ingredients: ['chicken', 'lettuce'] }
      ]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({ diets: ['vegetarian'] });

      const suggestions = recommendations.getPersonalizedSuggestions(5);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].name).toBe('Vegetable Soup');
    });

    it('returns empty array when no data', () => {
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([]);
      mockGetRecipeRatings.mockReturnValue({});
      mockGetPreferences.mockReturnValue({});

      const suggestions = recommendations.getPersonalizedSuggestions();
      expect(suggestions).toEqual([]);
    });
  });

  describe('passesDiet', () => {
    it('passes vegetarian diet for vegetable recipe', () => {
      const recipe = { name: 'Vegetable Soup', ingredients: ['carrot', 'broth'] };
      const result = recommendations.passesDiet(recipe, 'vegetarian');
      expect(result).toBe(true);
    });

    it('fails vegetarian diet for meat recipe', () => {
      const recipe = { name: 'Chicken Soup', ingredients: ['chicken', 'broth'] };
      const result = recommendations.passesDiet(recipe, 'vegetarian');
      expect(result).toBe(false);
    });

    it('passes vegan diet for vegan recipe', () => {
      const recipe = { name: 'Vegan Pasta', ingredients: ['pasta', 'tomato'] };
      const result = recommendations.passesDiet(recipe, 'vegan');
      expect(result).toBe(true);
    });

    it('fails vegan diet for dairy recipe', () => {
      const recipe = { name: 'Cheese Pizza', ingredients: ['cheese', 'dough'] };
      const result = recommendations.passesDiet(recipe, 'vegan');
      expect(result).toBe(false);
    });

    it('passes keto diet for keto recipe', () => {
      const recipe = { name: 'Keto Salad', ingredients: ['avocado', 'egg'] };
      const result = recommendations.passesDiet(recipe, 'keto');
      expect(result).toBe(true);
    });

    it('fails keto diet for bread recipe', () => {
      const recipe = { name: 'Bread', ingredients: ['flour', 'yeast'] };
      const result = recommendations.passesDiet(recipe, 'keto');
      expect(result).toBe(false);
    });

    it('passes gluten-free diet for gluten-free recipe', () => {
      const recipe = { name: 'Rice Bowl', ingredients: ['rice', 'vegetables'] };
      const result = recommendations.passesDiet(recipe, 'gluten-free');
      expect(result).toBe(true);
    });

    it('fails gluten-free diet for wheat recipe', () => {
      const recipe = { name: 'Wheat Bread', ingredients: ['wheat', 'flour'] };
      const result = recommendations.passesDiet(recipe, 'gluten-free');
      expect(result).toBe(false);
    });

    it('passes for unknown diet', () => {
      const recipe = { name: 'Any Recipe', ingredients: ['anything'] };
      const result = recommendations.passesDiet(recipe, 'unknown-diet');
      expect(result).toBe(true);
    });

    it('is case-insensitive for diet name', () => {
      const recipe = { name: 'Vegetable Soup', ingredients: ['carrot'] };
      const result = recommendations.passesDiet(recipe, 'VEGETARIAN');
      expect(result).toBe(true);
    });

    it('checks ingredients for diet compliance', () => {
      const recipe = { name: 'Hidden Meat', ingredients: ['vegetables', 'chicken'] };
      const result = recommendations.passesDiet(recipe, 'vegetarian');
      expect(result).toBe(false);
    });
  });
});
