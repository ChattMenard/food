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
  let groceryDelivery: GroceryDeliveryIntegration;

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
      expect(providers.some((p: any) => p.id === 'instacart')).toBe(true);
      expect(providers.some((p: any) => p.id === 'amazonFresh')).toBe(true);
      expect(providers.some((p: any) => p.id === 'walmart')).toBe(true);
    });

    it('should get provider by ID', () => {
      const provider = groceryDelivery.getProvider('instacart');
      expect(provider?.name).toBe('Instacart');
      expect(provider?.features).toContain('same-day');
    });

    it('should return null for unknown provider', () => {
      expect(groceryDelivery.getProvider('unknown')).toBeNull();
    });
  });

  describe('preferences', () => {
    it('should set preferred provider', async () => {
      await groceryDelivery.setProvider('instacart');
      expect((groceryDelivery as any).preferredProvider).toBe('instacart');
    });

    it('should set preferred store', async () => {
      await groceryDelivery.setStore('safeway');
      expect((groceryDelivery as any).preferredStore).toBe('safeway');
    });

    it('should set zip code', async () => {
      await groceryDelivery.setZipCode('90210');
      expect((groceryDelivery as any).zipCode).toBe('90210');
    });

    it('should validate zip code format', async () => {
      await expect(groceryDelivery.setZipCode('invalid')).rejects.toThrow('Invalid zip code format');
    });

    it('should save preferences to localStorage', async () => {
      await groceryDelivery.setProvider('instacart');
      await groceryDelivery.setStore('safeway');
      await groceryDelivery.setZipCode('90210');

      const saved = localStorage.getItem('grocery-delivery-preferences');
      const prefs = JSON.parse(saved!);
      
      expect(prefs.provider).toBe('instacart');
      expect(prefs.store).toBe('safeway');
      expect(prefs.zipCode).toBe('90210');
    });
  });

  describe('cart export', () => {
    beforeEach(async () => {
      await groceryDelivery.setProvider('instacart');
      await groceryDelivery.setStore('safeway');
      await groceryDelivery.setZipCode('90210');
    });

    it('should export pantry items to cart format', () => {
      const pantryItems = [
        { name: 'Chicken Breast', quantity: 2, unit: 'lb' },
        { name: 'Rice', quantity: 1, unit: 'bag' },
        { name: 'Tomatoes', quantity: 4, unit: 'lb' }
      ];

      const cart = groceryDelivery.exportCart(pantryItems);

      expect(cart.items).toHaveLength(3);
      expect(cart.items[0].name).toBe('Chicken Breast');
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.items[0].unit).toBe('lb');
    });

    it('should normalize ingredient names', () => {
      const pantryItems = [
        { name: 'chicken breasts', quantity: 2, unit: 'lb' },
        { name: 'tomatoes (ripe)', quantity: 4, unit: 'lb' }
      ];

      const cart = groceryDelivery.exportCart(pantryItems);

      expect(cart.items[0].name).toBe('Chicken Breast');
      expect(cart.items[1].name).toBe('Tomatoes');
    });

    it('should handle missing units gracefully', () => {
      const pantryItems = [
        { name: 'Salt', quantity: 1, unit: '' },
        { name: 'Pepper', quantity: 1, unit: null as any }
      ];

      const cart = groceryDelivery.exportCart(pantryItems);

      expect(cart.items[0].unit).toBe('item');
      expect(cart.items[1].unit).toBe('item');
    });

    it('should group items by category', () => {
      const pantryItems = [
        { name: 'Chicken Breast', quantity: 2, unit: 'lb' },
        { name: 'Beef Steak', quantity: 1, unit: 'lb' },
        { name: 'Lettuce', quantity: 1, unit: 'head' },
        { name: 'Tomatoes', quantity: 4, unit: 'lb' }
      ];

      const cart = groceryDelivery.exportCart(pantryItems);

      expect(cart.categories).toBeDefined();
      expect(cart.categories.produce).toBeDefined();
      expect(cart.categories.meat).toBeDefined();
    });

    it('should calculate estimated total', () => {
      const pantryItems = [
        { name: 'Chicken Breast', quantity: 2, unit: 'lb' },
        { name: 'Rice', quantity: 1, unit: 'bag' }
      ];

      const cart = groceryDelivery.exportCart(pantryItems);

      expect(cart.estimatedTotal).toBeGreaterThan(0);
      expect(typeof cart.estimatedTotal).toBe('number');
    });
  });

  describe('provider-specific features', () => {
    it('should generate Instacart URL', () => {
      const cart = {
        items: [
          { name: 'Chicken Breast', quantity: 2, unit: 'lb' },
          { name: 'Rice', quantity: 1, unit: 'bag' }
        ]
      };

      const url = groceryDelivery.generateProviderUrl('instacart', cart);

      expect(url).toContain('instacart.com');
      expect(url).toContain('store=safeway');
      expect(url).toContain('zip=90210');
    });

    it('should generate Amazon Fresh URL', () => {
      const cart = {
        items: [
          { name: 'Chicken Breast', quantity: 2, unit: 'lb' }
        ]
      };

      const url = groceryDelivery.generateProviderUrl('amazonFresh', cart);

      expect(url).toContain('amazon.com');
      expect(url).toContain('fresh');
    });

    it('should generate Walmart Grocery URL', () => {
      const cart = {
        items: [
          { name: 'Chicken Breast', quantity: 2, unit: 'lb' }
        ]
      };

      const url = groceryDelivery.generateProviderUrl('walmart', cart);

      expect(url).toContain('walmart.com');
      expect(url).toContain('grocery');
    });

    it('should handle unknown provider gracefully', () => {
      const cart = { items: [] };
      
      expect(() => groceryDelivery.generateProviderUrl('unknown', cart)).not.toThrow();
    });
  });

  describe('search mappings', () => {
    it('should have search mappings for common ingredients', () => {
      expect(SEARCH_MAPPINGS['chicken']).toBeDefined();
      expect(SEARCH_MAPPINGS['tomato']).toBeDefined();
      expect(SEARCH_MAPPINGS['rice']).toBeDefined();
    });

    it('should map ingredient variations to base ingredient', () => {
      expect(SEARCH_MAPPINGS['chicken breasts']).toBe('Chicken Breast');
      expect(SEARCH_MAPPINGS['tomatoes']).toBe('Tomato');
      expect(SEARCH_MAPPINGS['brown rice']).toBe('Rice');
    });

    it('should handle case insensitive mapping', () => {
      expect(SEARCH_MAPPINGS['CHICKEN']).toBe('Chicken Breast');
      expect(SEARCH_MAPPINGS['Tomato']).toBe('Tomato');
    });
  });

  describe('availability checking', () => {
    it('should check provider availability by zip code', async () => {
      const availability = await groceryDelivery.checkAvailability('90210');

      expect(availability).toHaveProperty('instacart');
      expect(availability).toHaveProperty('amazonFresh');
      expect(availability).toHaveProperty('walmart');
      
      expect(typeof availability.instacart).toBe('boolean');
      expect(typeof availability.amazonFresh).toBe('boolean');
      expect(typeof availability.walmart).toBe('boolean');
    });

    it('should handle invalid zip codes', async () => {
      await expect(groceryDelivery.checkAvailability('invalid')).rejects.toThrow('Invalid zip code format');
    });

    it('should cache availability results', async () => {
      const mockCheck = jest.spyOn(groceryDelivery as any, 'checkProviderAvailability');
      mockCheck.mockResolvedValue(true);

      await groceryDelivery.checkAvailability('90210');
      await groceryDelivery.checkAvailability('90210');

      expect(mockCheck).toHaveBeenCalledTimes(1); // Should be cached after first call
    });
  });

  describe('price estimation', () => {
    it('should estimate prices for common items', () => {
      const items = [
        { name: 'Chicken Breast', quantity: 2, unit: 'lb' },
        { name: 'Rice', quantity: 1, unit: 'bag' }
      ];

      const estimates = groceryDelivery.estimatePrices(items);

      expect(estimates).toHaveLength(2);
      expect(estimates[0]).toHaveProperty('name');
      expect(estimates[0]).toHaveProperty('estimatedPrice');
      expect(estimates[0]).toHaveProperty('confidence');
    });

    it('should handle unknown items gracefully', () => {
      const items = [
        { name: 'Unknown Item', quantity: 1, unit: 'item' }
      ];

      const estimates = groceryDelivery.estimatePrices(items);

      expect(estimates[0].estimatedPrice).toBe(0);
      expect(estimates[0].confidence).toBe('low');
    });

    it('should calculate confidence based on data availability', () => {
      const knownItem = { name: 'Chicken Breast', quantity: 1, unit: 'lb' };
      const unknownItem = { name: 'Rare Ingredient', quantity: 1, unit: 'item' };

      const estimates = groceryDelivery.estimatePrices([knownItem, unknownItem]);

      expect(estimates[0].confidence).toBe('high');
      expect(estimates[1].confidence).toBe('low');
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock fetch to simulate network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(groceryDelivery.checkAvailability('90210')).rejects.toThrow('Network error');
    });

    it('should handle API rate limiting', async () => {
      // Mock fetch to simulate rate limit
      global.fetch = jest.fn().mockResolvedValue({
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' })
      });

      await expect(groceryDelivery.checkAvailability('90210')).rejects.toThrow('Rate limit exceeded');
    });

    it('should validate cart items before export', () => {
      const invalidItems = [
        { name: '', quantity: 0, unit: '' }, // Invalid
        { name: 'Valid Item', quantity: 1, unit: 'item' } // Valid
      ];

      const cart = groceryDelivery.exportCart(invalidItems as any);

      expect(cart.items).toHaveLength(1); // Only valid item included
    });
  });

  describe('integration workflows', () => {
    it('should complete full export workflow', async () => {
      // Setup preferences
      await groceryDelivery.setProvider('instacart');
      await groceryDelivery.setStore('safeway');
      await groceryDelivery.setZipCode('90210');

      // Export cart
      const pantryItems = [
        { name: 'Chicken Breast', quantity: 2, unit: 'lb' },
        { name: 'Rice', quantity: 1, unit: 'bag' }
      ];

      const cart = groceryDelivery.exportCart(pantryItems);

      // Generate provider URL
      const url = groceryDelivery.generateProviderUrl('instacart', cart);

      // Verify workflow completion
      expect(cart.items).toHaveLength(2);
      expect(url).toContain('instacart.com');
      expect(cart.estimatedTotal).toBeGreaterThan(0);
    });

    it('should handle workflow with missing preferences', () => {
      const pantryItems = [
        { name: 'Chicken Breast', quantity: 2, unit: 'lb' }
      ];

      // Should still work but with defaults
      const cart = groceryDelivery.exportCart(pantryItems);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].name).toBe('Chicken Breast');
    });
  });
});
