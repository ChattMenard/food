// @ts-check
import {
  recipeHasAny,
  passesDiet,
  passesAllergy,
  getAllergensInRecipe,
  passesCuisine,
  normalizeCuisine,
} from '../utils/dietFilters';

describe('dietFilters', () => {
  const mockRecipe = {
    name: 'Chicken Pasta',
    ingredients: ['chicken', 'pasta', 'cream', 'parmesan'],
    category: 'Italian',
  };

  describe('recipeHasAny', () => {
    it('returns true if recipe contains any keyword', () => {
      const result = recipeHasAny(mockRecipe, ['chicken', 'beef']);
      expect(result).toBe(true);
    });

    it('returns false if recipe contains none of the keywords', () => {
      const result = recipeHasAny(mockRecipe, ['fish', 'shrimp']);
      expect(result).toBe(false);
    });

    it('handles empty keywords array', () => {
      const result = recipeHasAny(mockRecipe, []);
      expect(result).toBe(false);
    });

    it('is case sensitive for ingredient matching', () => {
      const result = recipeHasAny(mockRecipe, ['CHICKEN']);
      expect(result).toBe(false);
    });
  });

  describe('passesDiet', () => {
    it('returns true for empty diet restriction', () => {
      expect(passesDiet(mockRecipe, null as any)).toBe(true);
      expect(passesDiet(mockRecipe, 'none')).toBe(true);
      expect(passesDiet(mockRecipe, []) as any).toBe(true);
    });

    it('returns false for vegetarian with meat', () => {
      expect(passesDiet(mockRecipe, 'vegetarian')).toBe(false);
    });

    it('returns true for vegetarian with vegetables', () => {
      const vegRecipe = {
        name: 'Vegetable Soup',
        ingredients: ['carrots', 'celery', 'onions'],
        category: 'Soup',
      };
      expect(passesDiet(vegRecipe, 'vegetarian')).toBe(true);
    });

    it('returns false for vegan with dairy', () => {
      expect(passesDiet(mockRecipe, 'vegan')).toBe(false);
    });

    it('returns true for vegan with plant-based ingredients', () => {
      const veganRecipe = {
        name: 'Salad',
        ingredients: ['lettuce', 'tomatoes', 'cucumber'],
        category: 'Salad',
      };
      expect(passesDiet(veganRecipe, 'vegan')).toBe(true);
    });

    it('returns false for gluten-free with wheat', () => {
      const wheatRecipe = {
        name: 'Wheat Bread',
        ingredients: ['wheat flour', 'yeast', 'water'],
        category: 'Bread',
      };
      expect(passesDiet(wheatRecipe, 'gluten-free')).toBe(false);
    });

    it('returns true for gluten-free with rice', () => {
      const gfRecipe = {
        name: 'Rice Bowl',
        ingredients: ['rice', 'vegetables', 'soy sauce'],
        category: 'Bowl',
      };
      expect(passesDiet(gfRecipe, 'gluten-free')).toBe(true);
    });

    it('handles multiple diet restrictions', () => {
      expect(passesDiet(mockRecipe, ['vegetarian', 'vegan'])).toBe(false);
      expect(passesDiet(mockRecipe, ['vegetarian', 'pescatarian'])).toBe(false);
    });

    it('returns true if recipe passes any of multiple restrictions', () => {
      const vegRecipe = {
        name: 'Vegetable Pasta',
        ingredients: ['pasta', 'tomatoes', 'basil'],
        category: 'Italian',
      };
      expect(passesDiet(vegRecipe, ['vegetarian', 'vegan'])).toBe(true);
    });
  });

  describe('passesAllergy', () => {
    it('returns true for no allergies', () => {
      expect(passesAllergy(mockRecipe, null as any)).toBe(true);
      expect(passesAllergy(mockRecipe, [])).toBe(true);
    });

    it('returns false if recipe contains allergen', () => {
      expect(passesAllergy(mockRecipe, ['dairy'])).toBe(false);
    });

    it('returns true if recipe does not contain allergen', () => {
      expect(passesAllergy(mockRecipe, ['nuts'])).toBe(true);
    });

    it('handles multiple allergens', () => {
      expect(passesAllergy(mockRecipe, ['nuts', 'dairy'])).toBe(false);
      expect(passesAllergy(mockRecipe, ['nuts', 'fish'])).toBe(true);
    });

    it('checks for common allergen ingredients', () => {
      const nutRecipe = {
        name: 'Nut Cake',
        ingredients: ['almonds', 'flour', 'sugar'],
        category: 'Dessert',
      };
      expect(passesAllergy(nutRecipe, ['nuts'])).toBe(false);
    });

    it('handles case insensitive allergen matching', () => {
      expect(passesAllergy(mockRecipe, ['DAIRY'])).toBe(false);
    });
  });

  describe('getAllergensInRecipe', () => {
    it('returns empty array for recipe with no allergens', () => {
      const safeRecipe = {
        name: 'Simple Rice',
        ingredients: ['rice', 'water', 'salt'],
        category: 'Side',
      };
      const allergens = getAllergensInRecipe(safeRecipe, ['nuts', 'fish']);
      expect(allergens).toEqual([]);
    });

    it('returns allergens found in recipe', () => {
      const allergens = getAllergensInRecipe(mockRecipe, ['dairy', 'nuts']);
      expect(allergens).toContain('dairy');
    });

    it('returns multiple allergens if present', () => {
      const multiRecipe = {
        name: 'Complex Dish',
        ingredients: ['milk', 'almonds', 'wheat', 'eggs'],
        category: 'Main',
      };
      const allergens = getAllergensInRecipe(multiRecipe, ['dairy', 'nuts', 'gluten']);
      expect(allergens).toContain('dairy');
      expect(allergens).toContain('nuts');
      expect(allergens).toContain('gluten');
    });

    it('handles empty allergen list', () => {
      const allergens = getAllergensInRecipe(mockRecipe, []);
      expect(allergens).toEqual([]);
    });
  });

  describe('passesCuisine', () => {
    it('returns true for empty cuisine filter', () => {
      expect(passesCuisine(mockRecipe, null as any)).toBe(true);
      expect(passesCuisine(mockRecipe, '')).toBe(true);
    });

    it('returns true for matching cuisine', () => {
      expect(passesCuisine(mockRecipe, 'italian')).toBe(true);
    });

    it('returns false for non-matching cuisine', () => {
      expect(passesCuisine(mockRecipe, 'mexican')).toBe(false);
    });

    it('handles case insensitive cuisine matching', () => {
      expect(passesCuisine(mockRecipe, 'ITALIAN')).toBe(true);
    });

    it('checks recipe name for cuisine if category not set', () => {
      const recipeWithoutCategory = {
        name: 'Mexican Tacos',
        ingredients: ['tortillas', 'beef', 'cheese'],
        category: '',
      };
      expect(passesCuisine(recipeWithoutCategory, 'mexican')).toBe(true);
    });

    it('handles multiple cuisine filters', () => {
      expect(passesCuisine(mockRecipe, ['italian', 'mexican'])).toBe(true);
      expect(passesCuisine(mockRecipe, ['mexican', 'thai'])).toBe(false);
    });
  });

  describe('normalizeCuisine', () => {
    it('lowercases cuisine names', () => {
      expect(normalizeCuisine('ITALIAN')).toBe('italian');
      expect(normalizeCuisine('Mexican')).toBe('mexican');
    });

    it('handles null/undefined input', () => {
      expect(normalizeCuisine(null as any)).toBe('other');
      expect(normalizeCuisine(undefined as any)).toBe('other');
    });

    it('handles empty string', () => {
      expect(normalizeCuisine('')).toBe('other');
    });

    it('maps common cuisine variations', () => {
      expect(normalizeCuisine('Chinese')).toBe('chinese');
      expect(normalizeCuisine('Japanese')).toBe('japanese');
      expect(normalizeCuisine('Indian')).toBe('indian');
    });

    it('returns other for unknown cuisines', () => {
      expect(normalizeCuisine('Unknown')).toBe('other');
      expect(normalizeCuisine('Random')).toBe('other');
    });

    it('handles whitespace', () => {
      expect(normalizeCuisine('  Italian  ')).toBe('italian');
      expect(normalizeCuisine(' Mexican ')).toBe('mexican');
    });
  });

  describe('edge cases', () => {
    it('handles recipe with missing properties', () => {
      const incompleteRecipe = {
        name: 'Test Recipe',
        // missing ingredients and category
      };
      
      expect(recipeHasAny(incompleteRecipe as any, ['test'])).toBe(false);
      expect(passesDiet(incompleteRecipe as any, 'vegetarian')).toBe(true);
      expect(passesAllergy(incompleteRecipe as any, ['nuts'])).toBe(true);
      expect(passesCuisine(incompleteRecipe as any, 'italian')).toBe(false);
    });

    it('handles recipe with empty ingredients', () => {
      const emptyRecipe = {
        name: 'Empty Recipe',
        ingredients: [],
        category: 'Test',
      };
      
      expect(recipeHasAny(emptyRecipe, ['test'])).toBe(false);
      expect(passesDiet(emptyRecipe, 'vegetarian')).toBe(true);
    });

    it('handles recipe with null ingredients', () => {
      const nullRecipe = {
        name: 'Null Recipe',
        ingredients: null as any,
        category: 'Test',
      };
      
      expect(recipeHasAny(nullRecipe, ['test'])).toBe(false);
      expect(passesDiet(nullRecipe, 'vegetarian')).toBe(true);
    });
  });
});
