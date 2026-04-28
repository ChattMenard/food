// @ts-check
import { IngredientVectors } from '../logic/ingredientVectors';

describe('IngredientVectors', () => {
  let recipes: any[];
  let vectors: IngredientVectors;

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
      expect((vectors as any).vocabulary).toContain('pasta');
      expect((vectors as any).vocabulary).toContain('eggs');
      expect((vectors as any).vocabulary).toContain('bacon');
    });

    it('should build vectors for each recipe', () => {
      expect((vectors as any).vectors.has('Pasta Carbonara')).toBe(true);
      expect((vectors as any).vectors.has('Bacon Egg Sandwich')).toBe(true);
    });
  });

  describe('tokenize', () => {
    it('should lowercase and remove non-alphanumeric', () => {
      const tokens = (vectors as any).tokenize('Extra-Virgin Olive Oil');
      expect(tokens).toContain('extra');
      expect(tokens).toContain('virgin');
      expect(tokens).toContain('olive');
      expect(tokens).toContain('oil');
      expect(tokens).not.toContain('-');
    });

    it('should handle empty string', () => {
      const tokens = (vectors as any).tokenize('');
      expect(tokens).toEqual([]);
    });

    it('should handle null input', () => {
      const tokens = (vectors as any).tokenize(null as any);
      expect(tokens).toEqual([]);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate cosine similarity between recipes', () => {
      const similarity = vectors.calculateSimilarity('Pasta Carbonara', 'Bacon Egg Sandwich');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should return 1 for identical recipes', () => {
      const similarity = vectors.calculateSimilarity('Pasta Carbonara', 'Pasta Carbonara');
      expect(similarity).toBe(1);
    });

    it('should return 0 for recipes with no shared ingredients', () => {
      const similarity = vectors.calculateSimilarity('Pasta Carbonara', 'Egg Salad');
      expect(similarity).toBe(0);
    });

    it('should handle non-existent recipes', () => {
      const similarity = vectors.calculateSimilarity('Non-existent', 'Pasta Carbonara');
      expect(similarity).toBe(0);
    });
  });

  describe('findSimilarRecipes', () => {
    it('should find recipes similar to target recipe', () => {
      const similar = vectors.findSimilarRecipes('Pasta Carbonara', 2);
      expect(similar).toHaveLength(2);
      expect(similar[0]).toHaveProperty('name');
      expect(similar[0]).toHaveProperty('similarity');
    });

    it('should return results sorted by similarity', () => {
      const similar = vectors.findSimilarRecipes('Pasta Carbonara', 3);
      for (let i = 1; i < similar.length; i++) {
        expect(similar[i-1].similarity).toBeGreaterThanOrEqual(similar[i].similarity);
      }
    });

    it('should limit results to requested count', () => {
      const similar = vectors.findSimilarRecipes('Pasta Carbonara', 1);
      expect(similar).toHaveLength(1);
    });

    it('should handle non-existent target recipe', () => {
      const similar = vectors.findSimilarRecipes('Non-existent', 3);
      expect(similar).toEqual([]);
    });
  });

  describe('getIngredientFrequency', () => {
    it('should return frequency of each ingredient', () => {
      const frequency = vectors.getIngredientFrequency();
      expect(frequency.pasta).toBe(2);
      expect(frequency.eggs).toBe(3);
      expect(frequency.bacon).toBe(2);
      expect(frequency.bread).toBe(1);
    });

    it('should include all ingredients from vocabulary', () => {
      const frequency = vectors.getIngredientFrequency();
      const vocabSize = (vectors as any).vocabulary.length;
      expect(Object.keys(frequency).length).toBe(vocabSize);
    });
  });

  describe('getRecipeVector', () => {
    it('should return vector for existing recipe', () => {
      const vector = vectors.getRecipeVector('Pasta Carbonara');
      expect(Array.isArray(vector)).toBe(true);
      expect(vector.length).toBe((vectors as any).vocabulary.length);
    });

    it('should return null for non-existent recipe', () => {
      const vector = vectors.getRecipeVector('Non-existent');
      expect(vector).toBeNull();
    });
  });

  describe('updateRecipes', () => {
    it('should add new recipes', () => {
      const newRecipes = [
        {
          name: 'New Recipe',
          ingredients: ['new ingredient', 'eggs']
        }
      ];

      vectors.updateRecipes(newRecipes);

      expect((vectors as any).vectors.has('New Recipe')).toBe(true);
      expect((vectors as any).vocabulary).toContain('new ingredient');
    });

    it('should update existing recipes', () => {
      const updatedRecipes = [
        {
          name: 'Pasta Carbonara',
          ingredients: ['pasta', 'eggs', 'new ingredient']
        }
      ];

      vectors.updateRecipes(updatedRecipes);

      const vector = vectors.getRecipeVector('Pasta Carbonara');
      expect(vector).toBeDefined();
      expect((vectors as any).vocabulary).toContain('new ingredient');
    });

    it('should handle empty recipe list', () => {
      vectors.updateRecipes([]);
      
      // Should not throw and should preserve existing data
      expect((vectors as any).vectors.size).toBeGreaterThan(0);
    });
  });

  describe('getVocabularySize', () => {
    it('should return size of vocabulary', () => {
      const size = vectors.getVocabularySize();
      expect(size).toBeGreaterThan(0);
      expect(size).toBe((vectors as any).vocabulary.length);
    });
  });

  describe('getRecipeCount', () => {
    it('should return number of recipes', () => {
      const count = vectors.getRecipeCount();
      expect(count).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('should handle recipes with no ingredients', () => {
      const emptyRecipes = [
        {
          name: 'Empty Recipe',
          ingredients: []
        }
      ];

      const emptyVectors = new IngredientVectors(emptyRecipes);
      
      expect(emptyVectors.getVocabularySize()).toBe(0);
      expect(emptyVectors.getRecipeCount()).toBe(1);
    });

    it('should handle duplicate ingredients in recipe', () => {
      const duplicateRecipes = [
        {
          name: 'Duplicate Recipe',
          ingredients: ['eggs', 'eggs', 'milk', 'milk']
        }
      ];

      const duplicateVectors = new IngredientVectors(duplicateRecipes);
      
      expect(duplicateVectors.getVocabularySize()).toBe(2);
      expect(duplicateVectors.getIngredientFrequency().eggs).toBe(1);
    });

    it('should handle ingredient name variations', () => {
      const variationRecipes = [
        {
          name: 'Variation Recipe',
          ingredients: ['Eggs', 'eggs', 'EGGS']
        }
      ];

      const variationVectors = new IngredientVectors(variationRecipes);
      
      expect(variationVectors.getVocabularySize()).toBe(1);
    });
  });

  describe('performance', () => {
    it('should handle large recipe sets efficiently', () => {
      const largeRecipes = [];
      
      for (let i = 0; i < 100; i++) {
        largeRecipes.push({
          name: `Recipe ${i}`,
          ingredients: [`ingredient${i}`, `common${i % 10}`]
        });
      }

      const startTime = Date.now();
      const largeVectors = new IngredientVectors(largeRecipes);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(largeVectors.getRecipeCount()).toBe(100);
    });

    it('should cache similarity calculations', () => {
      const similarity1 = vectors.calculateSimilarity('Pasta Carbonara', 'Bacon Egg Sandwich');
      const similarity2 = vectors.calculateSimilarity('Pasta Carbonara', 'Bacon Egg Sandwich');
      
      expect(similarity1).toBe(similarity2);
      // Second call should be faster due to caching
    });
  });
});
