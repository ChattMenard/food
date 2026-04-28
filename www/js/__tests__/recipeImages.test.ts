// @ts-check
import {
  generateRecipeImageUrl,
  getFallbackImageUrl,
  preloadImage,
  generateImageOptions,
  addImagesToRecipes,
} from '../advanced/recipeImages';

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
  });

  describe('preloadImage', () => {
    beforeEach(() => {
      // Mock Image constructor
      (global as any).Image = jest.fn().mockImplementation(() => ({
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      }));
    });

    it('should preload image successfully', async () => {
      const mockImage = {
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      };
      (global as any).Image = jest.fn().mockReturnValue(mockImage);

      const promise = preloadImage('https://example.com/image.jpg');
      
      // Simulate successful load
      if (mockImage.onload) {
        mockImage.onload();
      }

      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle image load error', async () => {
      const mockImage = {
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      };
      (global as any).Image = jest.fn().mockReturnValue(mockImage);

      const promise = preloadImage('https://example.com/image.jpg');
      
      // Simulate load error
      if (mockImage.onerror) {
        mockImage.onerror();
      }

      await expect(promise).rejects.toThrow('Failed to load image');
    });

    it('should set image src', async () => {
      const mockImage = {
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      };
      (global as any).Image = jest.fn().mockReturnValue(mockImage);

      const url = 'https://example.com/image.jpg';
      preloadImage(url);

      expect(mockImage.src).toBe(url);
    });
  });

  describe('generateImageOptions', () => {
    it('generates image options with defaults', () => {
      const options = generateImageOptions('Recipe Name');
      
      expect(options).toHaveProperty('width');
      expect(options).toHaveProperty('height');
      expect(options).toHaveProperty('query');
      expect(options).toHaveProperty('category');
      expect(options.width).toBe(400);
      expect(options.height).toBe(300);
    });

    it('accepts custom options', () => {
      const customOptions = {
        width: 800,
        height: 600,
        category: 'Dessert',
        quality: 90,
      };

      const options = generateImageOptions('Recipe Name', customOptions);
      
      expect(options.width).toBe(800);
      expect(options.height).toBe(600);
      expect(options.category).toBe('Dessert');
      expect(options.quality).toBe(90);
    });

    it('generates appropriate query terms', () => {
      const options = generateImageOptions('Chocolate Cake');
      
      expect(options.query).toContain('chocolate');
      expect(options.query).toContain('cake');
    });

    it('handles special characters in recipe names', () => {
      const options = generateImageOptions("Mom's Special Dish!");
      
      expect(options.query).toBeDefined();
      expect(typeof options.query).toBe('string');
    });
  });

  describe('addImagesToRecipes', () => {
    const mockRecipes = [
      { name: 'Pasta Carbonara', ingredients: ['pasta', 'eggs', 'bacon'] },
      { name: 'Chicken Salad', ingredients: ['chicken', 'lettuce', 'tomatoes'] },
      { name: 'Vegetable Soup', ingredients: ['carrots', 'celery', 'onions'] },
    ];

    it('adds images to all recipes', async () => {
      const recipesWithImages = await addImagesToRecipes(mockRecipes);
      
      expect(recipesWithImages).toHaveLength(3);
      recipesWithImages.forEach((recipe: any) => {
        expect(recipe).toHaveProperty('imageUrl');
        expect(typeof recipe.imageUrl).toBe('string');
        expect(recipe.imageUrl).toContain('source.unsplash.com');
      });
    });

    it('preserves original recipe properties', async () => {
      const recipesWithImages = await addImagesToRecipes(mockRecipes);
      
      expect(recipesWithImages[0].name).toBe('Pasta Carbonara');
      expect(recipesWithImages[0].ingredients).toEqual(['pasta', 'eggs', 'bacon']);
    });

    it('adds image metadata', async () => {
      const recipesWithImages = await addImagesToRecipes(mockRecipes);
      
      recipesWithImages.forEach((recipe: any) => {
        expect(recipe).toHaveProperty('imageMetadata');
        expect(recipe.imageMetadata).toHaveProperty('width');
        expect(recipe.imageMetadata).toHaveProperty('height');
        expect(recipe.imageMetadata).toHaveProperty('query');
      });
    });

    it('handles empty recipe array', async () => {
      const recipesWithImages = await addImagesToRecipes([]);
      
      expect(recipesWithImages).toEqual([]);
    });

    it('handles recipes with missing properties', async () => {
      const invalidRecipes = [
        { name: 'Valid Recipe' },
        { ingredients: ['ingredient'] },
        {},
      ];

      const recipesWithImages = await addImagesToRecipes(invalidRecipes);
      
      expect(recipesWithImages).toHaveLength(3);
      recipesWithImages.forEach((recipe: any) => {
        expect(recipe).toHaveProperty('imageUrl');
      });
    });

    it('uses custom image options', async () => {
      const options = {
        width: 800,
        height: 600,
        category: 'Main Course',
      };

      const recipesWithImages = await addImagesToRecipes(mockRecipes, options);
      
      recipesWithImages.forEach((recipe: any) => {
        expect(recipe.imageMetadata.width).toBe(800);
        expect(recipe.imageMetadata.height).toBe(600);
        expect(recipe.imageMetadata.category).toBe('Main Course');
      });
    });
  });

  describe('URL generation edge cases', () => {
    it('handles very long recipe names', () => {
      const longName = 'Very Long Recipe Name With Many Words That Might Cause Issues';
      const url = generateRecipeImageUrl(longName);
      
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('handles special characters', () => {
      const specialName = 'Recipe with émojis 🍕 and spéci@l ch@rs!';
      const url = generateRecipeImageUrl(specialName);
      
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('handles numbers in recipe names', () => {
      const numericName = 'Recipe 123 with 456 numbers';
      const url = generateRecipeImageUrl(numericName);
      
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('handles empty recipe name', () => {
      const url = generateRecipeImageUrl('');
      
      expect(url).toContain('food');
      expect(url).toContain('recipe');
    });

    it('handles null recipe name', () => {
      const url = generateRecipeImageUrl(null as any);
      
      expect(url).toContain('food');
      expect(url).toContain('recipe');
    });
  });

  describe('image loading performance', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should timeout after specified duration', async () => {
      const mockImage = {
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      };
      (global as any).Image = jest.fn().mockReturnValue(mockImage);

      const promise = preloadImage('https://example.com/image.jpg', 1000);
      
      // Advance time beyond timeout
      jest.advanceTimersByTime(1000);
      
      await expect(promise).rejects.toThrow('Image load timeout');
    });

    it('should handle multiple concurrent loads', async () => {
      const mockImage = {
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      };
      (global as any).Image = jest.fn().mockReturnValue(mockImage);

      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      const promises = urls.map(url => preloadImage(url));
      
      // Simulate all images loading successfully
      promises.forEach((promise, index) => {
        if (mockImage.onload) {
          setTimeout(() => mockImage.onload(), index * 100);
        }
      });

      jest.advanceTimersByTime(300);

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('error handling', () => {
    it('should handle invalid URLs gracefully', async () => {
      const mockImage = {
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      };
      (global as any).Image = jest.fn().mockReturnValue(mockImage);

      const promise = preloadImage('invalid-url');
      
      // Simulate error
      if (mockImage.onerror) {
        mockImage.onerror();
      }

      await expect(promise).rejects.toThrow();
    });

    it('should handle Image constructor errors', async () => {
      (global as any).Image = jest.fn().mockImplementation(() => {
        throw new Error('Image constructor failed');
      });

      await expect(preloadImage('https://example.com/image.jpg')).rejects.toThrow('Image constructor failed');
    });

    it('should handle missing Image API', async () => {
      delete (global as any).Image;

      await expect(preloadImage('https://example.com/image.jpg')).rejects.toThrow('Image API not available');
    });
  });

  describe('caching', () => {
    it('should cache loaded images', async () => {
      const mockImage = {
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      };
      (global as any).Image = jest.fn().mockReturnValue(mockImage);

      const url = 'https://example.com/image.jpg';
      
      // First load
      const promise1 = preloadImage(url);
      if (mockImage.onload) mockImage.onload();
      await promise1;

      // Second load should use cache
      const promise2 = preloadImage(url);
      
      // Should resolve immediately without creating new Image
      expect((global as any).Image).toHaveBeenCalledTimes(1);
    });

    it('should handle cache size limits', async () => {
      const mockImage = {
        src: '',
        onload: null as any,
        onerror: null as any,
        addEventListener: jest.fn(),
      };
      (global as any).Image = jest.fn().mockReturnValue(mockImage);

      // Load many images to exceed cache limit
      const promises = [];
      for (let i = 0; i < 105; i++) {
        const promise = preloadImage(`https://example.com/image${i}.jpg`);
        if (mockImage.onload) mockImage.onload();
        promises.push(promise);
      }

      await Promise.all(promises);

      // Should have purged old entries from cache
      expect((global as any).Image).toHaveBeenCalledTimes(105);
    });
  });
});
