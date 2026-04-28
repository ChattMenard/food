// @ts-check
/**
 * Open Food Facts Open Prices Integration Tests
 * Tests for real-time price data integration with recipe cost classification
 */

import { OpenPricesClient, EnhancedRecipeCostClassifier, openPricesClient, enhancedRecipeClassifier } from '../features/plan/openPricesIntegration.js';

// Mock fetch for testing
global.fetch = jest.fn();

describe('OpenPricesClient', () => {
  let client: OpenPricesClient;

  beforeEach(() => {
    client = new OpenPricesClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.clearCache();
  });

  describe('API Integration', () => {
    it('should fetch ingredient price data successfully', async () => {
      const mockResponse = {
        products: [
          {
            code: '123',
            product_name: 'Organic Rice',
            price: 2.50,
            currency: 'USD',
            location_tags: ['US'],
            last_updated: '2026-04-28'
          },
          {
            code: '456',
            product_name: 'Basmati Rice',
            price: 3.00,
            currency: 'USD',
            location_tags: ['US'],
            last_updated: '2026-04-28'
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.getIngredientPrice('rice');

      expect(result).toBeDefined();
      expect(result.ingredient).toBe('rice');
      expect(result.priceData.average).toBe(2.75);
      expect(result.priceData.median).toBe(2.50);
      expect(result.priceData.min).toBe(2.50);
      expect(result.priceData.max).toBe(3.00);
      expect(result.priceData.sampleSize).toBe(2);
      expect(result.priceData.currency).toBe('USD');
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await client.getIngredientPrice('nonexistent');

      expect(result).toBeNull();
    });

    it('should cache results to avoid repeated API calls', async () => {
      const mockResponse = {
        products: [{ price: 2.50, currency: 'USD' }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // First call
      await client.getIngredientPrice('rice');
      // Second call should use cache
      await client.getIngredientPrice('rice');

      // Should only call fetch once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should filter by location when specified', async () => {
      const mockResponse = {
        products: [
          {
            price: 2.50,
            currency: 'USD',
            location_tags: ['US']
          },
          {
            price: 1.80,
            currency: 'EUR',
            location_tags: ['FR']
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.getIngredientPrice('rice', 'FR');

      expect(result.priceData.average).toBe(1.80);
      expect(result.location).toBe('FR');
    });
  });

  describe('Price Data Processing', () => {
    it('should detect most common currency', () => {
      const mockData = {
        products: [
          { currency: 'USD', price: 2.50 },
          { currency: 'USD', price: 3.00 },
          { currency: 'EUR', price: 1.80 }
        ]
      };

      const result = client.processPriceData(mockData);

      expect(result.priceData.currency).toBe('USD');
    });

    it('should handle empty product list', () => {
      const mockData = { products: [] };

      const result = client.processPriceData(mockData);

      expect(result).toBeNull();
    });

    it('should filter out products without prices', () => {
      const mockData = {
        products: [
          { price: 2.50 },
          { price: null },
          { price: 0 },
          { price: 3.00 }
        ]
      };

      const result = client.processPriceData(mockData);

      expect(result.priceData.sampleSize).toBe(2);
      expect(result.priceData.average).toBe(2.75);
    });
  });
});

describe('EnhancedRecipeCostClassifier', () => {
  let classifier: EnhancedRecipeCostClassifier;

  beforeEach(() => {
    classifier = new EnhancedRecipeCostClassifier();
    jest.clearAllMocks();
  });

  describe('Real-Time Cost Classification', () => {
    it('should classify recipe using real price data', async () => {
      // Mock Open Prices API responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            products: [{ price: 1.50, currency: 'USD' }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            products: [{ price: 3.00, currency: 'USD' }]
          })
        });

      const recipe = {
        name: 'Simple Rice and Chicken',
        ingredients: [
          { name: 'rice', quantity: 2 },
          { name: 'chicken', quantity: 1 }
        ],
        servings: 4
      };

      const result = await classifier.classifyRecipeWithRealPrices(recipe);

      expect(result.tier).toBe('N'); // Normal (cost per serving ~$1.875)
      expect(result.costPerServing).toBeCloseTo(1.875);
      expect(result.totalCost).toBeCloseTo(7.5);
      expect(result.ingredientBreakdown).toHaveLength(2);
      expect(result.dataSource).toBe('open_prices');
    });

    it('should use fallback costs when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      const recipe = {
        ingredients: [{ name: 'rice', quantity: 1 }],
        servings: 2
      };

      const result = await classifier.classifyRecipeWithRealPrices(recipe);

      expect(result.costPerServing).toBe(0.75); // $1.50 fallback / 2 servings
      expect(result.ingredientBreakdown[0].source).toBe('fallback');
    });

    it('should classify as Cheap for low-cost recipes', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ price: 1.00, currency: 'USD' }]
        })
      });

      const recipe = {
        ingredients: [{ name: 'rice', quantity: 1 }],
        servings: 1
      };

      const result = await classifier.classifyRecipeWithRealPrices(recipe);

      expect(result.tier).toBe('C'); // Cheap (≤$2.00)
    });

    it('should classify as Fancy for high-cost recipes', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ price: 8.00, currency: 'USD' }]
        })
      });

      const recipe = {
        ingredients: [{ name: 'salmon', quantity: 1 }],
        servings: 1
      };

      const result = await classifier.classifyRecipeWithRealPrices(recipe);

      expect(result.tier).toBe('F'); // Fancy (>$5.00)
    });

    it('should handle location-aware pricing', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ price: 4.00, currency: 'EUR', location_tags: ['FR'] }]
        })
      });

      const recipe = {
        ingredients: [{ name: 'chicken', quantity: 1 }],
        servings: 2,
        location: 'FR'
      };

      const result = await classifier.classifyRecipeWithRealPrices(recipe, 'FR');

      expect(result.location).toBe('FR');
      expect(result.costPerServing).toBe(2.00);
    });
  });

  describe('Fallback System', () => {
    it('should update fallback costs with latest API data', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [{ price: 2.00, currency: 'USD' }]
        })
      });

      await classifier.updateFallbackCosts();

      // Should have updated fallback costs
      expect(classifier['fallbackCosts'].rice).toBe(2.00);
    });

    it('should handle API failures during fallback updates', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      // Should not throw error
      await expect(classifier.updateFallbackCosts()).resolves.toBeUndefined();
    });
  });
});

describe('Integration Scenarios', () => {
  it('should handle mixed API success and failure scenarios', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [{ price: 2.50, currency: 'USD' }]
        })
      })
      .mockRejectedValueOnce(new Error('API unavailable'));

    const recipe = {
      ingredients: [
        { name: 'rice', quantity: 1 },
        { name: 'exotic_spice', quantity: 1 }
      ],
      servings: 2
    };

    const result = await enhancedRecipeClassifier.classifyRecipeWithRealPrices(recipe);

    expect(result.ingredientBreakdown).toHaveLength(2);
    expect(result.ingredientBreakdown[0].source).toBe('open_prices');
    expect(result.ingredientBreakdown[1].source).toBe('fallback');
  });

  it('should provide detailed cost breakdown', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [{ price: 3.00, currency: 'USD' }]
      })
    });

    const recipe = {
      name: 'Chicken Dish',
      ingredients: [
        { name: 'chicken', quantity: 2, unit: 'lbs' },
        { name: 'rice', quantity: 1, unit: 'cup' }
      ],
      servings: 4,
      instructions: 'Cook chicken and rice'
    };

    const result = await enhancedRecipeClassifier.classifyRecipeWithRealPrices(recipe);

    expect(result.ingredientBreakdown[0]).toEqual({
      name: 'chicken',
      cost: 3.00,
      quantity: 2,
      totalCost: 6.00,
      source: 'open_prices'
    });

    expect(result).toMatchObject({
      tier: expect.any(String),
      costPerServing: expect.any(Number),
      totalCost: expect.any(Number),
      servings: 4,
      location: 'global',
      dataSource: 'open_prices',
      lastUpdated: expect.any(Number)
    });
  });
});
