import { normalizeCuisine } from '../utils/dietFilters.js';
import { addImagesToRecipes } from '../advanced/recipeImages.js';
import { SearchIndex } from '../logic/searchIndex.js';

const INITIAL_RECIPE_RENDER_COUNT = 500;

let _Filesystem = null;
async function getFilesystem() {
  if (!_Filesystem && typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
    try {
      const module = await import('@capacitor/filesystem');
      _Filesystem = module.Filesystem;
    } catch (_e) {
      // Filesystem plugin not installed
    }
  }
  return _Filesystem;
}
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
    // On native platforms, use Filesystem API to avoid WebView fetch size limits
    const fs = await getFilesystem();
    if (fs) {
      try {
        const nativePath = path.replace('data/', 'public/data/');
        const { data } = await fs.readFile({
          path: nativePath,
          directory: 'Assets',
        });
        const binary = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        const blob = new Blob([binary]);
        const decompressed = blob
          .stream()
          .pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(decompressed).text();
        return JSON.parse(text);
      } catch (fsError) {
        console.warn('Filesystem read failed, falling back to fetch:', fsError);
      }
    }

    // Web fallback: use fetch + DecompressionStream
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

  async loadChunkedRecipes(onChunkLoaded) {
    const manifest = await this.fetchJson('data/chunks/manifest.json');
    const { total_chunks } = manifest;

    // Load chunk 0 first for immediate display
    const firstChunk = await this.fetchGzipJson('data/chunks/recipes_0.json.gz');
    let allRecipes = [...firstChunk];
    if (onChunkLoaded) onChunkLoaded(allRecipes, 1, total_chunks);

    // Load remaining chunks in background
    for (let i = 1; i < total_chunks; i++) {
      try {
        const chunk = await this.fetchGzipJson(`data/chunks/recipes_${i}.json.gz`);
        allRecipes = allRecipes.concat(chunk);
        if (onChunkLoaded) onChunkLoaded(allRecipes, i + 1, total_chunks);
      } catch (err) {
        console.warn(`Failed to load chunk ${i}:`, err);
      }
    }
    return allRecipes;
  }

  async loadRecipesFromSources() {
    // On native mobile, use chunked loading so we never fetch >7MB at once
    if (this.isNativePlatform()) {
      try {
        return await this.loadChunkedRecipes();
      } catch (_err) {
        console.warn('Chunked loading failed, trying fallbacks');
      }
      // Fallback chain for native
      for (const source of ['data/recipes.json', 'data/recipes_enhanced_gzip.json.gz']) {
        try {
          const recipes = source.endsWith('.gz')
            ? await this.fetchGzipJson(source)
            : await this.fetchJson(source);
          if (Array.isArray(recipes) && recipes.length) return recipes;
        } catch (error) {
          console.warn(`Recipe source unavailable: ${source}`, error);
        }
      }
    }

    // Web: prefer full gzip, fallback to chunks, then plain JSON
    for (const source of ['data/recipes_enhanced_gzip.json.gz', 'data/recipes.json']) {
      try {
        const recipes = source.endsWith('.gz')
          ? await this.fetchGzipJson(source)
          : await this.fetchJson(source);
        if (Array.isArray(recipes) && recipes.length) return recipes;
      } catch (error) {
        console.warn(`Recipe source unavailable: ${source}`, error);
      }
    }

    // Last resort: try chunked loading on web too
    try {
      return await this.loadChunkedRecipes();
    } catch (_err) {
      // fall through
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
