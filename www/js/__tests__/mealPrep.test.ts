// @ts-check
import { MealPrep } from '../features/mealPrep';

describe('MealPrep', () => {
  let mealPrep: MealPrep;
  let mockGetMealPlan: jest.Mock;
  let mockGetRecipes: jest.Mock;
  let mockGetPreferences: jest.Mock;
  let mockAnnounce: jest.Mock;

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
      expect((mealPrep as any).getMealPlan).toBe(mockGetMealPlan);
      expect((mealPrep as any).getRecipes).toBe(mockGetRecipes);
      expect((mealPrep as any).getPreferences).toBe(mockGetPreferences);
      expect((mealPrep as any).announce).toBe(mockAnnounce);
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

      const suggestions = (mealPrep as any).getBatchCookingSuggestions();
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].servings).toBe(6);
      expect(suggestions[1].servings).toBe(4);
      expect(suggestions[2].servings).toBe(4);
    });

    it('filters out recipes that take too long', () => {
      mockGetRecipes.mockReturnValue([
        { name: 'Quick Recipe', servings: 6, time: 60 },
        { name: 'Long Recipe', servings: 8, time: 200 },
        { name: 'Medium Recipe', servings: 4, time: 120 },
      ]);

      const suggestions = (mealPrep as any).getBatchCookingSuggestions();
      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((r: any) => r.name)).not.toContain('Long Recipe');
    });

    it('handles empty recipe list', () => {
      mockGetRecipes.mockReturnValue([]);

      const suggestions = (mealPrep as any).getBatchCookingSuggestions();
      expect(suggestions).toEqual([]);
    });
  });

  describe('getPrepSchedule', () => {
    it('creates prep schedule for meal plan', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: 4 },
          { day: 'Tuesday', recipe: 'Salad', servings: 2 },
          { day: 'Wednesday', recipe: 'Soup', servings: 6 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', prepTime: 30, cookTime: 20, ingredients: ['pasta', 'sauce'] },
        { name: 'Salad', prepTime: 15, cookTime: 0, ingredients: ['lettuce', 'tomatoes'] },
        { name: 'Soup', prepTime: 45, cookTime: 60, ingredients: ['vegetables', 'broth'] }
      ]);

      const schedule = (mealPrep as any).getPrepSchedule();
      
      expect(schedule).toHaveProperty('prepTasks');
      expect(schedule).toHaveProperty('shoppingList');
      expect(schedule).toHaveProperty('timeline');
      expect(schedule.prepTasks).toHaveLength(3);
    });

    it('groups similar ingredients', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: 4 },
          { day: 'Tuesday', recipe: 'Spaghetti', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: ['pasta', 'tomato sauce', 'garlic'] },
        { name: 'Spaghetti', ingredients: ['pasta', 'tomato sauce', 'onions'] }
      ]);

      const schedule = (mealPrep as any).getPrepSchedule();
      
      const pastaItem = schedule.shoppingList.find((item: any) => item.ingredient === 'pasta');
      expect(pastaItem.quantity).toBe(6); // Combined quantity
    });

    it('optimizes prep order', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Soup', servings: 4 },
          { day: 'Tuesday', recipe: 'Salad', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Soup', prepTime: 45, cookTime: 60, ingredients: ['vegetables'] },
        { name: 'Salad', prepTime: 15, cookTime: 0, ingredients: ['lettuce'] }
      ]);

      const schedule = (mealPrep as any).getPrepSchedule();
      
      // Soup should be prepared first due to longer cook time
      expect(schedule.timeline[0].task).toContain('Soup');
    });
  });

  describe('calculatePrepTime', () => {
    it('calculates total prep time for meal plan', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: 4 },
          { day: 'Tuesday', recipe: 'Salad', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', prepTime: 30, cookTime: 20 },
        { name: 'Salad', prepTime: 15, cookTime: 0 }
      ]);

      const totalTime = (mealPrep as any).calculatePrepTime();
      
      expect(totalTime).toBe(65); // 30 + 20 + 15 + 0
    });

    it('accounts for batch cooking efficiency', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Soup', servings: 4 },
          { day: 'Tuesday', recipe: 'More Soup', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Soup', prepTime: 30, cookTime: 60, batchable: true },
        { name: 'More Soup', prepTime: 30, cookTime: 60, batchable: true }
      ]);

      const totalTime = (mealPrep as any).calculatePrepTime();
      
      // Should be less than sum due to batch cooking
      expect(totalTime).toBeLessThan(180); // 30+60 + 30+60
    });
  });

  describe('getShoppingList', () => {
    it('generates comprehensive shopping list', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: 4 },
          { day: 'Tuesday', recipe: 'Salad', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: ['pasta', 'tomato sauce', 'garlic'] },
        { name: 'Salad', ingredients: ['lettuce', 'tomatoes', 'cucumber'] }
      ]);

      mockGetPreferences.mockReturnValue({});

      const shoppingList = (mealPrep as any).getShoppingList();
      
      expect(shoppingList).toHaveLength(6);
      expect(shoppingList.some((item: any) => item.ingredient === 'pasta')).toBe(true);
      expect(shoppingList.some((item: any) => item.ingredient === 'lettuce')).toBe(true);
    });

    it('excludes pantry staples based on preferences', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: 4 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: ['pasta', 'tomato sauce', 'garlic', 'salt', 'pepper'] }
      ]);

      mockGetPreferences.mockReturnValue({
        pantryStaples: ['salt', 'pepper', 'garlic']
      });

      const shoppingList = (mealPrep as any).getShoppingList();
      
      expect(shoppingList.some((item: any) => item.ingredient === 'salt')).toBe(false);
      expect(shoppingList.some((item: any) => item.ingredient === 'pepper')).toBe(false);
      expect(shoppingList.some((item: any) => item.ingredient === 'garlic')).toBe(false);
      expect(shoppingList.some((item: any) => item.ingredient === 'pasta')).toBe(true);
    });

    it('calculates quantities based on servings', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: 4 },
          { day: 'Tuesday', recipe: 'Pasta', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: ['pasta (1lb per 4 servings)'] }
      ]);

      const shoppingList = (mealPrep as any).getShoppingList();
      
      const pastaItem = shoppingList.find((item: any) => item.ingredient === 'pasta');
      expect(pastaItem.quantity).toBe('1.5lb');
    });
  });

  describe('getPrepInstructions', () => {
    it('generates step-by-step prep instructions', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: 4 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { 
          name: 'Pasta', 
          prepSteps: ['Chop vegetables', 'Cook pasta', 'Make sauce'],
          cookSteps: ['Combine pasta and sauce', 'Serve']
        }
      ]);

      const instructions = (mealPrep as any).getPrepInstructions();
      
      expect(instructions).toHaveProperty('prepSteps');
      expect(instructions).toHaveProperty('cookSteps');
      expect(instructions.prepSteps).toHaveLength(3);
      expect(instructions.cookSteps).toHaveLength(2);
    });

    it('organizes instructions by day', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: 4 },
          { day: 'Tuesday', recipe: 'Salad', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', prepSteps: ['Boil water', 'Cook pasta'] },
        { name: 'Salad', prepSteps: ['Wash lettuce', 'Chop vegetables'] }
      ]);

      const instructions = (mealPrep as any).getPrepInstructions();
      
      expect(instructions.byDay).toBeDefined();
      expect(instructions.byDay.Monday).toBeDefined();
      expect(instructions.byDay.Tuesday).toBeDefined();
    });
  });

  describe('getStoragePlan', () => {
    it('suggests storage containers and methods', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Soup', servings: 6 },
          { day: 'Tuesday', recipe: 'Salad', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Soup', storage: 'refrigerator', shelfLife: 5 },
        { name: 'Salad', storage: 'refrigerator', shelfLife: 3 }
      ]);

      const storagePlan = (mealPrep as any).getStoragePlan();
      
      expect(storagePlan).toHaveProperty('containers');
      expect(storagePlan).toHaveProperty('timeline');
      expect(storagePlan.containers).toContainEqual(
        expect.objectContaining({ type: 'refrigerator', quantity: expect.any(Number) })
      );
    });

    it('identifies freezer-friendly meals', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Soup', servings: 6 },
          { day: 'Tuesday', recipe: 'Salad', servings: 2 }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Soup', freezerFriendly: true },
        { name: 'Salad', freezerFriendly: false }
      ]);

      const storagePlan = (mealPrep as any).getStoragePlan();
      
      expect(storagePlan.freezerItems).toContain('Soup');
      expect(storagePlan.freezerItems).not.toContain('Salad');
    });
  });

  describe('optimizeMealPlan', () => {
    it('rearranges meals for better prep efficiency', () => {
      const originalPlan = {
        meals: [
          { day: 'Monday', recipe: 'Quick Salad', servings: 2 },
          { day: 'Tuesday', recipe: 'Complex Soup', servings: 4 },
          { day: 'Wednesday', recipe: 'Medium Pasta', servings: 3 }
        ]
      };

      mockGetRecipes.mockReturnValue([
        { name: 'Quick Salad', prepTime: 15, cookTime: 0 },
        { name: 'Complex Soup', prepTime: 60, cookTime: 120 },
        { name: 'Medium Pasta', prepTime: 30, cookTime: 30 }
      ]);

      const optimized = (mealPrep as any).optimizeMealPlan(originalPlan);
      
      // Complex soup should be moved to beginning of week
      expect(optimized.meals[0].recipe).toBe('Complex Soup');
    });

    it('groups similar recipes together', () => {
      const originalPlan = {
        meals: [
          { day: 'Monday', recipe: 'Tomato Soup', servings: 4 },
          { day: 'Tuesday', recipe: 'Chicken Pasta', servings: 2 },
          { day: 'Wednesday', recipe: 'Vegetable Soup', servings: 3 }
        ]
      };

      mockGetRecipes.mockReturnValue([
        { name: 'Tomato Soup', category: 'soup' },
        { name: 'Chicken Pasta', category: 'pasta' },
        { name: 'Vegetable Soup', category: 'soup' }
      ]);

      const optimized = (mealPrep as any).optimizeMealPlan(originalPlan);
      
      // Soups should be grouped together
      const soupIndices = optimized.meals
        .map((meal: any, index: number) => meal.recipe.includes('Soup') ? index : -1)
        .filter((index: number) => index !== -1);
      
      expect(Math.abs(soupIndices[0] - soupIndices[1])).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty meal plan', () => {
      mockGetMealPlan.mockReturnValue({ meals: [] });

      const schedule = (mealPrep as any).getPrepSchedule();
      expect(schedule.prepTasks).toEqual([]);
      expect(schedule.shoppingList).toEqual([]);
    });

    it('handles missing recipe data', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Unknown Recipe', servings: 4 }
        ]
      });

      mockGetRecipes.mockReturnValue([]);

      const schedule = (mealPrep as any).getPrepSchedule();
      expect(schedule.prepTasks).toHaveLength(0);
    });

    it('handles invalid serving numbers', () => {
      mockGetMealPlan.mockReturnValue({
        meals: [
          { day: 'Monday', recipe: 'Pasta', servings: null as any }
        ]
      });

      mockGetRecipes.mockReturnValue([
        { name: 'Pasta', ingredients: ['pasta'] }
      ]);

      expect(() => (mealPrep as any).getShoppingList()).not.toThrow();
    });
  });
});
