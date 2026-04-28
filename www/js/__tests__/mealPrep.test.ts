// @ts-check
import { MealPrep } from '../features/mealPrep';

describe('MealPrep', () => {
  let mealPrep;
  let mockGetMealPlan;
  let mockGetRecipes;
  let mockGetPreferences;
  let mockAnnounce;

  beforeEach(() => {
    mockGetMealPlan = jest.fn();
    mockGetRecipes = jest.fn();
    mockGetPreferences = jest.fn();
    mockAnnounce = jest.fn();

    mealPrep = new MealPrep({
      getMealPlan: mockGetMealPlan,
      getRecipes: mockGetRecipes,
      getPreferences: mockGetPreferences,
      announce: mockAnnounce,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect(mealPrep.getMealPlan).toBe(mockGetMealPlan);
      expect(mealPrep.getRecipes).toBe(mockGetRecipes);
      expect(mealPrep.getPreferences).toBe(mockGetPreferences);
      expect(mealPrep.announce).toBe(mockAnnounce);
    });
  });

  describe('getBatchCookingSuggestions', () => {
    it('returns recipes with high servings and reasonable time', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe A', servings: 6, time: 60 },
        { name: 'Recipe B', servings: 4, time: 90 },
        { name: 'Recipe C', servings: 2, time: 30 },
        { name: 'Recipe D', servings: 8, time: 150 },
        { name: 'Recipe E', servings: 4, time: 45 },
      ]);

      const suggestions = mealPrep.getBatchCookingSuggestions();
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].servings).toBe(6);
    });

    it('filters out recipes with low servings', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe A', servings: 2, time: 30 },
        { name: 'Recipe B', servings: 3, time: 45 },
      ]);

      const suggestions = mealPrep.getBatchCookingSuggestions();
      expect(suggestions).toHaveLength(0);
    });

    it('filters out recipes with high time', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe A', servings: 6, time: 150 },
        { name: 'Recipe B', servings: 8, time: 200 },
      ]);

      const suggestions = mealPrep.getBatchCookingSuggestions();
      expect(suggestions).toHaveLength(0);
    });

    it('returns empty array when no recipes', () => {
      mockGetRecipes.mockReturnValue([]);
      const suggestions = mealPrep.getBatchCookingSuggestions();
      expect(suggestions).toEqual([]);
    });

    it('limits to 5 suggestions', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe A', servings: 4, time: 60 },
        { name: 'Recipe B', servings: 5, time: 60 },
        { name: 'Recipe C', servings: 6, time: 60 },
        { name: 'Recipe D', servings: 7, time: 60 },
        { name: 'Recipe E', servings: 8, time: 60 },
        { name: 'Recipe F', servings: 9, time: 60 },
      ]);

      const suggestions = mealPrep.getBatchCookingSuggestions();
      expect(suggestions).toHaveLength(5);
    });

    it('sorts by servings descending', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Recipe A', servings: 4, time: 60 },
        { name: 'Recipe B', servings: 8, time: 60 },
        { name: 'Recipe C', servings: 6, time: 60 },
      ]);

      const suggestions = mealPrep.getBatchCookingSuggestions();
      expect(suggestions[0].servings).toBe(8);
      expect(suggestions[1].servings).toBe(6);
      expect(suggestions[2].servings).toBe(4);
    });
  });

  describe('calculatePrepSchedule', () => {
    it('finds recipes that appear multiple times', () => {
      mockGetMealPlan.mockReturnValue({
        Monday: 'Pasta',
        Tuesday: 'Pasta',
        Wednesday: 'Salad',
        Thursday: 'Pasta',
        Friday: 'Salad',
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', servings: 4 },
        { name: 'Salad', servings: 2 },
      ]);

      const schedule = mealPrep.calculatePrepSchedule();
      expect(schedule).toHaveLength(2);
      expect(schedule[0].recipe.name).toBe('Pasta');
      expect(schedule[0].count).toBe(3);
    });

    it('calculates savings based on servings', () => {
      mockGetMealPlan.mockReturnValue({
        Monday: 'Pasta',
        Tuesday: 'Pasta',
      });

      mockGetRecipes.mockReturnValue([{ name: 'Pasta', servings: 4 }]);

      const schedule = mealPrep.calculatePrepSchedule();
      expect(schedule[0].savings).toBe(8);
    });

    it('returns empty array when no duplicate recipes', () => {
      mockGetMealPlan.mockReturnValue({
        Monday: 'Pasta',
        Tuesday: 'Salad',
        Wednesday: 'Soup',
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', servings: 4 },
        { name: 'Salad', servings: 2 },
        { name: 'Soup', servings: 3 },
      ]);

      const schedule = mealPrep.calculatePrepSchedule();
      expect(schedule).toHaveLength(0);
    });

    it('handles null preferences', () => {
      mockGetPreferences.mockReturnValue(null);
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([]);

      const schedule = mealPrep.calculatePrepSchedule();
      expect(schedule).toHaveLength(0);
    });

    it('handles missing preferences', () => {
      mockGetPreferences.mockReturnValue(undefined);
      mockGetMealPlan.mockReturnValue({});
      mockGetRecipes.mockReturnValue([]);

      const schedule = mealPrep.calculatePrepSchedule();
      expect(schedule).toHaveLength(0);
    });

    it('sorts by savings descending', () => {
      mockGetMealPlan.mockReturnValue({
        Monday: 'Pasta',
        Tuesday: 'Pasta',
        Wednesday: 'Salad',
        Thursday: 'Salad',
        Friday: 'Salad',
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', servings: 4 },
        { name: 'Salad', servings: 2 },
      ]);

      const schedule = mealPrep.calculatePrepSchedule();
      expect(schedule[0].recipe.name).toBe('Pasta');
      expect(schedule[1].recipe.name).toBe('Salad');
    });
  });

  describe('suggestPrepDay', () => {
    it('suggests Sunday by default', () => {
      mockGetMealPlan.mockReturnValue({});
      const day = mealPrep.suggestPrepDay();
      expect(day).toBe('Sunday');
    });

    it('prefers Saturday if it has more meals', () => {
      mockGetMealPlan.mockReturnValue({
        Saturday: 'Pasta',
        Sunday: null,
      });

      const day = mealPrep.suggestPrepDay();
      expect(day).toBe('Saturday');
    });

    it('prefers Sunday if it has more meals', () => {
      mockGetMealPlan.mockReturnValue({
        Saturday: null,
        Sunday: 'Pasta',
      });

      const day = mealPrep.suggestPrepDay();
      expect(day).toBe('Sunday');
    });

    it('returns Sunday if both have equal meals', () => {
      mockGetMealPlan.mockReturnValue({
        Saturday: 'Pasta',
        Sunday: 'Salad',
      });

      const day = mealPrep.suggestPrepDay();
      expect(day).toBe('Sunday');
    });
  });
});
