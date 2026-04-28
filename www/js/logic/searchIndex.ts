import type { Recipe } from '../types/index.js';

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
}
