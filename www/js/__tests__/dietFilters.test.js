import {
  recipeHasAny,
  passesDiet,
  passesAllergy,
  getAllergensInRecipe,
  passesCuisine,
  normalizeCuisine
} from '../utils/dietFilters.js';

describe('dietFilters', () => {
  const mockRecipe = {
    name: 'Chicken Pasta',
    ingredients: ['chicken', 'pasta', 'cream', 'parmesan'],
    category: 'Italian'
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
      expect(passesDiet(mockRecipe, null)).toBe(true);
      expect(passesDiet(mockRecipe, 'none')).toBe(true);
      expect(passesDiet(mockRecipe, [])).toBe(true);
    });

    it('returns false for vegetarian with meat', () => {
      expect(passesDiet(mockRecipe, 'vegetarian')).toBe(false);
    });

    it('returns true for vegetarian without meat', () => {
      const vegRecipe = {
        ...mockRecipe,
        ingredients: ['pasta', 'cream', 'parmesan']
      };
      expect(passesDiet(vegRecipe, 'vegetarian')).toBe(true);
    });

    it('returns false for vegan with dairy', () => {
      expect(passesDiet(mockRecipe, 'vegan')).toBe(false);
    });

    it('returns true for vegan without animal products', () => {
      const veganRecipe = {
        ...mockRecipe,
        ingredients: ['pasta', 'tomato', 'basil']
      };
      expect(passesDiet(veganRecipe, 'vegan')).toBe(true);
    });

    it('returns false for gluten-free with gluten', () => {
      expect(passesDiet(mockRecipe, 'gluten-free')).toBe(false);
    });

    it('returns true for gluten-free without gluten', () => {
      const gfRecipe = {
        ...mockRecipe,
        ingredients: ['rice', 'vegetables', 'soy sauce']
      };
      expect(passesDiet(gfRecipe, 'gluten-free')).toBe(true);
    });

    it('handles array of diet restrictions', () => {
      const result = passesDiet(mockRecipe, ['vegetarian', 'gluten-free']);
      expect(result).toBe(false);
    });

    it('returns true for all restrictions when recipe complies', () => {
      const compliantRecipe = {
        ...mockRecipe,
        ingredients: ['rice', 'vegetables']
      };
      const result = passesDiet(compliantRecipe, ['vegetarian', 'gluten-free']);
      expect(result).toBe(true);
    });
  });

  describe('passesAllergy', () => {
    it('returns true for no allergy specified', () => {
      expect(passesAllergy(mockRecipe, null)).toBe(true);
      expect(passesAllergy(mockRecipe, 'none')).toBe(true);
    });

    it('returns false if recipe contains allergen', () => {
      expect(passesAllergy(mockRecipe, 'dairy')).toBe(false);
    });

    it('returns true if recipe does not contain allergen', () => {
      expect(passesAllergy(mockRecipe, 'nuts')).toBe(true);
    });

    it('handles unknown allergy types', () => {
      expect(passesAllergy(mockRecipe, 'unknown')).toBe(true);
    });
  });

  describe('getAllergensInRecipe', () => {
    it('returns empty array for no allergies', () => {
      const result = getAllergensInRecipe(mockRecipe, null);
      expect(result).toEqual([]);
    });

    it('returns empty array for empty allergies list', () => {
      const result = getAllergensInRecipe(mockRecipe, []);
      expect(result).toEqual([]);
    });

    it('returns found allergens', () => {
      const result = getAllergensInRecipe(mockRecipe, ['dairy', 'nuts']);
      expect(result).toEqual(['dairy']);
    });

    it('returns multiple allergens if present', () => {
      const recipeWithMultiple = {
        ...mockRecipe,
        ingredients: ['chicken', 'pasta', 'milk', 'almonds']
      };
      const result = getAllergensInRecipe(recipeWithMultiple, ['dairy', 'nuts']);
      expect(result).toEqual(['dairy', 'nuts']);
    });

    it('returns empty array if no allergens found', () => {
      const result = getAllergensInRecipe(mockRecipe, ['nuts', 'soy']);
      expect(result).toEqual([]);
    });
  });

  describe('passesCuisine', () => {
    it('returns true for no cuisine filter', () => {
      expect(passesCuisine(mockRecipe, null)).toBe(true);
      expect(passesCuisine(mockRecipe, 'all')).toBe(true);
    });

    it('returns true if recipe name matches cuisine', () => {
      expect(passesCuisine(mockRecipe, 'italian')).toBe(true);
    });

    it('returns true if recipe category matches cuisine', () => {
      expect(passesCuisine(mockRecipe, 'italian')).toBe(true);
    });

    it('returns false if cuisine does not match', () => {
      expect(passesCuisine(mockRecipe, 'mexican')).toBe(false);
    });

    it('handles hyphenated cuisine names', () => {
      expect(passesCuisine(mockRecipe, 'middle-eastern')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(passesCuisine(mockRecipe, 'ITALIAN')).toBe(true);
    });
  });

  describe('normalizeCuisine', () => {
    it('returns "other" for null or undefined', () => {
      expect(normalizeCuisine(null)).toBe('other');
      expect(normalizeCuisine(undefined)).toBe('other');
    });

    it('normalizes italian variations', () => {
      expect(normalizeCuisine('Italian')).toBe('italian');
      expect(normalizeCuisine('pizza')).toBe('italian');
      expect(normalizeCuisine('PASTA')).toBe('italian');
    });

    it('normalizes mexican variations', () => {
      expect(normalizeCuisine('Mexican')).toBe('mexican');
      expect(normalizeCuisine('taco')).toBe('mexican');
      expect(normalizeCuisine('burrito')).toBe('mexican');
    });

    it('normalizes asian variations', () => {
      expect(normalizeCuisine('Asian')).toBe('asian');
      expect(normalizeCuisine('chinese')).toBe('asian');
      expect(normalizeCuisine('japanese')).toBe('asian');
      expect(normalizeCuisine('thai')).toBe('asian');
      expect(normalizeCuisine('indian')).toBe('asian');
    });

    it('normalizes american variations', () => {
      expect(normalizeCuisine('American')).toBe('american');
      expect(normalizeCuisine('burger')).toBe('american');
      expect(normalizeCuisine('bbq')).toBe('american');
    });

    it('normalizes mediterranean variations', () => {
      expect(normalizeCuisine('Mediterranean')).toBe('mediterranean');
      expect(normalizeCuisine('greek')).toBe('mediterranean');
    });

    it('normalizes middle eastern variations', () => {
      expect(normalizeCuisine('middle eastern')).toBe('middle-eastern');
      expect(normalizeCuisine('middleeastern')).toBe('middle-eastern');
    });

    it('returns lowercase trimmed version for unknown cuisines', () => {
      expect(normalizeCuisine('  French  ')).toBe('french');
      expect(normalizeCuisine('Spanish')).toBe('spanish');
    });
  });
});
