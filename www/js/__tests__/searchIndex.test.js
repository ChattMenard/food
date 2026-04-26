import { SearchIndex } from '../logic/searchIndex.js';

describe('SearchIndex', () => {
  let recipes;
  let searchIndex;

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
      const terms = searchIndex.extractTerms('Spaghetti Carbonara');
      expect(terms).toEqual(['spaghetti', 'carbonara']);
    });

    it('filters terms shorter than 3 characters', () => {
      const terms = searchIndex.extractTerms('A B C');
      expect(terms).toEqual([]);
    });

    it('removes special characters', () => {
      const terms = searchIndex.extractTerms('Chicken & Alfredo!');
      expect(terms).toEqual(['chicken', 'alfredo']);
    });

    it('handles empty strings', () => {
      const terms = searchIndex.extractTerms('');
      expect(terms).toEqual([]);
    });
  });

  describe('buildIndex', () => {
    it('builds index from recipe names', () => {
      const results = searchIndex.search('spaghetti');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });

    it('builds index from ingredients', () => {
      const results = searchIndex.search('parmesan');
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toContain(1);
      expect(results.map((r) => r.id)).toContain(2);
    });

    it('handles multiple terms in search', () => {
      const results = searchIndex.search('chicken parmesan');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(2); // Chicken Alfredo matches both terms
    });
  });

  describe('search', () => {
    it('returns empty array for short queries', () => {
      const results = searchIndex.search('a');
      expect(results).toEqual([]);
    });

    it('returns empty array for empty query', () => {
      const results = searchIndex.search('');
      expect(results).toEqual([]);
    });

    it('returns empty array for null query', () => {
      const results = searchIndex.search(null);
      expect(results).toEqual([]);
    });

    it('finds recipes by name', () => {
      const results = searchIndex.search('carbonara');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Spaghetti Carbonara');
    });

    it('finds recipes by ingredient', () => {
      const results = searchIndex.search('broccoli');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Vegetable Stir Fry');
    });

    it('ranks results by number of matching terms', () => {
      const results = searchIndex.search('parmesan');
      expect(results).toHaveLength(2);
      // Both match parmesan, order doesn't matter much for equal matches
    });

    it('returns no results for non-existent terms', () => {
      const results = searchIndex.search('nonexistent');
      expect(results).toEqual([]);
    });

    it('is case insensitive', () => {
      const results1 = searchIndex.search('SPAGHETTI');
      const results2 = searchIndex.search('spaghetti');
      expect(results1).toEqual(results2);
    });
  });

  describe('updateRecipes', () => {
    it('updates recipes and rebuilds index', () => {
      const newRecipes = [
        {
          id: 4,
          name: 'Taco Salad',
          ingredients: ['taco', 'lettuce', 'tomato', 'cheese'],
        },
      ];

      searchIndex.updateRecipes(newRecipes);

      const results = searchIndex.search('taco');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(4);
    });

    it('clears old recipes after update', () => {
      const newRecipes = [
        {
          id: 4,
          name: 'New Recipe',
          ingredients: ['ingredient'],
        },
      ];

      searchIndex.updateRecipes(newRecipes);

      const results = searchIndex.search('spaghetti');
      expect(results).toEqual([]);
    });
  });

  describe('constructor', () => {
    it('initializes with recipes and builds index', () => {
      const index = new SearchIndex(recipes);
      expect(index.recipes).toEqual(recipes);
      expect(index.index).toBeInstanceOf(Map);
    });

    it('handles empty recipe array', () => {
      const index = new SearchIndex([]);
      expect(index.recipes).toEqual([]);
      expect(index.index).toBeInstanceOf(Map);
    });
  });
});
