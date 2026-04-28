// @ts-check
import { SearchIndex } from '../logic/searchIndex';

describe('SearchIndex', () => {
  let recipes: any[];
  let searchIndex: SearchIndex;

  beforeEach(() => {
    recipes = [
      {
        id: 1,
        name: 'Spaghetti Carbonara',
        ingredients: ['spaghetti', 'eggs', 'bacon', 'parmesan'],
      },
      {
        id: 2,
        name: 'Chicken Alfredo',
        ingredients: ['chicken', 'fettuccine', 'cream', 'parmesan'],
      },
      {
        id: 3,
        name: 'Vegetable Stir Fry',
        ingredients: ['broccoli', 'carrots', 'soy sauce', 'rice'],
      },
    ];
    searchIndex = new SearchIndex(recipes);
  });

  describe('extractTerms', () => {
    it('extracts terms from text', () => {
      const terms = (searchIndex as any).extractTerms('Spaghetti Carbonara');
      expect(terms).toEqual(['spaghetti', 'carbonara']);
    });

    it('filters terms shorter than 3 characters', () => {
      const terms = (searchIndex as any).extractTerms('A B C');
      expect(terms).toEqual([]);
    });

    it('removes special characters', () => {
      const terms = (searchIndex as any).extractTerms('Chicken & Alfredo!');
      expect(terms).toEqual(['chicken', 'alfredo']);
    });

    it('handles empty strings', () => {
      const terms = (searchIndex as any).extractTerms('');
      expect(terms).toEqual([]);
    });

    it('handles null input', () => {
      const terms = (searchIndex as any).extractTerms(null as any);
      expect(terms).toEqual([]);
    });

    it('deduplicates terms', () => {
      const terms = (searchIndex as any).extractTerms('Chicken Chicken Alfredo');
      expect(terms).toEqual(['chicken', 'alfredo']);
    });
  });

  describe('buildIndex', () => {
    it('builds inverted index', () => {
      const index = (searchIndex as any).buildIndex(recipes);
      
      expect(index).toHaveProperty('spaghetti');
      expect(index).toHaveProperty('chicken');
      expect(index).toHaveProperty('vegetable');
      
      expect(index.spaghetti).toContain(1);
      expect(index.chicken).toContain(2);
      expect(index.vegetable).toContain(3);
    });

    it('handles empty recipe list', () => {
      const index = (searchIndex as any).buildIndex([]);
      expect(Object.keys(index)).toHaveLength(0);
    });

    it('indexes both names and ingredients', () => {
      const index = (searchIndex as any).buildIndex(recipes);
      
      expect(index.carbonara).toContain(1);
      expect(index.alfredo).toContain(2);
      expect(index.broccoli).toContain(3);
    });
  });

  describe('search', () => {
    it('finds recipes by name', () => {
      const results = searchIndex.search('spaghetti');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
      expect(results[0].name).toBe('Spaghetti Carbonara');
    });

    it('finds recipes by ingredient', () => {
      const results = searchIndex.search('chicken');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(2);
      expect(results[0].name).toBe('Chicken Alfredo');
    });

    it('finds multiple matching recipes', () => {
      const results = searchIndex.search('parmesan');
      
      expect(results).toHaveLength(2);
      expect(results.map((r: any) => r.id)).toContain(1);
      expect(results.map((r: any) => r.id)).toContain(2);
    });

    it('returns empty for no matches', () => {
      const results = searchIndex.search('beef');
      
      expect(results).toEqual([]);
    });

    it('handles partial matches', () => {
      const results = searchIndex.search('spagh');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('is case insensitive', () => {
      const results1 = searchIndex.search('CHICKEN');
      const results2 = searchIndex.search('chicken');
      
      expect(results1).toEqual(results2);
    });

    it('handles multi-term searches', () => {
      const results = searchIndex.search('chicken parmesan');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(2);
    });

    it('ranks results by relevance', () => {
      const results = searchIndex.search('chicken alfredo');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('score');
      expect(results[0].score).toBeGreaterThan(0);
    });
  });

  describe('searchWithFilters', () => {
    it('filters by ingredient', () => {
      const results = searchIndex.searchWithFilters('parmesan', {
        ingredients: ['parmesan']
      });
      
      expect(results).toHaveLength(2);
    });

    it('filters by multiple ingredients', () => {
      const results = searchIndex.searchWithFilters('', {
        ingredients: ['parmesan', 'chicken']
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(2);
    });

    it('combines search and filters', () => {
      const results = searchIndex.searchWithFilters('chicken', {
        ingredients: ['parmesan']
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(2);
    });

    it('returns empty when filters dont match', () => {
      const results = searchIndex.searchWithFilters('', {
        ingredients: ['beef']
      });
      
      expect(results).toEqual([]);
    });
  });

  describe('suggest', () => {
    it('suggests terms based on input', () => {
      const suggestions = searchIndex.suggest('spag');
      
      expect(suggestions).toContain('spaghetti');
    });

    it('limits number of suggestions', () => {
      const suggestions = searchIndex.suggest('c', 2);
      
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('returns empty for no matches', () => {
      const suggestions = searchIndex.suggest('xyz');
      
      expect(suggestions).toEqual([]);
    });

    it('handles empty input', () => {
      const suggestions = searchIndex.suggest('');
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('returns index statistics', () => {
      const stats = searchIndex.getStatistics();
      
      expect(stats).toHaveProperty('totalRecipes');
      expect(stats).toHaveProperty('totalTerms');
      expect(stats).toHaveProperty('averageTermsPerRecipe');
      
      expect(stats.totalRecipes).toBe(3);
      expect(stats.totalTerms).toBeGreaterThan(0);
    });

    it('calculates average terms correctly', () => {
      const stats = searchIndex.getStatistics();
      
      expect(typeof stats.averageTermsPerRecipe).toBe('number');
      expect(stats.averageTermsPerRecipe).toBeGreaterThan(0);
    });
  });

  describe('updateIndex', () => {
    it('adds new recipe to index', () => {
      const newRecipe = {
        id: 4,
        name: 'Beef Tacos',
        ingredients: ['beef', 'tortillas', 'cheese']
      };

      searchIndex.updateIndex([newRecipe]);
      
      const results = searchIndex.search('beef');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(4);
    });

    it('removes recipe from index', () => {
      searchIndex.updateIndex([], [1]);
      
      const results = searchIndex.search('spaghetti');
      expect(results).toEqual([]);
    });

    it('updates existing recipe', () => {
      const updatedRecipe = {
        id: 1,
        name: 'Updated Spaghetti',
        ingredients: ['spaghetti', 'tomato sauce']
      };

      searchIndex.updateIndex([updatedRecipe]);
      
      const results = searchIndex.search('carbonara');
      expect(results).toEqual([]);
      
      const sauceResults = searchIndex.search('tomato');
      expect(sauceResults).toHaveLength(1);
    });

    it('handles multiple updates', () => {
      const newRecipes = [
        { id: 4, name: 'Pizza', ingredients: ['dough', 'cheese'] },
        { id: 5, name: 'Salad', ingredients: ['lettuce', 'tomatoes'] }
      ];

      searchIndex.updateIndex(newRecipes, [2, 3]);
      
      expect(searchIndex.search('chicken')).toEqual([]);
      expect(searchIndex.search('pizza')).toHaveLength(1);
      expect(searchIndex.search('salad')).toHaveLength(1);
    });
  });

  describe('performance', () => {
    it('handles large recipe sets efficiently', () => {
      const largeRecipes = [];
      
      for (let i = 0; i < 1000; i++) {
        largeRecipes.push({
          id: i,
          name: `Recipe ${i}`,
          ingredients: [`ingredient${i}`, `common${i % 10}`]
        });
      }

      const startTime = Date.now();
      const largeIndex = new SearchIndex(largeRecipes);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(largeIndex.getStatistics().totalRecipes).toBe(1000);
    });

    it('performs fast searches', () => {
      const startTime = Date.now();
      searchIndex.search('chicken');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
    });
  });

  describe('edge cases', () => {
    it('handles recipes with missing properties', () => {
      const invalidRecipes = [
        { id: 1, name: 'Recipe 1' },
        { id: 2, ingredients: ['ingredient'] },
        { id: 3 },
        null,
        undefined
      ];

      expect(() => new SearchIndex(invalidRecipes as any)).not.toThrow();
    });

    it('handles special characters in search', () => {
      const results = searchIndex.search('spaghetti-carbonara');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('handles unicode characters', () => {
      const unicodeRecipes = [
        { id: 1, name: 'Crêpes', ingredients: ['flour', 'milk'] },
        { id: 2, name: 'Sushi', ingredients: ['rice', 'fish'] }
      ];

      const unicodeIndex = new SearchIndex(unicodeRecipes);
      const results = unicodeIndex.search('crêpes');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('handles very long search terms', () => {
      const longTerm = 'a'.repeat(1000);
      const results = searchIndex.search(longTerm);
      
      expect(results).toEqual([]);
    });

    it('handles numbers in search', () => {
      const numberedRecipes = [
        { id: 1, name: 'Recipe 123', ingredients: ['ingredient'] }
      ];

      const numberedIndex = new SearchIndex(numberedRecipes);
      const results = numberedIndex.search('123');
      
      expect(results).toHaveLength(1);
    });
  });

  describe('index persistence', () => {
    it('serializes index to JSON', () => {
      const serialized = searchIndex.serialize();
      
      expect(typeof serialized).toBe('string');
      
      const parsed = JSON.parse(serialized);
      expect(parsed).toHaveProperty('index');
      expect(parsed).toHaveProperty('recipes');
    });

    it('deserializes index from JSON', () => {
      const serialized = searchIndex.serialize();
      const restored = SearchIndex.deserialize(serialized);
      
      expect(restored).toBeInstanceOf(SearchIndex);
      
      const results = restored.search('spaghetti');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('handles corrupted serialized data', () => {
      expect(() => SearchIndex.deserialize('invalid-json')).toThrow();
    });
  });

  describe('advanced search features', () => {
    it('supports fuzzy matching', () => {
      const results = searchIndex.search('spagetti'); // Misspelled
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('supports phrase search', () => {
      const results = searchIndex.search('"spaghetti carbonara"');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('supports exclusion terms', () => {
      const results = searchIndex.search('parmesan -chicken');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('supports field-specific search', () => {
      const results = searchIndex.search('name:spaghetti');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });
  });
});
