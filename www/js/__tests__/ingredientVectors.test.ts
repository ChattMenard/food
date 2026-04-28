// @ts-check
import { IngredientVectors } from '../logic/ingredientVectors.js;

describe('IngredientVectors', () => {
  let recipes;
  let vectors;

  beforeEach(() => {
    recipes = [
      {
        name: 'Pasta Carbonara',
        ingredients: [
          'pasta',
          'eggs',
          'bacon',
          'parmesan cheese',
          'black pepper',
        ],
      },
      {
        name: 'Bacon Egg Sandwich',
        ingredients: ['bread', 'bacon', 'eggs', 'butter'],
      },
      {
        name: 'Cheese Pasta',
        ingredients: ['pasta', 'cheddar cheese', 'milk', 'butter'],
      },
      {
        name: 'Egg Salad',
        ingredients: ['eggs', 'mayonnaise', 'mustard', 'lettuce'],
      },
    ];
    vectors = new IngredientVectors(recipes);
  });

  describe('constructor', () => {
    it('should build vocabulary from recipes', () => {
      expect(vectors.vocabulary).toContain('pasta');
      expect(vectors.vocabulary).toContain('eggs');
      expect(vectors.vocabulary).toContain('bacon');
    });

    it('should build vectors for each recipe', () => {
      expect(vectors.vectors.has('Pasta Carbonara')).toBe(true);
      expect(vectors.vectors.has('Bacon Egg Sandwich')).toBe(true);
    });
  });

  describe('tokenize', () => {
    it('should lowercase and remove non-alphanumeric', () => {
      const tokens = vectors.tokenize('Pasta with Eggs!');
      expect(tokens).toEqual(['pasta', 'with', 'eggs']);
    });

    it('should filter short terms', () => {
      const tokens = vectors.tokenize('a an the of in to');
      expect(tokens).toEqual(['the']);
    });

    it('should handle multiple spaces', () => {
      const tokens = vectors.tokenize('pasta  eggs   bacon');
      expect(tokens).toEqual(['pasta', 'eggs', 'bacon']);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec1 = new Map([
        ['pasta', 2],
        ['eggs', 1],
      ]);
      const vec2 = new Map([
        ['pasta', 2],
        ['eggs', 1],
      ]);
      const similarity = vectors.cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = new Map([['pasta', 1]]);
      const vec2 = new Map([['eggs', 1]]);
      const similarity = vectors.cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0);
    });

    it('should return positive similarity for overlapping vectors', () => {
      const vec1 = new Map([
        ['pasta', 2],
        ['eggs', 1],
      ]);
      const vec2 = new Map([
        ['pasta', 1],
        ['bacon', 2],
      ]);
      const similarity = vectors.cosineSimilarity(vec1, vec2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });

  describe('findSimilarRecipes', () => {
    it('should find recipes with similar ingredients', () => {
      const similar = vectors.findSimilarRecipes('Pasta Carbonara', 2);
      expect(similar).toContain('Cheese Pasta');
      expect(similar.length).toBeLessThanOrEqual(2);
    });

    it('should not return the same recipe', () => {
      const similar = vectors.findSimilarRecipes('Pasta Carbonara', 5);
      expect(similar).not.toContain('Pasta Carbonara');
    });

    it('should return empty array for unknown recipe', () => {
      const similar = vectors.findSimilarRecipes('Unknown Recipe', 5);
      expect(similar).toEqual([]);
    });

    it('should respect limit parameter', () => {
      const similar = vectors.findSimilarRecipes('Pasta Carbonara', 1);
      expect(similar.length).toBeLessThanOrEqual(1);
    });
  });

  describe('updateRecipes', () => {
    it('should rebuild vocabulary and vectors', () => {
      const newRecipes = [
        { name: 'New Recipe', ingredients: ['rice', 'beans'] },
      ];
      vectors.updateRecipes(newRecipes);

      expect(vectors.vocabulary).toContain('rice');
      expect(vectors.vocabulary).toContain('beans');
      expect(vectors.vectors.has('New Recipe')).toBe(true);
    });
  });
});
