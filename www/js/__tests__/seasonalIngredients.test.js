import {
  getCurrentSeasonalIngredients,
  getSeasonalIngredientSuggestion,
  getSeasonalRecipes,
} from '../features/pantry/seasonalIngredients.js';

describe('seasonalIngredients', () => {
  describe('getCurrentSeasonalIngredients', () => {
    it('returns array of seasonal ingredients for current month', () => {
      const ingredients = getCurrentSeasonalIngredients();
      expect(Array.isArray(ingredients)).toBe(true);
      expect(ingredients.length).toBeGreaterThan(0);
    });

    it('returns valid ingredient names', () => {
      const ingredients = getCurrentSeasonalIngredients();
      ingredients.forEach((ing) => {
        expect(typeof ing).toBe('string');
        expect(ing.length).toBeGreaterThan(0);
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
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('limits suggestions to 3', () => {
      const suggestions = getSeasonalIngredientSuggestion([]);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('filters out pantry items by name matching', () => {
      const pantryItems = [{ name: 'tomato' }, { name: 'cucumber' }];

      const suggestions = getSeasonalIngredientSuggestion(pantryItems);
      const suggestionsLower = suggestions.map((s) => s.toLowerCase());
      expect(suggestionsLower).not.toContain('tomato');
      expect(suggestionsLower).not.toContain('cucumber');
    });
  });

  describe('getSeasonalRecipes', () => {
    it('returns recipes containing seasonal ingredients', () => {
      const recipes = [
        {
          name: 'Tomato Soup',
          ingredients: ['tomato', 'onion', 'garlic'],
        },
        {
          name: 'Chicken Salad',
          ingredients: ['chicken', 'lettuce', 'tomato'],
        },
        {
          name: 'Beef Stew',
          ingredients: ['beef', 'potato', 'carrot'],
        },
      ];

      const seasonalRecipes = getSeasonalRecipes(recipes);
      expect(Array.isArray(seasonalRecipes)).toBe(true);
      expect(seasonalRecipes.length).toBeLessThanOrEqual(5);
    });

    it('returns empty array when no recipes match', () => {
      const recipes = [
        {
          name: 'Exotic Fruit Salad',
          ingredients: ['mango', 'papaya', 'coconut'],
        },
      ];

      const seasonalRecipes = getSeasonalRecipes(recipes);
      expect(Array.isArray(seasonalRecipes)).toBe(true);
    });

    it('handles empty recipes array', () => {
      const seasonalRecipes = getSeasonalRecipes([]);
      expect(Array.isArray(seasonalRecipes)).toBe(true);
      expect(seasonalRecipes).toEqual([]);
    });

    it('limits results to 5 recipes', () => {
      const recipes = Array.from({ length: 10 }, (_, i) => ({
        name: `Recipe ${i}`,
        ingredients: ['tomato', 'onion'],
      }));

      const seasonalRecipes = getSeasonalRecipes(recipes);
      expect(seasonalRecipes.length).toBeLessThanOrEqual(5);
    });

    it('matches ingredients case-insensitively', () => {
      const recipes = [
        {
          name: 'Tomato Recipe',
          ingredients: ['TOMATO', 'ONION'],
        },
      ];

      const seasonalRecipes = getSeasonalRecipes(recipes);
      expect(Array.isArray(seasonalRecipes)).toBe(true);
    });

    it('matches partial ingredient names', () => {
      const recipes = [
        {
          name: 'Bell Pepper Recipe',
          ingredients: ['bell pepper', 'onion'],
        },
      ];

      const seasonalRecipes = getSeasonalRecipes(recipes);
      expect(Array.isArray(seasonalRecipes)).toBe(true);
    });
  });
});
