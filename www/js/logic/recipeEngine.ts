// @ts-check
import { IngredientVectors } from './ingredientVectors.js';
import type { Recipe, RecipeRatings } from '../types/index.js';

export class RecipeEngine {
  private getRecipes: () => Recipe[];
  private getRecipeRatings: () => RecipeRatings;
  private persistRecipeRatings: (ratings: RecipeRatings) => Promise<void>;
  private announce: (message: string) => void;
  private ingredientVectors: IngredientVectors | null;

  constructor({
    getRecipes,
    getRecipeRatings,
    persistRecipeRatings,
    announce,
  }: {
    getRecipes: () => Recipe[];
    getRecipeRatings: () => RecipeRatings;
    persistRecipeRatings: (ratings: RecipeRatings) => Promise<void>;
    announce: (message: string) => void;
  }) {
    this.getRecipes = getRecipes;
    this.getRecipeRatings = getRecipeRatings;
    this.persistRecipeRatings = persistRecipeRatings;
    this.announce = announce;
    this.ingredientVectors = null;
  }

  buildIngredientVectors(): void {
    const recipes = this.getRecipes();
    if (recipes.length > 0) {
      this.ingredientVectors = new IngredientVectors(recipes);
    }
  }

  findSimilarRecipes(currentRecipe: Recipe, limit: number = 3): Recipe[] {
    const recipes = this.getRecipes();

    // Use vector-based similarity if available, otherwise fall back to simple matching
    if (this.ingredientVectors) {
      const similarNames = this.ingredientVectors.findSimilarRecipes(
        currentRecipe.name,
        limit
      );
      return similarNames
        .map((name) => recipes.find((r) => r.name === name))
        .filter((r): r is Recipe => Boolean(r));
    }

    // Fallback to simple ingredient overlap matching
    const currentIngredients = new Set(
      currentRecipe.ingredients.map((ing) => {
        const name = typeof ing === 'string' ? ing : ing.name;
        return name.toLowerCase().replace(/[^a-z]/g, '');
      })
    );

    const similar = recipes
      .filter((r) => r.name !== currentRecipe.name)
      .map((recipe) => {
        const recipeIngredients = new Set(
          recipe.ingredients.map((ing) => {
            const name = typeof ing === 'string' ? ing : ing.name;
            return name.toLowerCase().replace(/[^a-z]/g, '');
          })
        );

        // Calculate overlap percentage
        const intersection = new Set([...currentIngredients].filter(x => recipeIngredients.has(x)));
        const union = new Set([...currentIngredients, ...recipeIngredients]);
        const overlap = intersection.size / union.size;

        return { recipe, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, limit)
      .map((item) => item.recipe);

    return similar;
  }

  async rateRecipe(recipeId: string, rating: number): Promise<void> {
    const ratings = this.getRecipeRatings();
    const oldRating = ratings[recipeId] || 0;
    
    ratings[recipeId] = rating;
    await this.persistRecipeRatings(ratings);
    
    this.announce(`Rated recipe ${rating} stars${oldRating ? ` (was ${oldRating} stars)` : ''}`);
  }

  getTopRatedRecipes(limit: number = 10): Recipe[] {
    const recipes = this.getRecipes();
    const ratings = this.getRecipeRatings();
    
    return recipes
      .filter(recipe => ratings[recipe.id] && ratings[recipe.id] >= 4)
      .sort((a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0))
      .slice(0, limit);
  }

  getPersonalizedRecommendations(userPreferences: any, limit: number = 5): Recipe[] {
    const recipes = this.getRecipes();
    const ratings = this.getRecipeRatings();
    
    // Filter based on user preferences
    const filtered = recipes.filter(recipe => {
      // Check dietary restrictions
      if (userPreferences.diet && userPreferences.diet !== 'none') {
        if (!recipe.dietary_flags) return false;
        
        switch (userPreferences.diet) {
          case 'vegetarian':
            if (!recipe.dietary_flags.vegetarian) return false;
            break;
          case 'vegan':
            if (!recipe.dietary_flags.vegan) return false;
            break;
          case 'gluten-free':
            if (!recipe.dietary_flags.gluten_free) return false;
            break;
        }
      }
      
      // Check difficulty
      if (userPreferences.difficulty && userPreferences.difficulty !== 'any') {
        if (recipe.difficulty !== userPreferences.difficulty) return false;
      }
      
      // Check max time
      if (userPreferences.maxTime && recipe.minutes > userPreferences.maxTime) {
        return false;
      }
      
      return true;
    });
    
    // Sort by rating and user history
    return filtered
      .sort((a, b) => {
        const aRating = ratings[a.id] || 0;
        const bRating = ratings[b.id] || 0;
        
        // Prefer higher rated recipes
        if (bRating !== aRating) return bRating - aRating;
        
        // Then prefer recipes with similar ingredients to highly rated ones
        const aIngredients = new Set(a.ingredients.map(ing => typeof ing === 'string' ? ing : ing.name));
        const bIngredients = new Set(b.ingredients.map(ing => typeof ing === 'string' ? ing : ing.name));
        
        const aHighRatedIngredients = this.getHighRatedIngredientOverlap(aIngredients, ratings, recipes);
        const bHighRatedIngredients = this.getHighRatedIngredientOverlap(bIngredients, ratings, recipes);
        
        return bHighRatedIngredients - aHighRatedIngredients;
      })
      .slice(0, limit);
  }

  private getHighRatedIngredientOverlap(
    ingredients: Set<string>, 
    ratings: RecipeRatings, 
    recipes: Recipe[]
  ): number {
    let overlap = 0;
    
    recipes.forEach(recipe => {
      const rating = ratings[recipe.id] || 0;
      if (rating >= 4) {
        const recipeIngredients = new Set(
          recipe.ingredients.map(ing => typeof ing === 'string' ? ing : ing.name)
        );
        
        const intersection = new Set([...ingredients].filter(x => recipeIngredients.has(x)));
        overlap += intersection.size * rating;
      }
    });
    
    return overlap;
  }

  searchRecipes(query: string, filters: any = {}): Recipe[] {
    const recipes = this.getRecipes();
    const queryLower = query.toLowerCase();
    
    return recipes.filter(recipe => {
      // Text search
      const matchesQuery = 
        recipe.name.toLowerCase().includes(queryLower) ||
        recipe.description?.toLowerCase().includes(queryLower) ||
        recipe.ingredients.some(ing => {
          const name = typeof ing === 'string' ? ing : ing.name;
          return name.toLowerCase().includes(queryLower);
        });
      
      if (!matchesQuery) return false;
      
      // Apply filters
      if (filters.difficulty && recipe.difficulty !== filters.difficulty) return false;
      if (filters.maxTime && recipe.minutes > filters.maxTime) return false;
      if (filters.cuisine && recipe.cuisine !== filters.cuisine) return false;
      
      return true;
    });
  }
}
