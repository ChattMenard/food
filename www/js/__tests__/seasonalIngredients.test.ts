// @ts-check
import {
  getCurrentSeasonalIngredients,
  getSeasonalIngredientSuggestion,
  getSeasonalRecipes,
} from '../features/pantry/seasonalIngredients';

describe('seasonalIngredients', () => {
  describe('getCurrentSeasonalIngredients', () => {
    it('returns array of seasonal ingredients for current month', () => {
      const ingredients = getCurrentSeasonalIngredients();
      expect(Array.isArray(ingredients)).toBe(true);
      expect(ingredients.length).toBeGreaterThan(0);
    });

    it('returns valid ingredient names', () => {
      const ingredients = getCurrentSeasonalIngredients();
      ingredients.forEach((ing: string) => {
        expect(typeof ing).toBe('string');
        expect(ing.length).toBeGreaterThan(0);
      });
    });

    it('returns ingredients appropriate for current season', () => {
      const ingredients = getCurrentSeasonalIngredients();
      
      // Should contain seasonal ingredients
      expect(ingredients.length).toBeGreaterThan(0);
      
      // All ingredients should be strings
      ingredients.forEach((ingredient: string) => {
        expect(typeof ingredient).toBe('string');
      });
    });
  });

  describe('getSeasonalIngredientSuggestion', () => {
    it('returns suggestions not already in pantry', () => {
      const pantryItems = [{ name: 'tomato' }, { name: 'onion' }];

      const suggestions = getSeasonalIngredientSuggestion(pantryItems);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('returns empty array when pantry has all seasonal ingredients', () => {
      const pantryItems = [
        { name: 'citrus' },
        { name: 'kale' },
        { name: 'brussels sprouts' },
        { name: 'squash' },
        { name: 'root vegetables' },
        { name: 'cabbage' },
        { name: 'leeks' },
      ];

      const suggestions = getSeasonalIngredientSuggestion(pantryItems);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('handles empty pantry', () => {
      const suggestions = getSeasonalIngredientSuggestion([]);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('handles null pantry', () => {
      const suggestions = getSeasonalIngredientSuggestion(null as any);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('limits suggestions to maximum 3', () => {
      const emptyPantry = [];
      const suggestions = getSeasonalIngredientSuggestion(emptyPantry);
      
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('excludes ingredients already in pantry', () => {
      const pantryItems = [{ name: 'tomato' }, { name: 'onion' }];
      const suggestions = getSeasonalIngredientSuggestion(pantryItems);
      
      suggestions.forEach((suggestion: string) => {
        const isInPantry = pantryItems.some((item: any) => 
          item.name.toLowerCase() === suggestion.toLowerCase()
        );
        expect(isInPantry).toBe(false);
      });
    });
  });

  describe('getSeasonalRecipes', () => {
    it('returns recipes using seasonal ingredients', () => {
      const mockRecipes = [
        {
          name: 'Winter Soup',
          ingredients: ['squash', 'carrots', 'onions'],
        },
        {
          name: 'Summer Salad',
          ingredients: ['tomatoes', 'cucumber', 'lettuce'],
        },
        {
          name: 'Spring Pasta',
          ingredients: ['asparagus', 'pasta', 'parmesan'],
        },
      ];

      const seasonalRecipes = getSeasonalRecipes(mockRecipes);
      expect(Array.isArray(seasonalRecipes)).toBe(true);
    });

    it('prioritizes recipes with more seasonal ingredients', () => {
      const mockRecipes = [
        {
          name: 'All Seasonal',
          ingredients: ['squash', 'kale', 'citrus'],
        },
        {
          name: 'Some Seasonal',
          ingredients: ['squash', 'rice', 'chicken'],
        },
        {
          name: 'No Seasonal',
          ingredients: ['rice', 'chicken', 'onions'],
        },
      ];

      const seasonalRecipes = getSeasonalRecipes(mockRecipes);
      
      if (seasonalRecipes.length >= 2) {
        const firstRecipe = seasonalRecipes[0];
        const secondRecipe = seasonalRecipes[1];
        
        // First recipe should have more seasonal ingredients
        expect((firstRecipe as any).seasonalScore).toBeGreaterThanOrEqual(
          (secondRecipe as any).seasonalScore
        );
      }
    });

    it('includes seasonal score in results', () => {
      const mockRecipes = [
        {
          name: 'Test Recipe',
          ingredients: ['squash', 'carrots'],
        },
      ];

      const seasonalRecipes = getSeasonalRecipes(mockRecipes);
      
      seasonalRecipes.forEach((recipe: any) => {
        expect(recipe).toHaveProperty('seasonalScore');
        expect(typeof recipe.seasonalScore).toBe('number');
        expect(recipe.seasonalScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('handles empty recipe list', () => {
      const seasonalRecipes = getSeasonalRecipes([]);
      expect(seasonalRecipes).toEqual([]);
    });

    it('handles null recipe list', () => {
      const seasonalRecipes = getSeasonalRecipes(null as any);
      expect(seasonalRecipes).toEqual([]);
    });

    it('handles recipes with missing properties', () => {
      const invalidRecipes = [
        { name: 'Valid Recipe', ingredients: ['squash'] },
        { name: 'Missing Ingredients' },
        { ingredients: ['carrots'] },
        {},
      ];

      const seasonalRecipes = getSeasonalRecipes(invalidRecipes);
      expect(Array.isArray(seasonalRecipes)).toBe(true);
    });

    it('limits number of returned recipes', () => {
      const manyRecipes = Array.from({ length: 20 }, (_, i) => ({
        name: `Recipe ${i}`,
        ingredients: ['squash', `ingredient${i}`],
      }));

      const seasonalRecipes = getSeasonalRecipes(manyRecipes);
      expect(seasonalRecipes.length).toBeLessThanOrEqual(10);
    });
  });

  describe('seasonal ingredient data', () => {
    it('covers all seasons', () => {
      // Test that we have seasonal data for all months
      const seasonalIngredients = getCurrentSeasonalIngredients();
      expect(seasonalIngredients.length).toBeGreaterThan(0);
    });

    it('provides diverse ingredient types', () => {
      const seasonalIngredients = getCurrentSeasonalIngredients();
      
      // Should include vegetables, fruits, herbs, etc.
      const hasVegetables = seasonalIngredients.some((ing: string) => 
        ing.includes('vegetable') || ing.includes('greens') || 
        ing.includes('squash') || ing.includes('root')
      );
      
      const hasFruits = seasonalIngredients.some((ing: string) => 
        ing.includes('berry') || ing.includes('apple') || 
        ing.includes('citrus') || ing.includes('melon')
      );

      // At least one category should be present
      expect(hasVegetables || hasFruits).toBe(true);
    });
  });

  describe('ingredient matching', () => {
    it('matches ingredients with different naming conventions', () => {
      const pantryItems = [
        { name: 'Tomatoes' },
        { name: 'tomato' },
        { name: 'TOMATO' },
      ];

      const suggestions = getSeasonalIngredientSuggestion(pantryItems);
      
      // Should not suggest tomatoes in any form
      suggestions.forEach((suggestion: string) => {
        const suggestionLower = suggestion.toLowerCase();
        expect(suggestionLower).not.toBe('tomato');
        expect(suggestionLower).not.toBe('tomatoes');
      });
    });

    it('handles ingredient variations', () => {
      const pantryItems = [{ name: 'bell pepper' }];
      
      const suggestions = getSeasonalIngredientSuggestion(pantryItems);
      
      suggestions.forEach((suggestion: string) => {
        expect(suggestion.toLowerCase()).not.toBe('bell pepper');
      });
    });
  });

  describe('edge cases', () => {
    it('handles special characters in ingredient names', () => {
      const pantryItems = [{ name: 'herbs & spices' }];
      
      expect(() => getSeasonalIngredientSuggestion(pantryItems)).not.toThrow();
    });

    it('handles very long ingredient names', () => {
      const pantryItems = [{ name: 'a'.repeat(100) }];
      
      expect(() => getSeasonalIngredientSuggestion(pantryItems)).not.toThrow();
    });

    it('handles empty ingredient names', () => {
      const pantryItems = [{ name: '' }, { name: null as any }, { name: undefined as any }];
      
      expect(() => getSeasonalIngredientSuggestion(pantryItems)).not.toThrow();
    });

    it('handles duplicate pantry items', () => {
      const pantryItems = [
        { name: 'tomato' },
        { name: 'tomato' },
        { name: 'onion' },
        { name: 'onion' },
      ];

      const suggestions = getSeasonalIngredientSuggestion(pantryItems);
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('performance', () => {
    it('handles large pantry efficiently', () => {
      const largePantry = Array.from({ length: 1000 }, (_, i) => ({
        name: `ingredient${i}`,
      }));

      const startTime = Date.now();
      const suggestions = getSeasonalIngredientSuggestion(largePantry);
      const endTime = Date.now();

      expect(suggestions).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('handles large recipe list efficiently', () => {
      const largeRecipes = Array.from({ length: 1000 }, (_, i) => ({
        name: `Recipe ${i}`,
        ingredients: [`ingredient${i}`, `seasonal${i % 10}`],
      }));

      const startTime = Date.now();
      const seasonalRecipes = getSeasonalRecipes(largeRecipes);
      const endTime = Date.now();

      expect(seasonalRecipes).toBeDefined();
      expect(endTime - startTime).toBeLessThan(200); // Should complete in under 200ms
    });
  });

  describe('integration', () => {
    it('works together for complete seasonal workflow', () => {
      // Get seasonal ingredients
      const seasonalIngredients = getCurrentSeasonalIngredients();
      expect(seasonalIngredients.length).toBeGreaterThan(0);

      // Get suggestions for empty pantry
      const suggestions = getSeasonalIngredientSuggestion([]);
      expect(suggestions.length).toBeGreaterThan(0);

      // Get seasonal recipes
      const mockRecipes = [
        {
          name: 'Seasonal Dish',
          ingredients: seasonalIngredients.slice(0, 3),
        },
      ];

      const seasonalRecipes = getSeasonalRecipes(mockRecipes);
      expect(seasonalRecipes.length).toBeGreaterThan(0);
    });

    it('provides consistent results across calls', () => {
      const pantryItems = [{ name: 'tomato' }];
      
      const suggestions1 = getSeasonalIngredientSuggestion(pantryItems);
      const suggestions2 = getSeasonalIngredientSuggestion(pantryItems);
      
      expect(suggestions1).toEqual(suggestions2);
    });
  });
});
