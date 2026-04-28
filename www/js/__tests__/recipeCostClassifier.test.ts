// @ts-check
/**
 * Recipe Cost Classifier Tests
 * Tests for C/N/F recipe classification logic
 */

import recipeCostClassifier, { RecipeCostClassifier, INGREDIENT_TIERS, FANCY_TECHNIQUES } from '../features/plan/recipeCostClassifier.js';

describe('RecipeCostClassifier', () => {
  let classifier: RecipeCostClassifier;

  beforeEach(() => {
    classifier = new RecipeCostClassifier();
  });

  describe('ingredient tier lookup', () => {
    it('should classify cheap ingredients correctly', () => {
      expect(classifier.getIngredientTier('rice')).toBe('C');
      expect(classifier.getIngredientTier('pasta')).toBe('C');
      expect(classifier.getIngredientTier('beans')).toBe('C');
      expect(classifier.getIngredientTier('onions')).toBe('C');
      expect(classifier.getIngredientTier('eggs')).toBe('C');
    });

    it('should classify normal ingredients correctly', () => {
      expect(classifier.getIngredientTier('chicken breast')).toBe('N');
      expect(classifier.getIngredientTier('ground beef')).toBe('N');
      expect(classifier.getIngredientTier('cheese')).toBe('N');
      expect(classifier.getIngredientTier('broccoli')).toBe('N');
      expect(classifier.getIngredientTier('apples')).toBe('N');
    });

    it('should classify fancy ingredients correctly', () => {
      expect(classifier.getIngredientTier('saffron')).toBe('F');
      expect(classifier.getIngredientTier('lobster')).toBe('F');
      expect(classifier.getIngredientTier('truffle')).toBe('F');
      expect(classifier.getIngredientTier('caviar')).toBe('F');
      expect(classifier.getIngredientTier('prosciutto')).toBe('F');
    });

    it('should default unlisted ingredients to Normal', () => {
      expect(classifier.getIngredientTier('exotic fruit')).toBe('N');
      expect(classifier.getIngredientTier('unknown spice')).toBe('N');
    });

    it('should handle ingredient normalization', () => {
      expect(classifier.getIngredientTier('RICE')).toBe('C');
      expect(classifier.getIngredientTier('  pasta  ')).toBe('C');
      expect(classifier.getIngredientTier('Chicken Breast!')).toBe('N');
    });
  });

  describe('fancy technique detection', () => {
    it('should detect fancy techniques in instructions', () => {
      expect(classifier.hasFancyTechniques('Cook sous-vide for 2 hours')).toBe(true);
      expect(classifier.hasFancyTechniques('Flambe the bananas')).toBe(true);
      expect(classifier.hasFancyTechniques('Pipe the meringue')).toBe(true);
      expect(classifier.hasFancyTechniques('Temper the chocolate')).toBe(true);
    });

    it('should not detect fancy techniques in simple instructions', () => {
      expect(classifier.hasFancyTechniques('Bake at 350 degrees')).toBe(false);
      expect(classifier.hasFancyTechniques('Fry the onions')).toBe(false);
      expect(classifier.hasFancyTechniques('Mix ingredients together')).toBe(false);
    });

    it('should handle case insensitive detection', () => {
      expect(classifier.hasFancyTechniques('SOUS-VIDE cooking')).toBe(true);
      expect(classifier.hasFancyTechniques('FLAMBÉ the dessert')).toBe(true);
    });
  });

  describe('recipe classification logic', () => {
    it('should classify recipes with fancy ingredients as Fancy', () => {
      const recipe = {
        ingredients: ['rice', 'beans', 'saffron'],
        instructions: 'Cook rice and beans with saffron'
      };
      
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('F');
      expect(result.reasoning).toContain('Contains 1 fancy ingredient(s)');
    });

    it('should classify recipes with 2+ normal ingredients as Normal', () => {
      const recipe = {
        ingredients: ['chicken breast', 'broccoli', 'rice'],
        instructions: 'Bake chicken with vegetables'
      };
      
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('N');
      expect(result.reasoning).toContain('Contains 3 normal ingredients, no fancy ingredients');
    });

    it('should classify recipes with fewer than 2 normal ingredients as Cheap', () => {
      const recipe = {
        ingredients: ['rice', 'beans', 'onions'],
        instructions: 'Cook rice and beans'
      };
      
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('C');
      expect(result.reasoning).toContain('Contains 0 normal ingredient(s), no fancy ingredients');
    });

    it('should apply exception: 1 normal + many cheap → Cheap', () => {
      const recipe = {
        ingredients: ['rice', 'beans', 'onions', 'carrots', 'cabbage', 'potatoes', 'flour', 'oats', 'cornmeal', 'breadcrumbs', 'cheese'],
        instructions: 'Make a hearty stew'
      };
      
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('C');
      expect(result.reasoning).toContain('Exception: 1 normal ingredient with many cheap ingredients → Cheap (dominant cheap volume)');
    });

    it('should apply exception: 1 fancy + 0 normal → Fancy', () => {
      const recipe = {
        ingredients: ['rice', 'saffron'],
        instructions: 'Make saffron rice'
      };
      
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('F');
      expect(result.reasoning).toContain('Exception: Single premium ingredient → Fancy');
    });

    it('should apply exception: 10+ normal + 0 fancy → Normal', () => {
      const recipe = {
        ingredients: ['chicken breast', 'ground beef', 'pork', 'cheese', 'fish', 'broccoli', 'cauliflower', 'mushrooms', 'spinach', 'lettuce', 'bell peppers'],
        instructions: 'Make a varied dish'
      };
      
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('N');
      expect(result.reasoning).toContain('Exception: High variety but no premium items → Normal');
    });

    it('should upgrade to Fancy with fancy techniques', () => {
      const recipe = {
        ingredients: ['rice', 'beans', 'onions'],
        instructions: 'Cook sous-vide and then flambe the dish'
      };
      
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('F');
      expect(result.reasoning).toContain('Upgraded to Fancy due to fancy cooking techniques');
    });

    it('should flag recipes with unlisted ingredients for review', () => {
      const recipe = {
        ingredients: ['rice', 'exotic spice', 'unknown vegetable'],
        instructions: 'Cook with rare ingredients'
      };
      
      const result = classifier.classifyRecipe(recipe);
      expect(result.needsReview).toBe(true);
    });
  });

  describe('batch processing', () => {
    it('should classify multiple recipes', () => {
      const recipes = [
        {
          ingredients: ['rice', 'beans'],
          instructions: 'Simple dish'
        },
        {
          ingredients: ['chicken breast', 'broccoli'],
          instructions: 'Normal dish'
        },
        {
          ingredients: ['lobster', 'butter'],
          instructions: 'Fancy dish'
        }
      ];
      
      const results = classifier.batchClassify(recipes);
      expect(results).toHaveLength(3);
      expect(results[0].tier).toBe('C');
      expect(results[1].tier).toBe('N');
      expect(results[2].tier).toBe('F');
    });

    it('should provide classification statistics', () => {
      const recipes = [
        { ingredients: ['rice', 'beans'], instructions: 'Simple' },
        { ingredients: ['chicken breast', 'broccoli'], instructions: 'Normal' },
        { ingredients: ['chicken breast', 'rice'], instructions: 'Normal' },
        { ingredients: ['lobster', 'butter'], instructions: 'Fancy' }
      ];
      
      const stats = classifier.getClassificationStats(recipes);
      expect(stats.C).toBe(1);
      expect(stats.N).toBe(2);
      expect(stats.F).toBe(1);
      expect(stats.total).toBe(4);
    });
  });

  describe('caching and performance', () => {
    it('should cache ingredient lookups', () => {
      // First call
      const result1 = classifier.getIngredientTier('rice');
      // Second call should use cache
      const result2 = classifier.getIngredientTier('rice');
      
      expect(result1).toBe(result2);
    });

    it('should clear cache when requested', () => {
      classifier.getIngredientTier('rice');
      classifier.getIngredientTier('chicken breast');
      
      classifier.clearCache();
      
      // Should work fine after cache clear
      expect(classifier.getIngredientTier('rice')).toBe('C');
      expect(classifier.getIngredientTier('chicken breast')).toBe('N');
    });
  });

  describe('edge cases', () => {
    it('should handle empty recipe', () => {
      const recipe = { ingredients: [], instructions: '' };
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('C'); // No ingredients, defaults to Cheap
    });

    it('should handle null/undefined inputs', () => {
      const result = classifier.classifyRecipe({});
      expect(result.tier).toBe('C');
    });

    it('should handle recipe with only instructions', () => {
      const recipe = { ingredients: [], instructions: 'Cook sous-vide' };
      const result = classifier.classifyRecipe(recipe);
      expect(result.tier).toBe('F'); // Fancy technique upgrades
    });
  });
});

describe('INGREDIENT_TIERS constant', () => {
  it('should contain all expected categories', () => {
    expect(INGREDIENT_TIERS['rice']).toBe('C');
    expect(INGREDIENT_TIERS['chicken breast']).toBe('N');
    expect(INGREDIENT_TIERS['saffron']).toBe('F');
  });
});

describe('FANCY_TECHNIQUES constant', () => {
  it('should contain expected techniques', () => {
    expect(FANCY_TECHNIQUES).toContain('sous-vide');
    expect(FANCY_TECHNIQUES).toContain('flambe');
    expect(FANCY_TECHNIQUES).toContain('spherification');
  });
});
