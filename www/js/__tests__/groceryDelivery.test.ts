// @ts-check
/**
 * Grocery Delivery Integration Tests
 * Tests for multi-provider grocery delivery and cart export
 */

import {
  GroceryDeliveryIntegration,
  SEARCH_MAPPINGS,
} from '../features/grocery/groceryDelivery';

describe('GroceryDeliveryIntegration', () => {
  let groceryDelivery;

  beforeEach(() => {
    groceryDelivery = new GroceryDeliveryIntegration();
  });

  describe('initialization', () => {
    it('should start with no preferences', () => {
      const prefs = groceryDelivery.getPreferences();
      expect(prefs.provider).toBeNull();
      expect(prefs.store).toBeNull();
      expect(prefs.zipCode).toBeNull();
    });

    it('should list all providers', () => {
      const providers = groceryDelivery.getProviders();
      expect(providers.length).toBe(5);
      expect(providers.some((p) => p.id === 'instacart')).toBe(true);
      expect(providers.some((p) => p.id === 'amazonFresh')).toBe(true);
      expect(providers.some((p) => p.id === 'walmart')).toBe(true);
    });

    it('should get provider by ID', () => {
      const provider = groceryDelivery.getProvider('instacart');
      expect(provider.name).toBe('Instacart');
      expect(provider.features).toContain('same-day');
    });

    it('should return null for unknown provider', () => {
      expect(groceryDelivery.getProvider('unknown')).toBeNull();
    });
  });

  describe('preferences', () => {
    it('should set preferred provider', async () => {
      await groceryDelivery.setProvider('instacart');
      expect(groceryDelivery.preferredProvider).toBe('instacart');
    });

    it('should throw for unknown provider', async () => {
      await expect(groceryDelivery.setProvider('unknown')).rejects.toThrow(
        'Unknown provider'
      );
    });

    it('should allow null provider (clear preference)', async () => {
      await groceryDelivery.setProvider('instacart');
      await groceryDelivery.setProvider(null);
      expect(groceryDelivery.preferredProvider).toBeNull();
    });

    it('should set preferred store', async () => {
      await groceryDelivery.setStore('Costco');
      expect(groceryDelivery.preferredStore).toBe('Costco');
    });

    it('should set ZIP code', async () => {
      await groceryDelivery.setZipCode('90210');
      expect(groceryDelivery.zipCode).toBe('90210');
    });

    it('should validate ZIP code format', async () => {
      await expect(groceryDelivery.setZipCode('1234')).rejects.toThrow(
        'Invalid ZIP'
      );
      await expect(groceryDelivery.setZipCode('123456')).rejects.toThrow(
        'Invalid ZIP'
      );
    });

    it('should accept ZIP+4 format', async () => {
      await groceryDelivery.setZipCode('90210-1234');
      expect(groceryDelivery.zipCode).toBe('90210-1234');
    });
  });

  describe('availability checking', () => {
    it('should check provider availability', async () => {
      const available = await groceryDelivery.checkAvailability('90210');
      expect(Array.isArray(available)).toBe(true);
      expect(available.length).toBeGreaterThan(0);
    });

    it('should store availability results', async () => {
      await groceryDelivery.checkAvailability('90210');
      expect(groceryDelivery.isProviderAvailable('instacart')).toBe(true);
    });
  });

  describe('search term mapping', () => {
    it('should map common ingredients', () => {
      expect(SEARCH_MAPPINGS['chicken breast']).toContain('chicken');
      expect(SEARCH_MAPPINGS['eggs']).toContain('eggs');
      expect(SEARCH_MAPPINGS['milk']).toContain('milk');
    });

    it('should get optimized search term', () => {
      const term = groceryDelivery.getSearchTerm('chicken breast');
      expect(term).toContain('chicken');
    });

    it('should clean up ingredient names', () => {
      const term = groceryDelivery.getSearchTerm('2 cups diced chicken');
      expect(term).not.toContain('2');
      expect(term).not.toContain('cups');
    });

    it('should handle unknown ingredients gracefully', () => {
      const term = groceryDelivery.getSearchTerm('exotic ingredient xyz');
      expect(term).toBe('exotic ingredient xyz');
    });
  });

  describe('price estimation', () => {
    it('should estimate meat prices higher', () => {
      const meat = { name: 'beef steak', quantity: 1 };
      const produce = { name: 'carrots', quantity: 1 };

      const meatPrice = groceryDelivery.estimatePrice(meat);
      const producePrice = groceryDelivery.estimatePrice(produce);

      expect(meatPrice).toBeGreaterThan(producePrice);
    });

    it('should scale by quantity', () => {
      const item1 = { name: 'chicken', quantity: 1, category: 'meat' };
      const item2 = { name: 'chicken', quantity: 2, category: 'meat' };

      expect(groceryDelivery.estimatePrice(item2)).toBe(
        groceryDelivery.estimatePrice(item1) * 2
      );
    });

    it('should guess categories from names', () => {
      expect(groceryDelivery.guessCategory('milk')).toBe('dairy');
      expect(groceryDelivery.guessCategory('apple')).toBe('produce');
      expect(groceryDelivery.guessCategory('rice')).toBe('grains');
    });
  });

  describe('shopping list formatting', () => {
    const mockShoppingList = [
      { name: 'chicken breast', quantity: 2, unit: 'lb' },
      { name: 'rice', quantity: 1, unit: 'bag' },
      { name: 'broccoli', quantity: 2, unit: 'head' },
    ];

    it('should format list for provider', () => {
      const formatted = groceryDelivery.formatShoppingList(
        mockShoppingList,
        'instacart'
      );

      expect(formatted.provider).toBe('Instacart');
      expect(formatted.items.length).toBe(3);
      expect(formatted.totalItems).toBe(3);
    });

    it('should format generic list when no provider', () => {
      const formatted = groceryDelivery.formatShoppingList(mockShoppingList);

      expect(formatted.provider).toBe('Generic List');
      expect(formatted.estimatedTotal).toBeGreaterThan(0);
      expect(formatted.exportFormats).toBeDefined();
    });

    it('should add provider URLs to items', () => {
      const formatted = groceryDelivery.formatShoppingList(
        mockShoppingList,
        'instacart'
      );

      expect(formatted.items[0].instacartUrl).toBeDefined();
      expect(formatted.items[0].instacartUrl).toContain('instacart.com');
    });

    it('should include all item details', () => {
      const formatted = groceryDelivery.formatShoppingList(
        mockShoppingList,
        'walmart'
      );
      const item = formatted.items[0];

      expect(item.originalName).toBe('chicken breast');
      expect(item.searchTerm).toBeDefined();
      expect(item.quantity).toBe(2);
      expect(item.estimatedPrice).toBeGreaterThan(0);
      expect(item.category).toBeDefined();
    });
  });

  describe('price comparison', () => {
    const mockShoppingList = [
      { name: 'chicken breast', quantity: 2 },
      { name: 'rice', quantity: 1 },
      { name: 'vegetables', quantity: 3 },
    ];

    it('should compare prices across providers', () => {
      const comparison = groceryDelivery.comparePrices(mockShoppingList);

      expect(comparison.cheapest).toBeDefined();
      expect(comparison.all.length).toBe(5);
      expect(comparison.savings).toBeGreaterThanOrEqual(0);
    });

    it('should sort by estimated total', () => {
      const comparison = groceryDelivery.comparePrices(mockShoppingList);

      for (let i = 1; i < comparison.all.length; i++) {
        expect(comparison.all[i].estimatedTotal).toBeGreaterThanOrEqual(
          comparison.all[i - 1].estimatedTotal
        );
      }
    });

    it('should include provider features', () => {
      const comparison = groceryDelivery.comparePrices(mockShoppingList);
      const instacart = comparison.all.find(
        (p) => p.providerId === 'instacart'
      );

      expect(instacart.features).toContain('same-day');
    });
  });

  describe('export formats', () => {
    const mockShoppingList = [
      { name: 'chicken breast', quantity: 2, unit: 'lb', category: 'meat' },
      { name: 'rice', quantity: 1, unit: 'bag', category: 'grains' },
    ];

    it('should export to CSV', () => {
      const csv = groceryDelivery.exportToCSV(mockShoppingList);

      expect(csv).toContain('Item,Quantity');
      expect(csv).toContain('chicken breast');
      expect(csv).toContain('rice');
    });

    it('should export to text', () => {
      const text = groceryDelivery.exportToText(mockShoppingList);

      expect(text).toContain('Shopping List');
      expect(text).toContain('MEAT');
      expect(text).toContain('GRAINS');
      expect(text).toContain('chicken breast');
    });

    it('should group text export by category', () => {
      const text = groceryDelivery.exportToText(mockShoppingList);

      expect(text).toContain('📦');
      expect(text.split('📦').length).toBeGreaterThan(1);
    });
  });

  describe('quick order', () => {
    const mockShoppingList = [
      { name: 'chicken', quantity: 1 },
      { name: 'rice', quantity: 1 },
    ];

    it('should fail without preferred provider', async () => {
      const result = await groceryDelivery.quickOrder(mockShoppingList);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No preferred provider');
    });

    it('should succeed with preferred provider', async () => {
      await groceryDelivery.setProvider('instacart');
      const result = await groceryDelivery.quickOrder(mockShoppingList);

      expect(result.success).toBe(true);
      expect(result.provider.name).toBe('Instacart');
      expect(result.formattedList).toBeDefined();
    });
  });

  describe('pub-sub', () => {
    it('should notify on preference change', async () => {
      const callback = jest.fn();
      groceryDelivery.subscribe(callback);

      await groceryDelivery.setProvider('walmart');

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].provider).toBe('walmart');
    });

    it('should allow unsubscribing', async () => {
      const callback = jest.fn();
      const unsubscribe = groceryDelivery.subscribe(callback);

      unsubscribe();
      await groceryDelivery.setZipCode('90210');

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
