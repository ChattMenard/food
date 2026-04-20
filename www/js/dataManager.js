import { normalizeCuisine } from './dietFilters.js';
import { addImagesToRecipes } from './recipeImages.js';
import { SearchIndex } from './searchIndex.js';

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
        return requiredFields.every(field => nutrition.hasOwnProperty(field));
    }

    async loadData() {
        try {
            // Load ingredients first (smaller file)
            const ingResponse = await fetch('data/ingredients.json');
            const autocompleteIngredients = await ingResponse.json();
            this.setAutocompleteIngredients(autocompleteIngredients);

            // Try to load gzip-compressed recipes first for faster loading
            let allRecipes;
            try {
                const gzipResponse = await fetch('data/recipes_enhanced_gzip.json.gz');
                if (gzipResponse.ok && typeof DecompressionStream !== 'undefined') {
                    const blob = await gzipResponse.blob();
                    const ds = new DecompressionStream('gzip');
                    const decompressed = blob.stream().pipeThrough(ds);
                    const text = await new Response(decompressed).text();
                    allRecipes = JSON.parse(text);
                } else {
                    throw new Error('Gzip not supported');
                }
            } catch (e) {
                // Fallback to regular JSON if gzip fails or not supported
                const recResponse = await fetch('data/recipes.json');
                allRecipes = await recResponse.json();
            }

            // Validate recipe schema and filter invalid entries
            const validRecipes = allRecipes.filter(recipe => {
                if (!recipe.name || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
                    console.warn('Invalid recipe schema:', recipe.name);
                    return false;
                }
                if (recipe.nutrition && !this.validateNutrition(recipe.nutrition)) {
                    console.warn('Invalid nutrition data for:', recipe.name);
                    delete recipe.nutrition; // Remove invalid nutrition data
                }
                // Normalize cuisine value
                if (recipe.category) {
                    recipe.category = normalizeCuisine(recipe.category);
                }
                return true;
            });

            // Add image URLs to recipes
            const recipesWithImages = addImagesToRecipes(validRecipes);

            // Load first 500 recipes immediately for quick initial render
            this.setRecipes(recipesWithImages.slice(0, 500));

            // Load remaining recipes in background
            setTimeout(() => {
                this.setRecipes(recipesWithImages);
                this.searchIndex = new SearchIndex(recipesWithImages);
                this.updateMeals(); // Refresh meals with full dataset
            }, 500);
        } catch (e) {
            console.error('Failed to load dataset', e);
        }
    }

    searchRecipes(query) {
        if (!this.searchIndex) return [];
        return this.searchIndex.search(query);
    }
}
