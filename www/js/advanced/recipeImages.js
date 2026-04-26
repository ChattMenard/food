/**
 * Recipe Image Generator
 * Generates relevant recipe images using Unsplash Source API
 */

const UNSPLASH_SOURCE_BASE = 'https://source.unsplash.com';

/**
 * Generate a food image URL based on recipe name and category
 * @param {string} recipeName - The name of the recipe
 * @param {string} category - The recipe category
 * @param {number} width - Image width (default: 400)
 * @param {number} height - Image height (default: 300)
 * @returns {string} Image URL
 */
export function generateRecipeImageUrl(
  recipeName,
  category = '',
  width = 400,
  height = 300
) {
  // Extract key food terms from recipe name
  const foodTerms = extractFoodTerms(recipeName, category);
  const searchQuery = foodTerms.join(',');

  // Use Unsplash Source API for dynamic food images
  // Note: Unsplash Source is deprecated, using a fallback approach
  return `${UNSPLASH_SOURCE_BASE}/${width}x${height}/?${encodeURIComponent(searchQuery)}`;
}

/**
 * Extract relevant food terms from recipe name and category
 * @param {string} recipeName
 * @param {string} category
 * @returns {string[]} Array of food search terms
 */
function extractFoodTerms(recipeName, category) {
  const terms = [];

  // Add category if it's food-related
  if (category && isFoodCategory(category)) {
    terms.push(category);
  }

  // Extract main ingredient from recipe name
  const mainIngredients = [
    'chicken',
    'beef',
    'pork',
    'fish',
    'salmon',
    'shrimp',
    'turkey',
    'pasta',
    'rice',
    'bread',
    'pizza',
    'burger',
    'sandwich',
    'soup',
    'salad',
    'stew',
    'curry',
    'chili',
    'cake',
    'cookie',
    'pie',
    'bread',
    'muffin',
    'banana',
    'apple',
    'chocolate',
    'cheese',
    'potato',
    'tomato',
    'egg',
    'bacon',
    'sausage',
    'steak',
    'ribs',
  ];

  const lowerName = recipeName.toLowerCase();
  for (const ingredient of mainIngredients) {
    if (lowerName.includes(ingredient)) {
      terms.push(ingredient);
      break; // Only add first match to keep query focused
    }
  }

  // Fallback to "food" if no terms found
  if (terms.length === 0) {
    terms.push('food', 'recipe');
  }

  return terms;
}

/**
 * Check if a category is food-related
 * @param {string} category
 * @returns {boolean}
 */
function isFoodCategory(category) {
  const nonFoodCategories = [
    'Quick',
    'Easy',
    'Healthy',
    'Low',
    'Best',
    'Great',
    'World Famous',
  ];
  const lowerCategory = category.toLowerCase();
  return !nonFoodCategories.some((term) =>
    lowerCategory.includes(term.toLowerCase())
  );
}

/**
 * Get a fallback image URL for recipes
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function getFallbackImageUrl(width = 400, height = 300) {
  return `${UNSPLASH_SOURCE_BASE}/${width}x${height}/?food,cooking`;
}

/**
 * Preload an image to ensure it loads before displaying
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Generate multiple image options for a recipe (for A/B testing or variety)
 * @param {string} recipeName
 * @param {string} category
 * @param {number} count
 * @returns {string[]}
 */
export function generateImageOptions(recipeName, category = '', count = 3) {
  const terms = extractFoodTerms(recipeName, category);
  const options = [];

  const variations = ['cooked', 'fresh', 'homemade', 'delicious', 'gourmet'];

  for (let i = 0; i < count; i++) {
    const variation = variations[i % variations.length];
    const query = [...terms, variation].join(',');
    options.push(
      `${UNSPLASH_SOURCE_BASE}/400x300/?${encodeURIComponent(query)}`
    );
  }

  return options;
}

/**
 * Add image URLs to recipe objects in bulk
 * @param {Array} recipes - Array of recipe objects
 * @returns {Array} Recipes with image URLs added
 */
export function addImagesToRecipes(recipes) {
  return recipes.map((recipe) => ({
    ...recipe,
    image: recipe.image || generateRecipeImageUrl(recipe.name, recipe.category),
  }));
}
