import { normalizeCuisine } from '../utils/dietFilters.js';
import { addImagesToRecipes } from '../advanced/recipeImages.js';
import RecipeEngine from '../logic/recipeEngine.js';
import log from '../utils/logger.js';
import { SearchIndex } from '../logic/searchIndex.js';
import type { Recipe, Ingredient, NutritionData } from '../types/index.js';

// @ts-ignore
const Capacitor = (globalThis as any).Capacitor;

const INITIAL_RECIPE_RENDER_COUNT = 500;

let _Filesystem: any = null;
async function getFilesystem(): Promise<any> {
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

const SIMPLE_STAPLES: string[] = [
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
  private setRecipes: (recipes: Recipe[]) => void;
  private setAutocompleteIngredients: (ingredients: string[]) => void;
  private updateMeals: () => void;
  private searchIndex: SearchIndex | null = null;

  constructor({ 
    setRecipes, 
    setAutocompleteIngredients, 
    updateMeals 
  }: {
    setRecipes: (recipes: Recipe[]) => void;
    setAutocompleteIngredients: (ingredients: string[]) => void;
    updateMeals: () => void;
  }) {
    this.setRecipes = setRecipes;
    this.setAutocompleteIngredients = setAutocompleteIngredients;
    this.updateMeals = updateMeals;
    this.searchIndex = null;
  }

  validateNutrition(nutrition: any): nutrition is NutritionData {
    if (!nutrition || typeof nutrition !== 'object') return false;
    const requiredFields = ['calories', 'protein', 'carbs', 'fat'];
    return requiredFields.every((field) => nutrition.hasOwnProperty(field));
  }

  isNativePlatform(): boolean {
    // @ts-ignore
    return Boolean((globalThis as any).Capacitor?.isNativePlatform?.());
  }

  async fetchJson(path: string): Promise<any> {
    const response = await fetch(path);
    if (!response || response.ok === false) {
      const statusText = response ? ` (${response.status})` : '';
      throw new Error(`Failed to fetch ${path}${statusText}`);
    }
    return response.json();
  }

  async loadRecipes(): Promise<Recipe[]> {
    try {
      log('[DataManager] Loading recipes...');
      
      // Try mobile first
      if (this.isNativePlatform()) {
        const mobileRecipes = await this.loadMobileRecipes();
        if (mobileRecipes.length > 0) {
          log(`[DataManager] Loaded ${mobileRecipes.length} recipes from mobile storage`);
          return mobileRecipes;
        }
      }

      // Fallback to web
      const webRecipes = await this.loadWebRecipes();
      log(`[DataManager] Loaded ${webRecipes.length} recipes from web`);
      return webRecipes;

    } catch (error) {
      console.error('[DataManager] Failed to load recipes:', error);
      throw error;
    }
  }

  private async loadMobileRecipes(): Promise<Recipe[]> {
    const Filesystem = await getFilesystem();
    if (!Filesystem) return [];

    try {
      const { data } = await Filesystem.readFile({
        path: 'recipes_enhanced.json',
        directory: 'Documents',
      });

      const recipes: Recipe[] = JSON.parse(atob(data));
      return this.processRecipes(recipes);
    } catch (error) {
      console.warn('[DataManager] Mobile recipe load failed:', error);
      return [];
    }
  }

  private async loadWebRecipes(): Promise<Recipe[]> {
    const recipes: Recipe[] = await this.fetchJson('/data/recipes_enhanced.json');
    return this.processRecipes(recipes);
  }

  private processRecipes(recipes: Recipe[]): Recipe[] {
    log(`[DataManager] Processing ${recipes.length} recipes...`);

    // Validate and filter recipes
    const validRecipes = recipes.filter(recipe => {
      if (!recipe.name || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
        return false;
      }

      // Validate nutrition data
      if (recipe.nutrition && !this.validateNutrition(recipe.nutrition)) {
        console.warn(`[DataManager] Invalid nutrition for recipe: ${recipe.name}`);
        recipe.nutrition = undefined;
      }

      return true;
    });

    // Normalize recipes
    const normalizedRecipes = validRecipes.map(recipe => ({
      ...recipe,
      name: recipe.name?.trim() || '',
      cuisine: normalizeCuisine(recipe.cuisine || 'unknown'),
      ingredients: recipe.ingredients.map(ing => 
        typeof ing === 'string' ? { name: ing, amount: 0, unit: '' } : ing
      ),
      minutes: Math.max(5, Math.min(999, recipe.minutes || 30)),
      rating: Math.max(0, Math.min(5, recipe.rating || 0)),
    }));

    // Add images
    const recipesWithImages = addImagesToRecipes(normalizedRecipes);

    // Initialize search index
    this.searchIndex = new SearchIndex(recipesWithImages);

    // Extract ingredients for autocomplete
    const ingredients = this.extractIngredients(recipesWithImages);
    this.setAutocompleteIngredients(ingredients);

    // Set initial batch of recipes
    const initialBatch = recipesWithImages.slice(0, INITIAL_RECIPE_RENDER_COUNT);
    this.setRecipes(initialBatch);

    // Trigger meals update
    setTimeout(() => this.updateMeals(), 100);

    log(`[DataManager] Processed ${recipesWithImages.length} valid recipes`);
    return recipesWithImages;
  }

  private extractIngredients(recipes: Recipe[]): string[] {
    const ingredientSet = new Set<string>();

    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        const name = typeof ing === 'string' ? ing : ing.name;
        if (name && typeof name === 'string') {
          ingredientSet.add(name.toLowerCase().trim());
        }
      });
    });

    // Add simple staples
    SIMPLE_STAPLES.forEach(staple => ingredientSet.add(staple));

    return Array.from(ingredientSet).sort();
  }

  searchRecipes(query: string, filters?: {
    cuisine?: string;
    maxTime?: number;
    difficulty?: string;
    diet?: string;
  }): Recipe[] {
    if (!this.searchIndex) {
      console.warn('[DataManager] Search index not initialized');
      return [];
    }

    return this.searchIndex.search(query, filters);
  }

  getRecipeById(id: string): Recipe | undefined {
    if (!this.searchIndex) return undefined;
    return this.searchIndex.getRecipeById(id);
  }

  getRandomRecipes(count: number, filters?: {
    cuisine?: string;
    maxTime?: number;
    difficulty?: string;
    diet?: string;
  }): Recipe[] {
    if (!this.searchIndex) return [];
    return this.searchIndex.getRandomRecipes(count, filters);
  }

  async saveRecipe(recipe: Recipe): Promise<void> {
    if (!this.searchIndex) {
      throw new Error('Search index not initialized');
    }

    // Add to search index
    this.searchIndex.addRecipe(recipe);

    // Update recipes list
    const currentRecipes = this.searchIndex.getAllRecipes();
    this.setRecipes(currentRecipes.slice(0, INITIAL_RECIPE_RENDER_COUNT));
  }

  async deleteRecipe(id: string): Promise<void> {
    if (!this.searchIndex) {
      throw new Error('Search index not initialized');
    }

    // Remove from search index
    this.searchIndex.removeRecipe(id);

    // Update recipes list
    const currentRecipes = this.searchIndex.getAllRecipes();
    this.setRecipes(currentRecipes.slice(0, INITIAL_RECIPE_RENDER_COUNT));
  }

  getRecipesByCuisine(cuisine: string): Recipe[] {
    if (!this.searchIndex) return [];
    return this.searchIndex.getRecipesByCuisine(cuisine);
  }

  getRecipesByIngredient(ingredient: string): Recipe[] {
    if (!this.searchIndex) return [];
    return this.searchIndex.getRecipesByIngredient(ingredient);
  }

  getRecipeStats(): {
    total: number;
    byCuisine: Record<string, number>;
    avgTime: number;
    avgRating: number;
  } {
    if (!this.searchIndex) {
      return {
        total: 0,
        byCuisine: {},
        avgTime: 0,
        avgRating: 0,
      };
    }

    const recipes = this.searchIndex.getAllRecipes();
    const stats = {
      total: recipes.length,
      byCuisine: {} as Record<string, number>,
      avgTime: 0,
      avgRating: 0,
    };

    let totalTime = 0;
    let totalRating = 0;
    let ratedCount = 0;

    recipes.forEach((recipe: any) => {
      // Count by cuisine
      const cuisine = recipe.cuisine || 'unknown';
      stats.byCuisine[cuisine] = (stats.byCuisine[cuisine] || 0) + 1;

      // Sum time and rating
      totalTime += recipe.minutes || 0;
      if (recipe.rating && recipe.rating > 0) {
        totalRating += recipe.rating;
        ratedCount++;
      }
    });

    stats.avgTime = recipes.length > 0 ? Math.round(totalTime / recipes.length) : 0;
    stats.avgRating = ratedCount > 0 ? Math.round((totalRating / ratedCount) * 10) / 10 : 0;

    return stats;
  }
}
