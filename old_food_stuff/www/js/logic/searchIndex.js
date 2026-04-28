// @ts-check
export class SearchIndex {
  constructor(recipes) {
    this.recipes = recipes;
    this.index = this.buildIndex();
  }

  buildIndex() {
    const index = new Map();

    this.recipes.forEach((recipe) => {
      const terms = this.extractTerms(recipe.name);
      terms.forEach((term) => {
        if (!index.has(term)) {
          index.set(term, []);
        }
        index.get(term).push(recipe);
      });

      // Index ingredients
      recipe.ingredients.forEach((ing) => {
        const ingTerms = this.extractTerms(ing);
        ingTerms.forEach((term) => {
          if (!index.has(term)) {
            index.set(term, []);
          }
          if (!index.get(term).includes(recipe)) {
            index.get(term).push(recipe);
          }
        });
      });
    });

    return index;
  }

  extractTerms(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2);
  }

  search(query) {
    if (!query || query.trim().length < 2) return [];

    const terms = this.extractTerms(query);
    const results = new Map();

    terms.forEach((term) => {
      const matches = this.index.get(term) || [];
      matches.forEach((recipe) => {
        const count = results.get(recipe) || 0;
        results.set(recipe, count + 1);
      });
    });

    // Sort by number of matching terms
    return Array.from(results.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([recipe]) => recipe);
  }

  updateRecipes(recipes) {
    this.recipes = recipes;
    this.index = this.buildIndex();
  }
}
