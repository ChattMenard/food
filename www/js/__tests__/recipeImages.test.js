import {
  generateRecipeImageUrl,
  getFallbackImageUrl,
  preloadImage,
  generateImageOptions,
  addImagesToRecipes,
} from '../advanced/recipeImages.js';

describe('recipeImages', () => {
  describe('generateRecipeImageUrl', () => {
    it('generates URL with recipe name', () => {
      const url = generateRecipeImageUrl('Chicken Pasta');
      expect(url).toContain('source.unsplash.com');
      expect(url).toContain('400x300');
    });

    it('includes category in search terms', () => {
      const url = generateRecipeImageUrl('Pasta', 'Italian');
      expect(url).toContain('Italian');
    });

    it('uses custom width and height', () => {
      const url = generateRecipeImageUrl('Pasta', '', 600, 400);
      expect(url).toContain('600x400');
    });

    it('extracts food terms from recipe name', () => {
      const url = generateRecipeImageUrl('Grilled Salmon');
      expect(url).toContain('salmon');
    });

    it('falls back to food if no terms found', () => {
      const url = generateRecipeImageUrl('Something Delicious');
      expect(url).toContain('food');
      expect(url).toContain('recipe');
    });
  });

  describe('getFallbackImageUrl', () => {
    it('returns fallback URL with food query', () => {
      const url = getFallbackImageUrl();
      expect(url).toContain('source.unsplash.com');
      expect(url).toContain('food');
      expect(url).toContain('cooking');
    });

    it('uses custom dimensions', () => {
      const url = getFallbackImageUrl(800, 600);
      expect(url).toContain('800x600');
    });

    it('uses default dimensions', () => {
      const url = getFallbackImageUrl();
      expect(url).toContain('400x300');
    });
  });

  describe('preloadImage', () => {
    it('returns a Promise', () => {
      const promise = preloadImage('https://example.com/image.jpg');
      expect(promise).toBeInstanceOf(Promise);
    });

    it('resolves when image loads', async () => {
      // Mock Image constructor
      global.Image = class {
        constructor() {
          setTimeout(() => this.onload(), 0);
        }
      };

      const promise = preloadImage('https://example.com/image.jpg');
      await expect(promise).resolves.toBeDefined();
      delete global.Image;
    });

    it('rejects when image fails to load', async () => {
      global.Image = class {
        constructor() {
          setTimeout(() => this.onerror(new Error('Load failed')), 0);
        }
      };

      const promise = preloadImage('https://example.com/image.jpg');
      await expect(promise).rejects.toThrow();
      delete global.Image;
    });
  });

  describe('generateImageOptions', () => {
    it('generates multiple image options', () => {
      const options = generateImageOptions('Chicken Pasta', 'Italian', 3);
      expect(options).toHaveLength(3);
      expect(options.every((url) => url.includes('source.unsplash.com'))).toBe(
        true
      );
    });

    it('includes variations in search terms', () => {
      const options = generateImageOptions('Chicken Pasta', 'Italian', 3);
      expect(options[0]).toContain('cooked');
      expect(options[1]).toContain('fresh');
      expect(options[2]).toContain('homemade');
    });

    it('uses default count of 3', () => {
      const options = generateImageOptions('Pasta');
      expect(options).toHaveLength(3);
    });

    it('includes food terms from recipe name', () => {
      const options = generateImageOptions('Grilled Salmon');
      expect(options[0]).toContain('salmon');
    });
  });

  describe('addImagesToRecipes', () => {
    it('adds image URL to recipes without images', () => {
      const recipes = [
        { id: 1, name: 'Chicken Pasta', category: 'Italian' },
        { id: 2, name: 'Grilled Salmon', category: 'Seafood' },
      ];
      const result = addImagesToRecipes(recipes);
      expect(result[0]).toHaveProperty('image');
      expect(result[1]).toHaveProperty('image');
      expect(result[0].image).toContain('source.unsplash.com');
    });

    it('preserves existing image URLs', () => {
      const recipes = [
        {
          id: 1,
          name: 'Chicken Pasta',
          image: 'https://example.com/image.jpg',
        },
      ];
      const result = addImagesToRecipes(recipes);
      expect(result[0].image).toBe('https://example.com/image.jpg');
    });

    it('preserves all other recipe properties', () => {
      const recipes = [
        { id: 1, name: 'Chicken Pasta', category: 'Italian', time: 30 },
      ];
      const result = addImagesToRecipes(recipes);
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe('Chicken Pasta');
      expect(result[0].category).toBe('Italian');
      expect(result[0].time).toBe(30);
    });

    it('handles empty array', () => {
      const result = addImagesToRecipes([]);
      expect(result).toEqual([]);
    });

    it('handles single recipe', () => {
      const recipes = [{ id: 1, name: 'Pasta', category: 'Italian' }];
      const result = addImagesToRecipes(recipes);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('image');
    });
  });
});
