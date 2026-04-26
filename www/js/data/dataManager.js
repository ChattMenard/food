import { normalizeCuisine } from '../utils/dietFilters.js';
import { addImagesToRecipes } from '../advanced/recipeImages.js';
import { SearchIndex } from '../logic/searchIndex.js';

const INITIAL_RECIPE_RENDER_COUNT = 500;
const SIMPLE_STAPLES = [
  'rice',
  'beans',
  'eggs',
  'potatoes',
  'onion',
  'garlic',
  'pasta',
  'tomato',
  'lentils',
  'chickpeas',
  'bread',
  'oats',
  'carrot',
  'cabbage',
  'spinach',
  'frozen vegetables',
  'olive oil',
  'salt',
  'pepper',
  'canned tuna',
  'yogurt',
  'cheese',
  'corn',
  'peas',
  'bell pepper',
  'mushroom',
  'broccoli',
  'butter',
  'soy sauce',
  'ground turkey',
  'chicken',
  'tofu',
];

export class DataManager {
  constructor({ setRecipes, setAutocompleteIngredients, updateMeals }) {
    this.setRecipes = setRecipes;
    this.setAutocompleteIngredients = setAutocompleteIngredients;
    this.updateMeals = updateMeals;
    this.searchIndex = null;
  }

  validateNutrition(nutrition) {
    if (!nutrition || typeof nutrition !== 'object') return false;
    const requiredFields = ['calories', 'protein', 'carbs', 'fat'];
    return requiredFields.every((field) => nutrition.hasOwnProperty(field));
  }

  isNativePlatform() {
    return Boolean(globalThis?.Capacitor?.isNativePlatform?.());
  }

  async fetchJson(path) {
    const response = await fetch(path);
    if (!response || response.ok === false) {
      const statusText = response ? ` (${response.status})` : '';
      throw new Error(`Failed to fetch ${path}${statusText}`);
    }
    return response.json();
  }

  async fetchGzipJson(path) {
    const response = await fetch(path);
    if (!response || response.ok === false) {
      const statusText = response ? ` (${response.status})` : '';
      throw new Error(`Failed to fetch ${path}${statusText}`);
    }
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Gzip decompression is not supported in this runtime');
    }

    const blob = await response.blob();
    const decompressed = blob
      .stream()
      .pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(decompressed).text();
    return JSON.parse(text);
  }

  getRecipeSources() {
    // Native first: keep startup lighter on Android/iOS.
    if (this.isNativePlatform()) {
      return [
        'data/recipes.json',
        'data/recipes_enhanced.json',
        'data/recipes_enhanced_gzip.json.gz',
      ];
    }
    // Web first: prefer compressed enhanced dataset for better transfer performance.
    return [
      'data/recipes_enhanced_gzip.json.gz',
      'data/recipes.json',
      'data/recipes_enhanced.json',
    ];
  }

  async loadRecipesFromSources() {
    const sources = this.getRecipeSources();
    for (const source of sources) {
      try {
        const recipes = source.endsWith('.gz')
          ? await this.fetchGzipJson(source)
          : await this.fetchJson(source);
        if (Array.isArray(recipes) && recipes.length) {
          return recipes;
        }
      } catch (error) {
        console.warn(`Recipe source unavailable: ${source}`, error);
      }
    }
    throw new Error('No recipe dataset could be loaded');
  }

  sanitizeRecipe(recipe) {
    if (!recipe || !recipe.name || !Array.isArray(recipe.ingredients)) {
      return null;
    }

    const normalizedIngredients = recipe.ingredients
      .map((ingredient) => {
        if (typeof ingredient === 'string') return ingredient;
        if (ingredient && typeof ingredient.name === 'string')
          return ingredient.name;
        return '';
      })
      .map((ingredient) => ingredient.trim().toLowerCase())
      .filter(Boolean);

    if (normalizedIngredients.length === 0) {
      return null;
    }

    const sanitized = {
      ...recipe,
      name: String(recipe.name).trim(),
      ingredients: normalizedIngredients,
    };

    if (sanitized.nutrition && !this.validateNutrition(sanitized.nutrition)) {
      delete sanitized.nutrition;
    }

    if (sanitized.category) {
      sanitized.category = normalizeCuisine(sanitized.category);
    }

    if (!sanitized.minutes || Number.isNaN(sanitized.minutes)) {
      sanitized.minutes = 15 + normalizedIngredients.length * 5;
    }

    return sanitized;
  }

  buildSimpleFallbackRecipes(autocompleteIngredients = []) {
    const ingredientPool = Array.from(
      new Set([
        ...SIMPLE_STAPLES,
        ...autocompleteIngredients.map((i) =>
          String(i || '')
            .toLowerCase()
            .trim()
        ),
      ])
    ).filter(Boolean);
    const templateNames = [
      'Quick Bowl',
      'Pantry Skillet',
      'Simple Stir-Fry',
      'One-Pot Mix',
      'Budget Plate',
      'No-Fuss Dinner',
      'Fridge Rescue',
      'Basic Supper',
    ];
    const fallbackRecipes = [];
    let id = 900000;

    for (
      let i = 0;
      i < ingredientPool.length && fallbackRecipes.length < 200;
      i++
    ) {
      const ingredients = [
        ingredientPool[i],
        ingredientPool[(i + 7) % ingredientPool.length],
        ingredientPool[(i + 15) % ingredientPool.length],
      ].filter(Boolean);
      const uniqueIngredients = Array.from(new Set(ingredients)).slice(0, 3);
      if (uniqueIngredients.length < 2) continue;

      const template =
        templateNames[fallbackRecipes.length % templateNames.length];
      fallbackRecipes.push({
        id: id++,
        name: `${uniqueIngredients[0]} ${template}`,
        ingredients: uniqueIngredients,
        minutes: 10 + uniqueIngredients.length * 5,
        difficulty: 'easy',
        rating: 4.0,
      });
    }

    return fallbackRecipes;
  }

  async loadData() {
    try {
      const autocompleteIngredients = await this.fetchJson(
        'data/ingredients.json'
      );
      this.setAutocompleteIngredients(autocompleteIngredients);

      let allRecipes = [];
      try {
        allRecipes = await this.loadRecipesFromSources();
      } catch (error) {
        console.error(
          'Recipe datasets unavailable, using generated simple fallback recipes',
          error
        );
        allRecipes = this.buildSimpleFallbackRecipes(autocompleteIngredients);
      }

      const validRecipes = allRecipes
        .map((recipe) => this.sanitizeRecipe(recipe))
        .filter(Boolean);

      const recipesWithImages = addImagesToRecipes(validRecipes);
      const initialRecipes = recipesWithImages.slice(
        0,
        INITIAL_RECIPE_RENDER_COUNT
      );
      this.setRecipes(initialRecipes);

      setTimeout(() => {
        this.setRecipes(recipesWithImages);
        this.searchIndex = new SearchIndex(recipesWithImages);
        this.updateMeals();
      }, 300);
    } catch (e) {
      console.error('Failed to load dataset', e);
    }
  }

  searchRecipes(query) {
    if (!this.searchIndex) return [];
    return this.searchIndex.search(query);
  }
}
