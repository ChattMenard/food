import type { Recipe } from '../types/index';

export class SearchIndex {
  private recipes: Recipe[];
  private index: Map<string, Recipe[]>;

  constructor(recipes: Recipe[]) {
    this.recipes = recipes;
    this.index = this.buildIndex();
  }

  private buildIndex(): Map<string, Recipe[]> {
    const index = new Map<string, Recipe[]>();

    this.recipes.forEach((recipe) => {
      const terms = this.extractTerms(recipe.name);
      terms.forEach((term) => {
        if (!index.has(term)) {
          index.set(term, []);
        }
        index.get(term)!.push(recipe);
      });

      // Index ingredients
      recipe.ingredients.forEach((ing) => {
        const ingName = typeof ing === 'string' ? ing : ing.name;
        const ingTerms = this.extractTerms(ingName);
        ingTerms.forEach((term) => {
          if (!index.has(term)) {
            index.set(term, []);
          }
          if (!index.get(term)!.includes(recipe)) {
            index.get(term)!.push(recipe);
          }
        });
      });
    });

    return index;
  }

  private extractTerms(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2);
  }

  search(query: string, filters?: any): Recipe[] {
    if (!query || query.trim().length < 2) return [];

    const terms = this.extractTerms(query);
    const results = new Map<Recipe, number>();

    terms.forEach((term) => {
      const matches = this.index.get(term);
      if (matches) {
        matches.forEach((recipe) => {
          results.set(recipe, (results.get(recipe) || 0) + 1);
        });
      }
    });

    // Sort by relevance (number of matching terms) and return
    return Array.from(results.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([recipe]) => recipe);
  }

  getRecipeById(id: string): Recipe | undefined {
    return this.recipes.find(recipe => recipe.id === id);
  }

  getRandomRecipes(count: number, filters?: any): Recipe[] {
    const shuffled = [...this.recipes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  addRecipe(recipe: Recipe): void {
    this.recipes.push(recipe);
    // Rebuild index to include new recipe
    this.index = this.buildIndex();
  }

  getAllRecipes(): Recipe[] {
    return [...this.recipes];
  }

  removeRecipe(id: string): void {
    this.recipes = this.recipes.filter(recipe => recipe.id !== id);
    // Rebuild index to reflect removal
    this.index = this.buildIndex();
  }

  getRecipesByCuisine(cuisine: string): Recipe[] {
    return this.recipes.filter(recipe => 
      recipe.cuisine?.toLowerCase() === cuisine.toLowerCase()
    );
  }

  getRecipesByIngredient(ingredient: string): Recipe[] {
    return this.recipes.filter(recipe =>
      recipe.ingredients.some(ing => {
        const ingName = typeof ing === 'string' ? ing : ing.name;
        return ingName.toLowerCase().includes(ingredient.toLowerCase());
      })
    );
  }

  /**
   * Search with advanced filtering options
   * @param {string} query - Search query
   * @param {Object} filters - Filter options (cuisine, difficulty, time, etc.)
   * @returns {Recipe[]} Filtered search results
   */
  searchWithFilters(query: string, filters: any = {}): Recipe[] {
    let results = this.search(query);
    
    // Apply filters
    if (filters.cuisine) {
      results = results.filter(recipe => 
        recipe.cuisine?.toLowerCase() === filters.cuisine.toLowerCase()
      );
    }
    
    if (filters.difficulty) {
      results = results.filter(recipe => 
        recipe.difficulty?.toLowerCase() === filters.difficulty.toLowerCase()
      );
    }
    
    if (filters.maxTime) {
      results = results.filter(recipe => 
        (recipe.time || recipe.cookTime || 0) <= filters.maxTime
      );
    }
    
    if (filters.ingredients && filters.ingredients.length > 0) {
      results = results.filter(recipe =>
        filters.ingredients.every((ing: string) =>
          recipe.ingredients.some(recipeIng => {
            const ingName = typeof recipeIng === 'string' ? recipeIng : recipeIng.name;
            return ingName.toLowerCase().includes(ing.toLowerCase());
          })
        )
      );
    }
    
    return results;
  }

  /**
   * Get search suggestions for partial query
   * @param {string} partialQuery - Partial search term
   * @param {number} limit - Maximum number of suggestions
   * @returns {string[]} Array of suggestions
   */
  suggest(partialQuery: string, limit: number = 5): string[] {
    if (!partialQuery || partialQuery.length < 2) return [];
    
    const suggestions = new Set<string>();
    const lowerQuery = partialQuery.toLowerCase();
    
    // Check recipe names
    this.recipes.forEach(recipe => {
      if (recipe.name.toLowerCase().includes(lowerQuery)) {
        suggestions.add(recipe.name);
      }
    });
    
    // Check ingredient names
    this.recipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        const ingName = typeof ing === 'string' ? ing : ing.name;
        if (ingName.toLowerCase().includes(lowerQuery)) {
          suggestions.add(ingName);
        }
      });
    });
    
    // Check cuisine types
    this.recipes.forEach(recipe => {
      if (recipe.cuisine && recipe.cuisine.toLowerCase().includes(lowerQuery)) {
        suggestions.add(recipe.cuisine);
      }
    });
    
    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get search index statistics
   * @returns {Object} Statistics about the search index
   */
  getStatistics(): any {
    const cuisineCount = new Map<string, number>();
    const difficultyCount = new Map<string, number>();
    const ingredientCount = new Map<string, number>();
    
    this.recipes.forEach(recipe => {
      // Count cuisines
      if (recipe.cuisine) {
        cuisineCount.set(recipe.cuisine, (cuisineCount.get(recipe.cuisine) || 0) + 1);
      }
      
      // Count difficulties
      if (recipe.difficulty) {
        difficultyCount.set(recipe.difficulty, (difficultyCount.get(recipe.difficulty) || 0) + 1);
      }
      
      // Count ingredients
      recipe.ingredients.forEach(ing => {
        const ingName = typeof ing === 'string' ? ing : ing.name;
        ingredientCount.set(ingName, (ingredientCount.get(ingName) || 0) + 1);
      });
    });
    
    return {
      totalRecipes: this.recipes.length,
      totalIndexedTerms: this.index.size,
      cuisines: Object.fromEntries(cuisineCount),
      difficulties: Object.fromEntries(difficultyCount),
      topIngredients: Object.fromEntries(
        Array.from(ingredientCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
      ),
      averageIngredientsPerRecipe: this.recipes.length > 0 
        ? this.recipes.reduce((sum, recipe) => sum + recipe.ingredients.length, 0) / this.recipes.length
        : 0
    };
  }
}
