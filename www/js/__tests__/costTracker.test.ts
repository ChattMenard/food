// @ts-check
import { CostTracker } from '../logic/costTracker';

describe('CostTracker', () => {
  let costTracker: CostTracker;

  beforeEach(() => {
    costTracker = new CostTracker();
  });

  describe('constructor', () => {
    it('should initialize with empty cost database', () => {
      expect(costTracker.costDatabaseData.size).toBe(0);
    });

    it('should initialize with zero budget', () => {
      expect(costTracker.budgetData).toBe(0);
    });

    it('should initialize with zero spent this month', () => {
      expect(costTracker.spentThisMonthData).toBe(0);
    });
  });

  describe('setBudget', () => {
    it('should set monthly budget', () => {
      costTracker.setBudget(500);
      expect(costTracker.budgetData).toBe(500);
    });
  });

  describe('addCost', () => {
    it('should add cost to database', () => {
      costTracker.addCost('tomatoes', 2.5, 'lb');
      expect(costTracker.getCost('tomatoes')).toBe(2.5);
    });

    it('should handle lowercase ingredient names', () => {
      costTracker.addCost('Tomatoes', 2.5, 'lb');
      expect(costTracker.getCost('tomatoes')).toBe(2.5);
    });

    it('should update existing cost', () => {
      costTracker.addCost('eggs', 3.0, 'dozen');
      costTracker.addCost('eggs', 4.0, 'dozen');
      expect(costTracker.getCost('eggs')).toBe(4.0);
    });
  });

  describe('getCost', () => {
    it('should return cost for existing ingredient', () => {
      costTracker.addCost('milk', 3.5, 'gallon');
      expect(costTracker.getCost('milk')).toBe(3.5);
    });

    it('should return null for non-existent ingredient', () => {
      expect(costTracker.getCost('nonexistent')).toBe(null);
    });
  });

  describe('removeCost', () => {
    it('should remove cost from database', () => {
      costTracker.addCost('bread', 2.0, 'loaf');
      costTracker.removeCost('bread');
      expect(costTracker.getCost('bread')).toBe(null);
    });

    it('should handle non-existent ingredient', () => {
      expect(() => costTracker.removeCost('nonexistent')).not.toThrow();
    });
  });

  describe('calculateRecipeCost', () => {
    beforeEach(() => {
      costTracker.addCost('flour', 0.5, 'cup');
      costTracker.addCost('sugar', 0.3, 'cup');
      costTracker.addCost('eggs', 0.25, 'each');
    });

    it('should calculate total recipe cost', () => {
      const recipe = {
        name: 'Simple Cake',
        ingredients: [
          { name: 'flour', quantity: 2, unit: 'cup' },
          { name: 'sugar', quantity: 1, unit: 'cup' },
          { name: 'eggs', quantity: 2, unit: 'each' }
        ],
        servings: 8
      };

      const cost = costTracker.calculateRecipeCost(recipe);

      expect(cost.total).toBe(2.3); // (2 * 0.5) + (1 * 0.3) + (2 * 0.25)
      expect(cost.perServing).toBe(0.2875); // 2.3 / 8
      expect(cost.ingredients.length).toBe(3);
    });

    it('should handle missing ingredient costs', () => {
      const recipe = {
        name: 'Unknown Recipe',
        ingredients: [
          { name: 'unknown', quantity: 1, unit: 'unit' }
        ],
        servings: 4
      };

      const cost = costTracker.calculateRecipeCost(recipe);

      expect(cost.total).toBe(0);
      expect(cost.perServing).toBe(0);
    });

    it('should handle zero servings', () => {
      const recipe = {
        name: 'Zero Servings',
        ingredients: [
          { name: 'flour', quantity: 1, unit: 'cup' }
        ],
        servings: 0
      };

      const cost = costTracker.calculateRecipeCost(recipe);

      expect(cost.perServing).toBe(0);
    });
  });

  describe('trackSpending', () => {
    it('should track spending for current month', () => {
      costTracker.trackSpending(50.0);
      expect(costTracker.spentThisMonthData).toBe(50.0);
    });

    it('should accumulate spending', () => {
      costTracker.trackSpending(25.0);
      costTracker.trackSpending(30.0);
      expect(costTracker.spentThisMonthData).toBe(55.0);
    });

    it('should handle negative spending (refunds)', () => {
      costTracker.trackSpending(100.0);
      costTracker.trackSpending(-20.0);
      expect(costTracker.spentThisMonthData).toBe(80.0);
    });
  });

  describe('getBudgetStatus', () => {
    beforeEach(() => {
      costTracker.setBudget(500);
      costTracker.trackSpending(200);
    });

    it('should return budget status', () => {
      const status = costTracker.getBudgetStatus();

      expect(status.budget).toBe(500);
      expect(status.spent).toBe(200);
      expect(status.remaining).toBe(300);
      expect(status.percentageUsed).toBe(40);
    });

    it('should handle zero budget', () => {
      costTracker.setBudget(0);
      const status = costTracker.getBudgetStatus();

      expect(status.percentageUsed).toBe(0);
    });

    it('should handle over budget', () => {
      costTracker.trackSpending(600);
      const status = costTracker.getBudgetStatus();

      expect(status.remaining).toBe(-100);
      expect(status.percentageUsed).toBe(120);
    });
  });

  describe('getSpendingByCategory', () => {
    beforeEach(() => {
      costTracker.addCost('milk', 3.5, 'gallon');
      costTracker.addCost('cheese', 8.0, 'lb');
      costTracker.addCost('chicken', 12.0, 'lb');
      costTracker.addCost('beef', 15.0, 'lb');
    });

    it('should categorize spending correctly', () => {
      const spending = costTracker.getSpendingByCategory();

      expect(spending.dairy).toBe(11.5); // milk + cheese
      expect(spending.meat).toBe(27.0); // chicken + beef
      expect(spending.produce).toBe(0);
      expect(spending.pantry).toBe(0);
    });

    it('should handle unknown categories', () => {
      costTracker.addCost('unknown_item', 5.0, 'unit');
      const spending = costTracker.getSpendingByCategory();

      expect(spending.other).toBe(5.0);
    });
  });

  describe('getCostSuggestions', () => {
    beforeEach(() => {
      costTracker.addCost('beef', 15.0, 'lb');
      costTracker.addCost('chicken', 8.0, 'lb');
      costTracker.addCost('beans', 2.0, 'lb');
    });

    it('should suggest cheaper alternatives', () => {
      const suggestions = costTracker.getCostSuggestions('beef');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s: any) => s.alternative === 'chicken')).toBe(true);
      expect(suggestions.some((s: any) => s.alternative === 'beans')).toBe(true);
    });

    it('should return empty for unknown ingredient', () => {
      const suggestions = costTracker.getCostSuggestions('unknown');

      expect(suggestions).toEqual([]);
    });

    it('should calculate savings correctly', () => {
      const suggestions = costTracker.getCostSuggestions('beef');

      const chickenSuggestion = suggestions.find((s: any) => s.alternative === 'chicken');
      expect(chickenSuggestion?.savings).toBe(7.0); // 15 - 8
    });
  });

  describe('resetMonthlySpending', () => {
    it('should reset spending to zero', () => {
      costTracker.trackSpending(100.0);
      costTracker.resetMonthlySpending();
      expect(costTracker.spentThisMonthData).toBe(0);
    });
  });

  describe('exportData', () => {
    beforeEach(() => {
      costTracker.setBudget(500);
      costTracker.addCost('milk', 3.5, 'gallon');
      costTracker.trackSpending(100.0);
    });

    it('should export all data', () => {
      const data = costTracker.exportData();

      expect(data.budget).toBe(500);
      expect(data.spentThisMonth).toBe(100);
      expect(data.costDatabase).toBeDefined();
      expect(data.costDatabase.has('milk')).toBe(true);
    });
  });

  describe('importData', () => {
    it('should import data successfully', () => {
      const importData = {
        budget: 300,
        spentThisMonth: 50,
        costDatabase: new Map([['bread', 2.0]])
      };

      costTracker.importData(importData);

      expect(costTracker.budgetData).toBe(300);
      expect(costTracker.spentThisMonthData).toBe(50);
      expect(costTracker.getCost('bread')).toBe(2.0);
    });

    it('should handle invalid data gracefully', () => {
      const invalidData = {
        budget: 'invalid',
        spentThisMonth: 'invalid',
        costDatabase: null
      };

      expect(() => costTracker.importData(invalidData)).not.toThrow();
    });
  });
});
