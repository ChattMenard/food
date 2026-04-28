// @ts-check
/**
 * Budget Meal Planner Tests
 * Tests for multi-tier budget meal planning
 */

import {
  BudgetMealPlanner,
  BUDGET_SUBSTITUTIONS,
} from '../features/plan/budgetMealPlanner.js;

describe('BudgetMealPlanner', () => {
  let planner;

  beforeEach(() => {
    planner = new BudgetMealPlanner();
  });

  describe('initialization', () => {
    it('should default to medium tier', () => {
      expect(planner.currentTier).toBe('medium');
    });

    it('should get current tier details', () => {
      const tier = planner.getCurrentTier();
      expect(tier.id).toBe('medium');
      expect(tier.maxPerServing).toBe(6.0);
    });
  });

  describe('tier management', () => {
    it('should list all tiers', () => {
      const tiers = planner.getAllTiers();
      expect(tiers.length).toBe(3);
      expect(tiers.some((t) => t.id === 'low')).toBe(true);
      expect(tiers.some((t) => t.id === 'medium')).toBe(true);
      expect(tiers.some((t) => t.id === 'high')).toBe(true);
    });

    it('should set tier correctly', async () => {
      await planner.setTier('low');
      expect(planner.currentTier).toBe('low');
      expect(planner.getCurrentTier().maxPerServing).toBe(3.0);
    });

    it('should throw for unknown tier', async () => {
      await expect(planner.setTier('unknown')).rejects.toThrow(
        'Unknown budget tier'
      );
    });
  });

  describe('recipe cost estimation', () => {
    it('should estimate recipe cost', () => {
      const recipe = {
        name: 'Simple Pasta',
        servings: 4,
        ingredients: [
          { name: 'pasta', quantity: 1 },
          { name: 'tomatoes', quantity: 2 },
          { name: 'garlic', quantity: 1 },
        ],
      };

      const cost = planner.estimateRecipeCost(recipe);

      expect(cost.perServing).toBeGreaterThan(0);
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.servings).toBe(4);
      expect(cost.breakdown.length).toBe(3);
    });

    it('should handle missing ingredients', () => {
      const cost = planner.estimateRecipeCost({});
      expect(cost.perServing).toBe(0);
      expect(cost.total).toBe(0);
    });

    it('should guess ingredient categories', () => {
      expect(planner.guessCategory('chicken breast')).toBe('meat');
      expect(planner.guessCategory('milk')).toBe('dairy');
      expect(planner.guessCategory('rice')).toBe('grains');
      expect(planner.guessCategory('apple')).toBe('fruits');
      expect(planner.guessCategory('carrot')).toBe('vegetables');
    });
  });

  describe('budget filtering', () => {
    const mockRecipes = [
      {
        id: 1,
        name: 'Rice & Beans',
        servings: 4,
        ingredients: [
          { name: 'rice', quantity: 1 },
          { name: 'beans', quantity: 1 },
        ],
      },
      {
        id: 2,
        name: 'Steak Dinner',
        servings: 2,
        ingredients: [
          { name: 'beef steak', quantity: 2 },
          { name: 'potatoes', quantity: 2 },
        ],
      },
      {
        id: 3,
        name: 'Salmon',
        servings: 2,
        ingredients: [
          { name: 'salmon fillet', quantity: 2 },
          { name: 'asparagus', quantity: 1 },
        ],
      },
    ];

    it('should filter recipes by low budget', () => {
      planner.currentTier = 'low';
      const filtered = planner.filterByBudget(mockRecipes);

      // Rice & beans should fit, expensive proteins should not
      expect(filtered.some((r) => r.name === 'Rice & Beans')).toBe(true);
    });

    it('should mark budget compatibility', () => {
      planner.currentTier = 'low';
      const filtered = planner.filterByBudget(mockRecipes);

      const riceAndBeans = filtered.find((r) => r.name === 'Rice & Beans');
      expect(riceAndBeans.withinBudget).toBe(true);
    });
  });

  describe('substitutions', () => {
    it('should return substitutions for expensive ingredients', () => {
      const subs = planner.getSubstitutions('beef');
      expect(subs.length).toBeGreaterThan(0);
      expect(subs).toContain('chicken');
      expect(subs).toContain('beans');
    });

    it('should handle partial matches', () => {
      const subs = planner.getSubstitutions('ground beef');
      expect(subs.length).toBeGreaterThan(0);
    });

    it('should return empty for unknown ingredients', () => {
      const subs = planner.getSubstitutions('xyzabc');
      expect(subs).toEqual([]);
    });

    it('should have substitution dictionary', () => {
      expect(BUDGET_SUBSTITUTIONS.beef).toBeDefined();
      expect(BUDGET_SUBSTITUTIONS.salmon).toBeDefined();
      expect(BUDGET_SUBSTITUTIONS.cheese).toBeDefined();
    });
  });

  describe('savings calculation', () => {
    it('should calculate potential savings', () => {
      const recipe = {
        name: 'Beef Stir Fry',
        servings: 4,
        ingredients: [
          { name: 'beef', quantity: 1 },
          { name: 'rice', quantity: 1 },
        ],
      };

      const cost = planner.estimateRecipeCost(recipe);
      const savings = planner.calculatePotentialSavings(recipe, cost);

      // Should suggest chicken or beans as cheaper alternative to beef
      expect(savings.substitutions.length).toBeGreaterThan(0);
      expect(savings.totalPotentialSavings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('weekly plan generation', () => {
    const affordableRecipes = [
      {
        id: 1,
        name: 'Rice & Beans',
        servings: 4,
        ingredients: [
          { name: 'rice', quantity: 1 },
          { name: 'beans', quantity: 1 },
        ],
      },
      {
        id: 2,
        name: 'Egg Fried Rice',
        servings: 4,
        ingredients: [
          { name: 'rice', quantity: 1 },
          { name: 'eggs', quantity: 4 },
        ],
      },
      {
        id: 3,
        name: 'Pasta Aglio',
        servings: 4,
        ingredients: [
          { name: 'pasta', quantity: 1 },
          { name: 'garlic', quantity: 1 },
        ],
      },
      {
        id: 4,
        name: 'Vegetable Soup',
        servings: 6,
        ingredients: [
          { name: 'carrots', quantity: 3 },
          { name: 'potatoes', quantity: 2 },
        ],
      },
      {
        id: 5,
        name: 'Lentil Curry',
        servings: 4,
        ingredients: [
          { name: 'lentils', quantity: 1 },
          { name: 'onions', quantity: 2 },
        ],
      },
    ];

    it('should generate weekly plan', () => {
      planner.currentTier = 'low';
      const plan = planner.generateWeeklyPlan(affordableRecipes, 7);

      expect(plan.mealCount).toBeGreaterThan(0);
      expect(plan.totalEstimatedCost).toBeGreaterThan(0);
      expect(plan.tier.id).toBe('low');
    });

    it('should track budget remaining', () => {
      planner.currentTier = 'low';
      const plan = planner.generateWeeklyPlan(affordableRecipes, 7);

      expect(plan.budgetRemaining).toBeDefined();
      expect(typeof plan.withinBudget).toBe('boolean');
    });

    it('should handle no affordable recipes', () => {
      planner.currentTier = 'low';
      // Recipe with expensive meat that definitely exceeds $3/serving
      const expensiveRecipes = [
        {
          id: 1,
          name: 'Steak Dinner',
          servings: 2,
          ingredients: [
            { name: 'beef steak', quantity: 2, category: 'meat' }, // $8 × 2 = $16 / 2 = $8/serving
            { name: 'asparagus', quantity: 1, category: 'vegetables' },
          ],
        },
      ];

      const plan = planner.generateWeeklyPlan(expensiveRecipes, 7);
      expect(plan.error).toBeDefined();
      expect(plan.suggestions).toBeDefined();
      expect(plan.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('tier comparison', () => {
    it('should compare recipe across tiers', () => {
      const recipe = {
        name: 'Chicken Dinner',
        servings: 4,
        ingredients: [
          { name: 'chicken thighs', quantity: 4 },
          { name: 'rice', quantity: 1 },
        ],
      };

      const comparison = planner.compareTiers(recipe);

      expect(comparison.comparisons.length).toBe(3);
      expect(comparison.recommendedTier).toBeDefined();
      expect(comparison.recipeCost.perServing).toBeGreaterThan(0);
    });

    it('should indicate which tiers recipe fits', () => {
      const cheapRecipe = {
        name: 'Rice & Beans',
        servings: 4,
        ingredients: [
          { name: 'rice', quantity: 1 },
          { name: 'beans', quantity: 1 },
        ],
      };

      const comparison = planner.compareTiers(cheapRecipe);

      // Cheap recipe should fit all tiers
      const fitsAll = comparison.comparisons.every((c) => c.fits);
      expect(fitsAll).toBe(true);
    });
  });

  describe('pub-sub', () => {
    it('should notify on tier change', async () => {
      const callback = jest.fn();
      planner.subscribe(callback);

      await planner.setTier('high');

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].id).toBe('high');
    });

    it('should allow unsubscribing', async () => {
      const callback = jest.fn();
      const unsubscribe = planner.subscribe(callback);

      unsubscribe();
      await planner.setTier('low');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('budget suggestions', () => {
    it('should provide budget suggestions when no recipes fit', () => {
      const expensiveRecipe = {
        id: 1,
        name: 'Steak Dinner',
        servings: 2,
        ingredients: [{ name: 'beef steak', quantity: 2 }],
      };

      const suggestions = planner.getBudgetSuggestions([expensiveRecipe]);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.type === 'substitutions')).toBe(true);
      expect(suggestions.some((s) => s.type === 'budget-bases')).toBe(true);
    });
  });
});
