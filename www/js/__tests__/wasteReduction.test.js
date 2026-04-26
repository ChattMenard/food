import {
  WasteReductionManager,
  getWasteReductionManager,
} from '../features/pantry/wasteReduction.js';

describe('WasteReductionManager', () => {
  let manager;

  beforeEach(() => {
    manager = new WasteReductionManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with empty suggestions', () => {
      expect(manager.suggestions).toEqual([]);
    });
  });

  describe('analyzePantry', () => {
    it('identifies items expiring soon', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const pantry = [
        { name: 'milk', expiryDate: tomorrow.toISOString(), quantity: 1 },
        { name: 'bread', expiryDate: null, quantity: 1 },
      ];

      const suggestions = manager.analyzePantry(pantry);
      const expiringSoon = suggestions.filter(
        (s) => s.type === 'expiring-soon'
      );
      expect(expiringSoon.length).toBe(1);
      expect(expiringSoon[0].item).toBe('milk');
      expect(expiringSoon[0].priority).toBe('high');
    });

    it('identifies expired items', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const pantry = [
        { name: 'milk', expiryDate: yesterday.toISOString(), quantity: 1 },
      ];

      const suggestions = manager.analyzePantry(pantry);
      const expired = suggestions.filter((s) => s.type === 'expired');
      expect(expired.length).toBe(1);
      expect(expired[0].item).toBe('milk');
      expect(expired[0].priority).toBe('urgent');
    });

    it('identifies low quantity items', () => {
      const pantry = [
        { name: 'milk', quantity: 1 },
        { name: 'bread', quantity: 5 },
      ];

      const suggestions = manager.analyzePantry(pantry);
      const lowQuantity = suggestions.filter((s) => s.type === 'low-quantity');
      expect(lowQuantity.length).toBe(1);
      expect(lowQuantity[0].item).toBe('milk');
      expect(lowQuantity[0].priority).toBe('medium');
    });

    it('identifies stale items', () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const pantry = [
        {
          name: 'milk',
          purchaseDate: twentyDaysAgo.toISOString(),
          quantity: 2,
        },
      ];

      const suggestions = manager.analyzePantry(pantry);
      const stale = suggestions.filter((s) => s.type === 'stale');
      expect(stale.length).toBe(1);
      expect(stale[0].item).toBe('milk');
      expect(stale[0].priority).toBe('low');
    });

    it('sorts suggestions by priority', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pantry = [
        { name: 'expired', expiryDate: yesterday.toISOString(), quantity: 5 },
        { name: 'expiring', expiryDate: tomorrow.toISOString(), quantity: 5 },
        { name: 'low', quantity: 1 },
        {
          name: 'stale',
          purchaseDate: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000
          ).toISOString(),
          quantity: 5,
        },
      ];

      const suggestions = manager.analyzePantry(pantry);
      expect(suggestions[0].priority).toBe('urgent');
      expect(suggestions[1].priority).toBe('high');
      expect(suggestions[2].priority).toBe('medium');
      expect(suggestions[3].priority).toBe('low');
    });

    it('handles empty pantry', () => {
      const suggestions = manager.analyzePantry([]);
      expect(suggestions).toEqual([]);
    });

    it('stores suggestions in instance', () => {
      const pantry = [{ name: 'milk', quantity: 1 }];

      manager.analyzePantry(pantry);
      expect(manager.suggestions).toEqual(manager.analyzePantry(pantry));
    });
  });

  describe('findRecipesForIngredients', () => {
    it('handles empty recipes array', () => {
      const matches = manager.findRecipesForIngredients(['tomato'], []);
      expect(matches).toEqual([]);
    });
  });

  describe('calculateWasteCost', () => {
    it('calculates cost of expired items', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const pantry = [
        {
          name: 'milk',
          expiryDate: yesterday.toISOString(),
          quantity: 2,
          category: 'dairy',
        },
      ];

      const cost = manager.calculateWasteCost(pantry);
      expect(cost.totalCost).toBeGreaterThan(0);
      expect(cost.itemCount).toBe(1);
    });

    it('uses provided cost estimates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const pantry = [
        { name: 'milk', expiryDate: yesterday.toISOString(), quantity: 1 },
      ];

      const costEstimates = { milk: 5 };
      const cost = manager.calculateWasteCost(pantry, costEstimates);
      expect(cost.totalCost).toBe(5);
    });

    it('returns zero when no expired items', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pantry = [
        { name: 'milk', expiryDate: tomorrow.toISOString(), quantity: 1 },
      ];

      const cost = manager.calculateWasteCost(pantry);
      expect(cost.totalCost).toBe(0);
      expect(cost.itemCount).toBe(0);
    });

    it('sorts items by cost descending', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const pantry = [
        {
          name: 'milk',
          expiryDate: yesterday.toISOString(),
          quantity: 1,
          category: 'meat',
        },
        {
          name: 'bread',
          expiryDate: yesterday.toISOString(),
          quantity: 1,
          category: 'vegetables',
        },
      ];

      const cost = manager.calculateWasteCost(pantry);
      expect(cost.items[0].cost).toBeGreaterThanOrEqual(cost.items[1].cost);
    });
  });

  describe('estimateCost', () => {
    it('estimates cost based on category', () => {
      const item = { name: 'milk', category: 'dairy', quantity: 1 };
      const cost = manager.estimateCost(item);
      expect(cost).toBe(4);
    });

    it('adjusts cost by quantity', () => {
      const item = { name: 'milk', category: 'dairy', quantity: 3 };
      const cost = manager.estimateCost(item);
      expect(cost).toBe(12);
    });

    it('uses default cost for unknown category', () => {
      const item = { name: 'unknown', category: 'unknown', quantity: 1 };
      const cost = manager.estimateCost(item);
      expect(cost).toBe(3);
    });

    it('uses default quantity when not provided', () => {
      const item = { name: 'milk', category: 'dairy' };
      const cost = manager.estimateCost(item);
      expect(cost).toBe(4);
    });
  });

  describe('getTips', () => {
    it('returns array of tips', () => {
      const tips = manager.getTips();
      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
    });

    it('each tip has required properties', () => {
      const tips = manager.getTips();
      tips.forEach((tip) => {
        expect(tip.title).toBeDefined();
        expect(tip.description).toBeDefined();
        expect(tip.icon).toBeDefined();
      });
    });
  });

  describe('generateWeeklyReport', () => {
    it('generates report with all sections', () => {
      const pantry = [{ name: 'milk', quantity: 1 }];

      const report = manager.generateWeeklyReport(pantry);
      expect(report.date).toBeDefined();
      expect(report.suggestions).toBeDefined();
      expect(report.wasteCost).toBeDefined();
      expect(report.tips).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    it('includes summary counts', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pantry = [
        { name: 'expired', expiryDate: yesterday.toISOString(), quantity: 5 },
        { name: 'expiring', expiryDate: tomorrow.toISOString(), quantity: 5 },
        { name: 'low', quantity: 1 },
      ];

      const report = manager.generateWeeklyReport(pantry);
      expect(report.summary.expired).toBe(1);
      expect(report.summary.expiringSoon).toBe(1);
      expect(report.summary.lowQuantity).toBe(1);
    });
  });

  describe('getWasteReductionManager', () => {
    it('returns singleton instance', () => {
      const instance1 = getWasteReductionManager();
      const instance2 = getWasteReductionManager();
      expect(instance1).toBe(instance2);
    });

    it('creates new instance on first call', () => {
      const instance = getWasteReductionManager();
      expect(instance).toBeInstanceOf(WasteReductionManager);
    });
  });
});
