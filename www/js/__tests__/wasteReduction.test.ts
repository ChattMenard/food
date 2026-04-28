// @ts-check
import {
  WasteReductionManager,
  getWasteReductionManager,
} from '../features/pantry/wasteReduction';

describe('WasteReductionManager', () => {
  let manager: WasteReductionManager;

  beforeEach(() => {
    manager = new WasteReductionManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes with empty suggestions', () => {
      expect((manager as any).suggestions).toEqual([]);
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

      const suggestions = (manager as any).analyzePantry(pantry);
      const expiringSoon = suggestions.filter(
        (s: any) => s.type === 'expiring-soon'
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

      const suggestions = (manager as any).analyzePantry(pantry);
      const expired = suggestions.filter(
        (s: any) => s.type === 'expired'
      );
      expect(expired.length).toBe(1);
      expect(expired[0].item).toBe('milk');
      expect(expired[0].priority).toBe('urgent');
    });

    it('identifies items with high quantity', () => {
      const pantry = [
        { name: 'rice', quantity: 10, expiryDate: null },
        { name: 'spice', quantity: 1, expiryDate: null },
      ];

      const suggestions = (manager as any).analyzePantry(pantry);
      const highQuantity = suggestions.filter(
        (s: any) => s.type === 'high-quantity'
      );
      expect(highQuantity.length).toBe(1);
      expect(highQuantity[0].item).toBe('rice');
      expect(highQuantity[0].priority).toBe('medium');
    });

    it('handles empty pantry', () => {
      const suggestions = (manager as any).analyzePantry([]);
      expect(suggestions).toEqual([]);
    });

    it('handles null pantry', () => {
      const suggestions = (manager as any).analyzePantry(null as any);
      expect(suggestions).toEqual([]);
    });

    it('prioritizes expired over expiring items', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pantry = [
        { name: 'milk', expiryDate: yesterday.toISOString(), quantity: 1 },
        { name: 'bread', expiryDate: tomorrow.toISOString(), quantity: 1 },
      ];

      const suggestions = (manager as any).analyzePantry(pantry);
      const expired = suggestions.find((s: any) => s.type === 'expired');
      const expiring = suggestions.find((s: any) => s.type === 'expiring-soon');

      expect(expired.priority).toBe('urgent');
      expect(expiring.priority).toBe('high');
    });
  });

  describe('generateRecipeSuggestions', () => {
    it('suggests recipes using expiring items', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pantry = [
        { name: 'milk', expiryDate: tomorrow.toISOString(), quantity: 1 },
        { name: 'eggs', expiryDate: null, quantity: 12 },
      ];

      const mockRecipes = [
        {
          name: 'Scrambled Eggs',
          ingredients: ['eggs', 'milk', 'butter'],
        },
        {
          name: 'Pancakes',
          ingredients: ['flour', 'milk', 'eggs'],
        },
        {
          name: 'Salad',
          ingredients: ['lettuce', 'tomatoes'],
        },
      ];

      const suggestions = (manager as any).generateRecipeSuggestions(pantry, mockRecipes);
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].name).toBe('Scrambled Eggs');
      expect(suggestions[1].name).toBe('Pancakes');
      expect(suggestions.every((s: any) => s.matchCount > 0)).toBe(true);
    });

    it('sorts recipes by ingredient match count', () => {
      const pantry = [
        { name: 'milk', expiryDate: null, quantity: 1 },
        { name: 'eggs', expiryDate: null, quantity: 12 },
        { name: 'flour', expiryDate: null, quantity: 1 },
      ];

      const mockRecipes = [
        {
          name: 'Partial Match',
          ingredients: ['milk', 'sugar'],
        },
        {
          name: 'Full Match',
          ingredients: ['milk', 'eggs', 'flour'],
        },
      ];

      const suggestions = (manager as any).generateRecipeSuggestions(pantry, mockRecipes);
      
      expect(suggestions[0].name).toBe('Full Match');
      expect(suggestions[0].matchCount).toBe(3);
      expect(suggestions[1].name).toBe('Partial Match');
      expect(suggestions[1].matchCount).toBe(1);
    });

    it('excludes recipes with no matching ingredients', () => {
      const pantry = [{ name: 'milk', expiryDate: null, quantity: 1 }];
      const mockRecipes = [
        { name: 'No Match', ingredients: ['flour', 'sugar'] },
      ];

      const suggestions = (manager as any).generateRecipeSuggestions(pantry, mockRecipes);
      expect(suggestions).toEqual([]);
    });

    it('handles empty recipe list', () => {
      const pantry = [{ name: 'milk', expiryDate: null, quantity: 1 }];
      const suggestions = (manager as any).generateRecipeSuggestions(pantry, []);
      expect(suggestions).toEqual([]);
    });
  });

  describe('calculateWasteScore', () => {
    it('calculates waste score for pantry', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pantry = [
        { name: 'milk', expiryDate: yesterday.toISOString(), quantity: 1 }, // Expired
        { name: 'bread', expiryDate: tomorrow.toISOString(), quantity: 2 }, // Expiring soon
        { name: 'rice', expiryDate: null, quantity: 10 }, // High quantity
      ];

      const score = (manager as any).calculateWasteScore(pantry);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns 0 for perfect pantry', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const pantry = [
        { name: 'milk', expiryDate: nextWeek.toISOString(), quantity: 1 },
        { name: 'bread', expiryDate: nextWeek.toISOString(), quantity: 1 },
      ];

      const score = (manager as any).calculateWasteScore(pantry);
      expect(score).toBe(0);
    });

    it('handles empty pantry', () => {
      const score = (manager as any).calculateWasteScore([]);
      expect(score).toBe(0);
    });
  });

  describe('getWasteReductionTips', () => {
    it('provides tips based on pantry analysis', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const pantry = [
        { name: 'milk', expiryDate: yesterday.toISOString(), quantity: 1 },
        { name: 'bread', expiryDate: null, quantity: 5 },
      ];

      const tips = (manager as any).getWasteReductionTips(pantry);
      
      expect(tips).toHaveLength(2);
      expect(tips.some((tip: any) => tip.includes('expired'))).toBe(true);
      expect(tips.some((tip: any) => tip.includes('quantity'))).toBe(true);
    });

    it('provides general tips for healthy pantry', () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const pantry = [
        { name: 'milk', expiryDate: nextWeek.toISOString(), quantity: 1 },
        { name: 'bread', expiryDate: nextWeek.toISOString(), quantity: 1 },
      ];

      const tips = (manager as any).getWasteReductionTips(pantry);
      
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.every((tip: any) => typeof tip === 'string')).toBe(true);
    });
  });

  describe('trackWasteReduction', () => {
    it('tracks waste reduction over time', () => {
      const initialScore = 50;
      const currentScore = 30;
      
      const reduction = (manager as any).trackWasteReduction(initialScore, currentScore);
      
      expect(reduction).toBe(20);
      expect(reduction.percentage).toBe(40);
    });

    it('handles no improvement', () => {
      const initialScore = 50;
      const currentScore = 50;
      
      const reduction = (manager as any).trackWasteReduction(initialScore, currentScore);
      
      expect(reduction).toBe(0);
      expect(reduction.percentage).toBe(0);
    });

    it('handles increased waste', () => {
      const initialScore = 30;
      const currentScore = 50;
      
      const reduction = (manager as any).trackWasteReduction(initialScore, currentScore);
      
      expect(reduction).toBe(-20);
      expect(reduction.percentage).toBe(-40);
    });
  });

  describe('getWasteStatistics', () => {
    it('provides comprehensive waste statistics', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pantry = [
        { name: 'milk', expiryDate: yesterday.toISOString(), quantity: 1 },
        { name: 'bread', expiryDate: tomorrow.toISOString(), quantity: 2 },
        { name: 'rice', expiryDate: null, quantity: 10 },
      ];

      const stats = (manager as any).getWasteStatistics(pantry);
      
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('expiredItems');
      expect(stats).toHaveProperty('expiringItems');
      expect(stats).toHaveProperty('highQuantityItems');
      expect(stats).toHaveProperty('wasteScore');
      
      expect(stats.totalItems).toBe(3);
      expect(stats.expiredItems).toBe(1);
      expect(stats.expiringItems).toBe(1);
      expect(stats.highQuantityItems).toBe(1);
    });

    it('handles empty pantry statistics', () => {
      const stats = (manager as any).getWasteStatistics([]);
      
      expect(stats.totalItems).toBe(0);
      expect(stats.expiredItems).toBe(0);
      expect(stats.expiringItems).toBe(0);
      expect(stats.highQuantityItems).toBe(0);
      expect(stats.wasteScore).toBe(0);
    });
  });

  describe('singleton pattern', () => {
    it('returns singleton instance', () => {
      const manager1 = getWasteReductionManager();
      const manager2 = getWasteReductionManager();
      
      expect(manager1).toBe(manager2);
    });

    it('creates new instance when requested', () => {
      const manager1 = getWasteReductionManager();
      const manager2 = new WasteReductionManager();
      
      expect(manager1).not.toBe(manager2);
    });
  });

  describe('integration', () => {
    it('provides complete waste analysis workflow', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pantry = [
        { name: 'milk', expiryDate: yesterday.toISOString(), quantity: 1 },
        { name: 'eggs', expiryDate: tomorrow.toISOString(), quantity: 12 },
        { name: 'rice', expiryDate: null, quantity: 10 },
      ];

      const mockRecipes = [
        {
          name: 'Rice Pudding',
          ingredients: ['rice', 'milk', 'sugar'],
        },
        {
          name: 'Egg Fried Rice',
          ingredients: ['rice', 'eggs', 'soy sauce'],
        },
      ];

      // Analyze pantry
      const suggestions = (manager as any).analyzePantry(pantry);
      expect(suggestions.length).toBeGreaterThan(0);

      // Get recipe suggestions
      const recipeSuggestions = (manager as any).generateRecipeSuggestions(pantry, mockRecipes);
      expect(recipeSuggestions.length).toBeGreaterThan(0);

      // Calculate waste score
      const score = (manager as any).calculateWasteScore(pantry);
      expect(score).toBeGreaterThan(0);

      // Get statistics
      const stats = (manager as any).getWasteStatistics(pantry);
      expect(stats.totalItems).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('handles invalid dates', () => {
      const pantry = [
        { name: 'milk', expiryDate: 'invalid-date', quantity: 1 },
        { name: 'bread', expiryDate: '', quantity: 1 },
      ];

      expect(() => (manager as any).analyzePantry(pantry)).not.toThrow();
    });

    it('handles negative quantities', () => {
      const pantry = [
        { name: 'milk', expiryDate: null, quantity: -1 },
        { name: 'bread', expiryDate: null, quantity: 0 },
      ];

      expect(() => (manager as any).analyzePantry(pantry)).not.toThrow();
    });

    it('handles missing properties', () => {
      const pantry = [
        { name: 'milk' },
        { quantity: 1 },
        { expiryDate: new Date().toISOString() },
        {},
      ];

      expect(() => (manager as any).analyzePantry(pantry)).not.toThrow();
    });

    it('handles very large quantities', () => {
      const pantry = [
        { name: 'rice', expiryDate: null, quantity: Number.MAX_SAFE_INTEGER },
      ];

      expect(() => (manager as any).analyzePantry(pantry)).not.toThrow();
    });
  });

  describe('performance', () => {
    it('handles large pantry efficiently', () => {
      const largePantry = Array.from({ length: 1000 }, (_, i) => ({
        name: `item${i}`,
        expiryDate: i % 100 === 0 ? new Date().toISOString() : null,
        quantity: Math.floor(Math.random() * 20),
      }));

      const startTime = Date.now();
      const suggestions = (manager as any).analyzePantry(largePantry);
      const endTime = Date.now();

      expect(suggestions).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('handles large recipe list efficiently', () => {
      const pantry = [{ name: 'milk', expiryDate: null, quantity: 1 }];
      const largeRecipes = Array.from({ length: 1000 }, (_, i) => ({
        name: `Recipe ${i}`,
        ingredients: [`ingredient${i}`, 'milk'],
      }));

      const startTime = Date.now();
      const suggestions = (manager as any).generateRecipeSuggestions(pantry, largeRecipes);
      const endTime = Date.now();

      expect(suggestions).toBeDefined();
      expect(endTime - startTime).toBeLessThan(200); // Should complete in under 200ms
    });
  });
});
