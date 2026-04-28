// @ts-check
/**
 * Open Food Facts Nutritional Data Integration Tests
 * Tests for real-time nutritional data integration with recipe nutrition calculation
 */

import { OpenFoodFactsClient, EnhancedRecipeNutritionCalculator, openFoodFactsClient, enhancedNutritionCalculator } from '../features/nutrition/openFoodFactsIntegration.js';

// Mock fetch for testing
global.fetch = jest.fn();

describe('OpenFoodFactsClient', () => {
  let client: OpenFoodFactsClient;

  beforeEach(() => {
    client = new OpenFoodFactsClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.clearCache();
  });

  describe('Product Search', () => {
    it('should search for products successfully', async () => {
      const mockResponse = {
        products: [
          {
            code: '123',
            product_name: 'Organic Rice',
            brands: 'Brand Name',
            categories: 'Cereals',
            ingredients_text: 'Organic rice',
            quantity: '500g',
            serving_size: '100g',
            image_url: 'https://example.com/image.jpg',
            nutriments: {
              'energy-kcal_100g': 130,
              proteins_100g: 2.7,
              carbohydrates_100g: 28,
              fat_100g: 0.3,
              fiber_100g: 0.4,
              sugars_100g: 0.1,
              sodium_100g: 1
            }
          },
          {
            code: '456',
            product_name: 'Brown Rice',
            brands: 'Another Brand',
            categories: 'Cereals',
            ingredients_text: 'Brown rice',
            quantity: '1kg',
            serving_size: '100g',
            image_url: 'https://example.com/image2.jpg',
            nutriments: {
              'energy-kcal_100g': 111,
              proteins_100g: 2.6,
              carbohydrates_100g: 23,
              fat_100g: 0.9,
              fiber_100g: 1.8,
              sugars_100g: 0.4,
              sodium_100g: 5
            }
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.searchProducts('rice');

      expect(result).toBeDefined();
      expect(result.query).toBe('rice');
      expect(result.totalProducts).toBe(2);
      expect(result.products).toHaveLength(2);
      expect(result.products[0].name).toBe('Organic Rice');
      expect(result.products[0].nutrition.calories).toBe(130);
      expect(result.averageNutrition).toBeDefined();
      expect(result.averageNutrition.calories).toBeCloseTo(120.5);
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await client.searchProducts('nonexistent');

      expect(result).toBeNull();
    });

    it('should cache search results to avoid repeated API calls', async () => {
      const mockResponse = {
        products: [{ product_name: 'Test Product', nutriments: { 'energy-kcal_100g': 100 } }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // First call
      await client.searchProducts('rice');
      // Second call should use cache
      await client.searchProducts('rice');

      // Should only call fetch once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should filter products without nutrition data', async () => {
      const mockResponse = {
        products: [
          {
            product_name: 'Product with nutrition',
            nutriments: { 'energy-kcal_100g': 100 }
          },
          {
            product_name: 'Product without nutrition',
            nutriments: {}
          },
          {
            product_name: 'Product with no nutriments key'
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.searchProducts('test');

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Product with nutrition');
    });

    it('should support country-specific searches', async () => {
      const mockResponse = { products: [] };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await client.searchProducts('milk', 'en', 'ca');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tag_0=ca'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('FridgeToForkApp')
          })
        })
      );
    });
  });

  describe('Product by Barcode', () => {
    it('should get product by barcode successfully', async () => {
      const mockResponse = {
        product: {
          code: '123456789',
          product_name: 'Test Product',
          brands: 'Test Brand',
          categories: 'Food',
          ingredients_text: 'Test ingredients',
          quantity: '100g',
          serving_size: '100g',
          image_url: 'https://example.com/image.jpg',
          nutriments: {
            'energy-kcal_100g': 150,
            proteins_100g: 5,
            carbohydrates_100g: 20,
            fat_100g: 3,
            fiber_100g: 1,
            sugars_100g: 2,
            sodium_100g: 50
          }
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.getProductByBarcode('123456789');

      expect(result).toBeDefined();
      expect(result.id).toBe('123456789');
      expect(result.name).toBe('Test Product');
      expect(result.nutrition.calories).toBe(150);
    });

    it('should handle missing product data', async () => {
      const mockResponse = { product: null };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.getProductByBarcode('invalid');

      expect(result).toBeNull();
    });

    it('should cache barcode lookups', async () => {
      const mockResponse = {
        product: { product_name: 'Test', nutriments: { 'energy-kcal_100g': 100 } }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await client.getProductByBarcode('123');
      await client.getProductByBarcode('123');

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Nutrition Data Processing', () => {
    it('should normalize nutrition data correctly', () => {
      const nutriments = {
        'energy-kcal_100g': 200,
        proteins_100g: 10,
        carbohydrates_100g: 30,
        fat_100g: 5,
        fiber_100g: 2,
        sugars_100g: 1,
        sodium_100g: 100,
        'saturated-fat_100g': 2,
        cholesterol: 50,
        vitamin_a: 1000,
        vitamin_c: 20
      };

      const result = client.normalizeNutritionData(nutriments);

      expect(result).toEqual({
        calories: 200,
        protein: 10,
        carbs: 30,
        fat: 5,
        fiber: 2,
        sugar: 1,
        sodium: 100,
        saturatedFat: 2,
        cholesterol: 50,
        vitaminA: 1000,
        vitaminC: 20,
        calcium: 0,
        iron: 0,
        potassium: 0,
        magnesium: 0
      });
    });

    it('should handle missing nutrition fields', () => {
      const nutriments = { 'energy-kcal_100g': 100 };

      const result = client.normalizeNutritionData(nutriments);

      expect(result.calories).toBe(100);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });

    it('should calculate average nutrition correctly', () => {
      const products = [
        { nutrition: { calories: 100, protein: 5, carbs: 10, fat: 2, fiber: 1, sugar: 1, sodium: 10 } },
        { nutrition: { calories: 200, protein: 10, carbs: 20, fat: 4, fiber: 2, sugar: 2, sodium: 20 } },
        { nutrition: { calories: 300, protein: 15, carbs: 30, fat: 6, fiber: 3, sugar: 3, sodium: 30 } }
      ];

      const result = client.calculateAverageNutrition(products);

      expect(result.calories).toBe(200);
      expect(result.protein).toBe(10);
      expect(result.carbs).toBe(20);
      expect(result.fat).toBe(4);
      expect(result.fiber).toBe(2);
      expect(result.sugar).toBe(2);
      expect(result.sodium).toBe(20);
    });
  });
});

describe('EnhancedRecipeNutritionCalculator', () => {
  let calculator: EnhancedRecipeNutritionCalculator;

  beforeEach(() => {
    calculator = new EnhancedRecipeNutritionCalculator();
    jest.clearAllMocks();
  });

  describe('Recipe Nutrition Calculation', () => {
    it('should calculate recipe nutrition with real data', async () => {
      const mockResponse = {
        products: [
          {
            product_name: 'Chicken Breast',
            nutriments: {
              'energy-kcal_100g': 165,
              proteins_100g: 31,
              carbohydrates_100g: 0,
              fat_100g: 3.6,
              fiber_100g: 0,
              sugars_100g: 0,
              sodium_100g: 74
            }
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const recipe = {
        name: 'Simple Chicken Dish',
        ingredients: [
          { name: 'chicken breast', quantity: 200, unit: 'g' },
          { name: 'rice', quantity: 100, unit: 'g' }
        ],
        servings: 2
      };

      const result = await calculator.calculateRecipeNutrition(recipe);

      expect(result.recipe).toBe('Simple Chicken Dish');
      expect(result.servings).toBe(2);
      expect(result.totalNutrition.calories).toBeGreaterThan(0);
      expect(result.nutritionPerServing.calories).toBeGreaterThan(0);
      expect(result.ingredientBreakdown).toHaveLength(2);
      expect(result.dataSource).toBe('open_food_facts');
    });

    it('should use fallback data when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      const recipe = {
        ingredients: [{ name: 'rice', quantity: 100, unit: 'g' }],
        servings: 1
      };

      const result = await calculator.calculateRecipeNutrition(recipe);

      expect(result.ingredientBreakdown[0].source).toBe('fallback');
      expect(result.ingredientBreakdown[0].nutrition.calories).toBe(130);
    });

    it('should calculate per-serving nutrition correctly', async () => {
      const mockResponse = {
        products: [
          {
            product_name: 'Test Product',
            nutriments: { 'energy-kcal_100g': 200 }
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const recipe = {
        ingredients: [{ name: 'test', quantity: 100, unit: 'g' }],
        servings: 4
      };

      const result = await calculator.calculateRecipeNutrition(recipe);

      expect(result.totalNutrition.calories).toBe(200);
      expect(result.nutritionPerServing.calories).toBe(50);
    });

    it('should handle recipes without ingredients', async () => {
      const recipe = { name: 'Empty Recipe' };

      await expect(calculator.calculateRecipeNutrition(recipe)).rejects.toThrow();
    });

    it('should normalize ingredient names correctly', () => {
      const testCases = [
        ['Organic Brown Rice', 'organic brown rice'],
        ['Chicken Breast (boneless)', 'chicken breast boneless'],
        ['  Extra-Virgin Olive Oil  ', 'extra virgin olive oil'],
        ['1% Low-Fat Milk', ' lowfat milk']
      ];

      testCases.forEach(([input, expected]) => {
        const result = calculator.normalizeIngredientName(input);
        expect(result).toBe(expected);
      });
    });

    it('should parse quantities correctly', () => {
      const testCases = [
        [100, 100],
        ['100g', 100],
        ['2.5 cups', 2.5],
        ['1/2 cup', 0.5],
        ['3', 3],
        [null, 1],
        [undefined, 1]
      ];

      testCases.forEach(([input, expected]) => {
        const result = calculator.parseQuantity(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Batch Processing', () => {
    it('should get nutrition for multiple ingredients in parallel', async () => {
      const mockResponse = {
        products: [
          {
            product_name: 'Test Product',
            nutriments: { 'energy-kcal_100g': 100 }
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const ingredients = [
        { name: 'rice', quantity: 100 },
        { name: 'chicken', quantity: 200 },
        { name: 'vegetables', quantity: 150 }
      ];

      const results = await calculator.getBatchNutrition(ingredients);

      expect(results).toHaveLength(3);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed API success and failure in batch', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: [{ product_name: 'Success', nutriments: { 'energy-kcal_100g': 100 } }] })
        })
        .mockRejectedValueOnce(new Error('API failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ products: [] })
        });

      const ingredients = [
        { name: 'success', quantity: 100 },
        { name: 'failure', quantity: 100 },
        { name: 'noresults', quantity: 100 }
      ];

      const results = await calculator.getBatchNutrition(ingredients);

      expect(results).toHaveLength(3);
      expect(results[0].source).toBe('open_food_facts');
      expect(results[1].source).toBe('fallback');
      expect(results[2].source).toBe('fallback');
    });
  });

  describe('Fallback System', () => {
    it('should update fallback nutrition with API data', async () => {
      const mockResponse = {
        products: [
          {
            product_name: 'Updated Rice',
            nutriments: { 'energy-kcal_100g': 140 }
          }
        ],
        averageNutrition: { calories: 140, protein: 3, carbs: 29, fat: 0.4, fiber: 0.5, sugar: 0.2, sodium: 2 }
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await calculator.updateFallbackNutrition();

      expect(calculator.fallbackNutrition.rice.calories).toBe(140);
    });

    it('should handle API failures during fallback updates', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      await expect(calculator.updateFallbackNutrition()).resolves.toBeUndefined();
    });

    it('should provide comprehensive fallback database', () => {
      const fallbackKeys = Object.keys(calculator.fallbackNutrition);
      
      expect(fallbackKeys).toContain('rice');
      expect(fallbackKeys).toContain('chicken');
      expect(fallbackKeys).toContain('beef');
      expect(fallbackKeys).toContain('salmon');
      expect(fallbackKeys).toContain('eggs');
      
      // Check that each fallback has required nutrition fields
      fallbackKeys.forEach(key => {
        const nutrition = calculator.fallbackNutrition[key];
        expect(nutrition).toHaveProperty('calories');
        expect(nutrition).toHaveProperty('protein');
        expect(nutrition).toHaveProperty('carbs');
        expect(nutrition).toHaveProperty('fat');
        expect(nutrition).toHaveProperty('fiber');
        expect(nutrition).toHaveProperty('sugar');
        expect(nutrition).toHaveProperty('sodium');
      });
    });
  });

  describe('Integration Features', () => {
    it('should provide integration statistics', () => {
      const stats = calculator.getStats();

      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('fallbackDatabaseSize');
      expect(stats.fallbackDatabaseSize).toBeGreaterThan(0);
    });

    it('should clear caches correctly', () => {
      calculator.clearCache();
      const stats = calculator.getStats();
      expect(stats.cacheStats.size).toBe(0);
    });

    it('should support country-specific nutrition data', async () => {
      const mockResponse = { products: [] };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const recipe = {
        ingredients: [{ name: 'milk', quantity: 100 }],
        servings: 1
      };

      await calculator.calculateRecipeNutrition(recipe, 'us');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tag_0=us'),
        expect.any(Object)
      );
    });
  });
});

describe('Integration Scenarios', () => {
  it('should handle complete recipe nutrition workflow', async () => {
    const mockResponses = [
      // Rice search
      {
        products: [
          {
            product_name: 'Brown Rice',
            nutriments: { 'energy-kcal_100g': 111, proteins_100g: 2.6, carbohydrates_100g: 23, fat_100g: 0.9, fiber_100g: 1.8, sugars_100g: 0.4, sodium_100g: 5 }
          }
        ]
      },
      // Chicken search
      {
        products: [
          {
            product_name: 'Chicken Breast',
            nutriments: { 'energy-kcal_100g': 165, proteins_100g: 31, carbohydrates_100g: 0, fat_100g: 3.6, fiber_100g: 0, sugars_100g: 0, sodium_100g: 74 }
          }
        ]
      },
      // Vegetables search (no results)
      { products: [] }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[0] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[1] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[2] });

    const recipe = {
      name: 'Chicken and Rice Bowl',
      ingredients: [
        { name: 'brown rice', quantity: 150, unit: 'g' },
        { name: 'chicken breast', quantity: 200, unit: 'g' },
        { name: 'mixed vegetables', quantity: 100, unit: 'g' }
      ],
      servings: 2
    };

    const result = await enhancedNutritionCalculator.calculateRecipeNutrition(recipe);

    expect(result.recipe).toBe('Chicken and Rice Bowl');
    expect(result.servings).toBe(2);
    expect(result.ingredientBreakdown).toHaveLength(3);
    expect(result.ingredientBreakdown[0].source).toBe('open_food_facts');
    expect(result.ingredientBreakdown[1].source).toBe('open_food_facts');
    expect(result.ingredientBreakdown[2].source).toBe('fallback');
    expect(result.totalNutrition.calories).toBeGreaterThan(0);
    expect(result.nutritionPerServing.calories).toBeGreaterThan(0);
  });

  it('should demonstrate comprehensive nutrition breakdown', async () => {
    const mockResponse = {
      products: [
        {
          product_name: 'Premium Olive Oil',
          brands: 'Mediterranean Farms',
          categories: 'Oils',
          ingredients_text: 'Extra virgin olive oil',
          quantity: '500ml',
          serving_size: '15ml',
          image_url: 'https://example.com/olive-oil.jpg',
          nutriments: {
            'energy-kcal_100g': 884,
            proteins_100g: 0,
            carbohydrates_100g: 0,
            fat_100g: 100,
            fiber_100g: 0,
            sugars_100g: 0,
            sodium_100g: 0,
            'saturated-fat_100g': 14
          }
        }
      ]
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const recipe = {
      name: 'Simple Salad with Olive Oil',
      ingredients: [
        { name: 'olive oil', quantity: 15, unit: 'ml' }
      ],
      servings: 1
    };

    const result = await enhancedNutritionCalculator.calculateRecipeNutrition(recipe);

    expect(result.ingredientBreakdown[0]).toEqual({
      name: 'olive oil',
      quantity: 15,
      unit: 'ml',
      nutrition: expect.objectContaining({
        calories: 884,
        fat: 100,
        saturatedFat: 14
      }),
      source: 'open_food_facts',
      productInfo: {
        name: 'Premium Olive Oil',
        brands: 'Mediterranean Farms',
        servingSize: '15ml'
      }
    });

    expect(result).toMatchObject({
      recipe: 'Simple Salad with Olive Oil',
      servings: 1,
      dataSource: 'open_food_facts',
      country: 'ca',
      lastUpdated: expect.any(Number)
    });
  });
});
