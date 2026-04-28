// @ts-check
/**
 * Meal Prep Planner Tests
 * Tests for batch cooking, portion planning, and prep schedules
 */

import {
  MealPrepPlanner,
  PREP_STRATEGIES,
  STORAGE_GUIDELINES,
} from '../features/plan/mealPrepPlanner.js';

describe('MealPrepPlanner', () => {
  let planner;

  beforeEach(() => {
    planner = new MealPrepPlanner();
  });

  describe('initialization', () => {
    it('should default to component strategy', () => {
      expect(planner.currentStrategy).toBe('component');
    });

    it('should default to Sunday prep day', () => {
      expect(planner.prepDay).toBe(0);
    });

    it('should get current settings', () => {
      const settings = planner.getSettings();
      expect(settings.strategy).toBe('component');
      expect(settings.prepDay).toBe(0);
      expect(settings.strategyDetails).toBeDefined();
    });
  });

  describe('strategy management', () => {
    it('should list all strategies', () => {
      const strategies = planner.getStrategies();
      expect(strategies.length).toBe(3);
      expect(strategies.some((s) => s.id === 'component')).toBe(true);
      expect(strategies.some((s) => s.id === 'batch-meals')).toBe(true);
      expect(strategies.some((s) => s.id === 'hybrid')).toBe(true);
    });

    it('should set strategy correctly', async () => {
      await planner.setStrategy('batch-meals');
      expect(planner.currentStrategy).toBe('batch-meals');
      expect(planner.getSettings().strategyDetails.name).toBe('Batch Meals');
    });

    it('should throw for unknown strategy', async () => {
      await expect(planner.setStrategy('unknown')).rejects.toThrow(
        'Unknown strategy'
      );
    });
  });

  describe('prep day management', () => {
    it('should set prep day', async () => {
      await planner.setPrepDay(5); // Friday
      expect(planner.prepDay).toBe(5);
    });

    it('should reject invalid prep day', async () => {
      await expect(planner.setPrepDay(7)).rejects.toThrow(
        'Prep day must be 0-6'
      );
      await expect(planner.setPrepDay(-1)).rejects.toThrow(
        'Prep day must be 0-6'
      );
    });
  });

  describe('meal classification', () => {
    it('should classify soups and stews', () => {
      const soup = { name: 'Chicken Soup' };
      expect(planner.classifyMeal(soup)).toBe('soups-stews');
    });

    it('should classify salads', () => {
      const salad = { name: 'Greek Salad' };
      expect(planner.classifyMeal(salad)).toBe('salads-undressed');
    });

    it('should classify based on ingredients', () => {
      const riceDish = {
        name: 'Stir Fry',
        ingredients: ['rice', 'chicken', 'vegetables'],
      };
      expect(planner.classifyMeal(riceDish)).toBe('cooked-grains');
    });

    it('should default to assembled-meals', () => {
      const unknown = { name: 'Mystery Dish' };
      expect(planner.classifyMeal(unknown)).toBe('assembled-meals');
    });
  });

  describe('storage guidelines', () => {
    it('should have refrigerator guidelines', () => {
      expect(STORAGE_GUIDELINES.refrigerator['cooked-grains']).toBe(5);
      expect(STORAGE_GUIDELINES.refrigerator['cooked-proteins']).toBe(3);
      expect(STORAGE_GUIDELINES.refrigerator['soups-stews']).toBe(4);
    });

    it('should have freezer guidelines', () => {
      expect(STORAGE_GUIDELINES.freezer['cooked-grains']).toBe(90);
      expect(STORAGE_GUIDELINES.freezer['assembled-meals']).toBe(60);
    });

    it('should calculate use-by date', () => {
      const recipe = { name: 'Chicken Rice' };
      const prepDate = new Date('2024-01-15');

      const useByDate = planner.calculateUseByDate(recipe, prepDate);
      expect(useByDate).toBe('2024-01-20'); // 5 days for rice-based meals
    });
  });

  describe('prep plan generation', () => {
    const mockRecipes = [
      {
        id: 1,
        name: 'Rice & Beans',
        servings: 4,
        prepTime: 10,
        cookTime: 25,
        ingredients: [
          { name: 'rice', quantity: 1 },
          { name: 'beans', quantity: 1 },
        ],
      },
      {
        id: 2,
        name: 'Roasted Chicken',
        servings: 4,
        prepTime: 15,
        cookTime: 45,
        ingredients: [
          { name: 'chicken', quantity: 4 },
          { name: 'herbs', quantity: 1 },
        ],
      },
    ];

    it('should generate prep plan', () => {
      const plan = planner.generatePrepPlan(mockRecipes, 4);

      expect(plan.strategy).toBe('component');
      expect(plan.recipes.length).toBe(2);
      expect(plan.schedule).toBeDefined();
      expect(plan.storage).toBeDefined();
      expect(plan.shoppingList).toBeDefined();
    });

    it('should scale recipes correctly', () => {
      const plan = planner.generatePrepPlan(mockRecipes, 6);

      expect(plan.recipes[0].scaledServings).toBe(6);
      expect(plan.recipes[0].scalingFactor).toBe(1.5); // 6/4
    });

    it('should calculate total prep time', () => {
      const plan = planner.generatePrepPlan(mockRecipes, 4);

      expect(plan.totalPrepTime).toBeGreaterThan(0);
      expect(typeof plan.totalPrepTime).toBe('number');
    });

    it('should include equipment needed', () => {
      const plan = planner.generatePrepPlan(mockRecipes, 4);

      expect(plan.equipmentNeeded).toContain('Meal prep containers');
      expect(plan.equipmentNeeded).toContain('Storage bags/labels');
    });

    it('should generate prep schedule', () => {
      const plan = planner.generatePrepPlan(mockRecipes, 4);

      expect(plan.schedule.length).toBeGreaterThan(0);
      expect(plan.schedule[0].time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should generate storage plan', () => {
      const plan = planner.generatePrepPlan(mockRecipes, 4);

      expect(plan.storage.refrigerator.containers).toBe(8); // 2 recipes × 4 servings
      expect(plan.storage.equipment.mealPrepContainers).toBe(8);
    });

    it('should generate scaled shopping list', () => {
      const plan = planner.generatePrepPlan(mockRecipes, 4);

      expect(plan.shoppingList.length).toBeGreaterThan(0);

      // Check rice quantity scaled
      const rice = plan.shoppingList.find((i) => i.name === 'rice');
      expect(rice).toBeDefined();
      expect(rice.quantity).toBe(1);
    });
  });

  describe('reheating instructions', () => {
    it('should provide microwave as default', () => {
      const recipe = { name: 'Soup' };
      const instructions = planner.getReheatingInstructions(recipe);

      expect(instructions.recommendedMethod).toBe('microwave');
      expect(instructions.temp).toBeDefined();
      expect(instructions.safetyNote).toBeDefined();
    });

    it('should recommend oven for crispy items', () => {
      const recipe = { name: 'Crispy Chicken' };
      const instructions = planner.getReheatingInstructions(recipe);

      expect(instructions.recommendedMethod).toBe('oven');
    });

    it('should provide alternative methods', () => {
      const recipe = { name: 'Pasta' };
      const instructions = planner.getReheatingInstructions(recipe);

      expect(instructions.alternatives).toContain('microwave');
      expect(instructions.alternatives).toContain('oven');
    });
  });

  describe('prep strategies', () => {
    it('should have component strategy', () => {
      const strategy = PREP_STRATEGIES.component;
      expect(strategy.name).toBe('Component Prep');
      expect(strategy.steps.length).toBeGreaterThan(0);
    });

    it('should have batch-meals strategy', () => {
      const strategy = PREP_STRATEGIES['batch-meals'];
      expect(strategy.name).toBe('Batch Meals');
      expect(strategy.bestFor).toBeDefined();
    });

    it('should have hybrid strategy', () => {
      const strategy = PREP_STRATEGIES.hybrid;
      expect(strategy.name).toBe('Hybrid');
      expect(strategy.description).toBeDefined();
    });
  });

  describe('tips generation', () => {
    it('should generate tips based on strategy', () => {
      const recipe = { name: 'Test' };
      const tips = planner.generateTips([recipe], PREP_STRATEGIES.component);

      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some((t) => t.includes('cool'))).toBe(true);
    });

    it('should add efficiency tips for multiple recipes', () => {
      const recipes = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
      const tips = planner.generateTips(recipes, PREP_STRATEGIES.component);

      expect(tips.some((t) => t.includes('Clean as you go'))).toBe(true);
    });
  });

  describe('pub-sub', () => {
    it('should notify on settings change', async () => {
      const callback = jest.fn();
      planner.subscribe(callback);

      await planner.setStrategy('hybrid');

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].strategy).toBe('hybrid');
    });

    it('should allow unsubscribing', async () => {
      const callback = jest.fn();
      const unsubscribe = planner.subscribe(callback);

      unsubscribe();
      await planner.setPrepDay(3);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('time formatting', () => {
    it('should format time correctly', () => {
      expect(planner.formatTime(0)).toBe('00:00');
      expect(planner.formatTime(65)).toBe('01:05');
      expect(planner.formatTime(125)).toBe('02:05');
    });
  });
});
