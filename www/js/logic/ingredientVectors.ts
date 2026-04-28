import type { Recipe } from '../types/index';

export interface SimilarityResult {
  name: string;
  similarity: number;
}

export class IngredientVectors {
  private recipes: Recipe[];
  private vocabulary: string[];
  private vectors: Map<string, Map<string, number>>;

  constructor(recipes: Recipe[]) {
    this.recipes = recipes;
    this.vocabulary = this.buildVocabulary();
    this.vectors = this.buildVectors();
  }

  /**
   * Build vocabulary from all recipe ingredients
   * @returns Array of unique ingredient terms
   */
  private buildVocabulary(): string[] {
    const vocab = new Set<string>();
    this.recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        const terms = this.tokenize(typeof ing === 'string' ? ing : ing.name);
        terms.forEach((term) => vocab.add(term));
      });
    });
    return Array.from(vocab);
  }

  /**
   * Tokenize ingredient text into terms
   * @param text - Ingredient text
   * @returns Array of normalized terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 2);
  }

  /**
   * Build term frequency vectors for each recipe
   * @returns Map of recipe names to their ingredient vectors
   */
  private buildVectors(): Map<string, Map<string, number>> {
    const vectors = new Map<string, Map<string, number>>();

    this.recipes.forEach((recipe) => {
      const vector = new Map<string, number>();
      recipe.ingredients.forEach((ing) => {
        const terms = this.tokenize(typeof ing === 'string' ? ing : ing.name);
        terms.forEach((term) => {
          const count = vector.get(term) || 0;
          vector.set(term, count + 1);
        });
      });
      vectors.set(recipe.name, vector);
    });

    return vectors;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param vec1 - First vector
   * @param vec2 - Second vector
   * @returns Cosine similarity score (0-1)
   */
  private cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const allTerms = new Set([...vec1.keys(), ...vec2.keys()]);

    allTerms.forEach((term) => {
      const v1 = vec1.get(term) || 0;
      const v2 = vec2.get(term) || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    });

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Find recipes similar to the given recipe
   * @param recipeName - Name of target recipe
   * @param limit - Maximum number of similar recipes to return
   * @returns Array of similar recipe names
   */
  findSimilarRecipes(recipeName: string, limit: number = 3): string[] {
    const targetVector = this.vectors.get(recipeName);
    if (!targetVector) return [];

    const similarities: SimilarityResult[] = [];
    this.vectors.forEach((vector, name) => {
      if (name === recipeName) return;
      const similarity = this.cosineSimilarity(targetVector, vector);
      if (similarity > 0) {
        similarities.push({ name, similarity });
      }
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit).map((s) => s.name);
  }

  /**
   * Find recipes similar based on ingredient list
   * @param ingredients - Array of ingredient names
   * @param limit - Maximum number of similar recipes to return
   * @returns Array of similar recipe names with similarity scores
   */
  findSimilarByIngredients(ingredients: string[], limit: number = 3): SimilarityResult[] {
    // Build vector for input ingredients
    const inputVector = new Map<string, number>();
    ingredients.forEach((ing) => {
      const terms = this.tokenize(ing);
      terms.forEach((term) => {
        const count = inputVector.get(term) || 0;
        inputVector.set(term, count + 1);
      });
    });

    const similarities: SimilarityResult[] = [];
    this.vectors.forEach((vector, name) => {
      const similarity = this.cosineSimilarity(inputVector, vector);
      if (similarity > 0) {
        similarities.push({ name, similarity });
      }
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit);
  }

  /**
   * Get ingredient overlap between two recipes
   * @param recipe1Name - First recipe name
   * @param recipe2Name - Second recipe name
   * @returns Overlap information
   */
  getIngredientOverlap(recipe1Name: string, recipe2Name: string): {
    commonIngredients: string[];
    overlapPercentage: number;
    uniqueToRecipe1: string[];
    uniqueToRecipe2: string[];
  } {
    const vec1 = this.vectors.get(recipe1Name);
    const vec2 = this.vectors.get(recipe2Name);

    if (!vec1 || !vec2) {
      return {
        commonIngredients: [],
        overlapPercentage: 0,
        uniqueToRecipe1: [],
        uniqueToRecipe2: [],
      };
    }

    const ingredients1 = new Set(vec1.keys());
    const ingredients2 = new Set(vec2.keys());

    const commonIngredients = Array.from(
      new Set([...ingredients1].filter(x => ingredients2.has(x)))
    );

    const uniqueToRecipe1 = Array.from(
      new Set([...ingredients1].filter(x => !ingredients2.has(x)))
    );

    const uniqueToRecipe2 = Array.from(
      new Set([...ingredients2].filter(x => !ingredients1.has(x)))
    );

    const totalUniqueIngredients = new Set([...ingredients1, ...ingredients2]).size;
    const overlapPercentage = totalUniqueIngredients > 0 
      ? (commonIngredients.length / totalUniqueIngredients) * 100 
      : 0;

    return {
      commonIngredients,
      overlapPercentage,
      uniqueToRecipe1,
      uniqueToRecipe2,
    };
  }

  /**
   * Get most similar recipes for a recipe with detailed scores
   * @param recipeName - Name of target recipe
   * @param limit - Maximum number of results
   * @returns Array of similarity results with scores
   */
  getSimilarityScores(recipeName: string, limit: number = 10): SimilarityResult[] {
    const targetVector = this.vectors.get(recipeName);
    if (!targetVector) return [];

    const similarities: SimilarityResult[] = [];
    this.vectors.forEach((vector, name) => {
      if (name === recipeName) return;
      const similarity = this.cosineSimilarity(targetVector, vector);
      similarities.push({ name, similarity });
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit);
  }

  /**
   * Find recipes using specific ingredients
   * @param ingredients - Array of ingredient names to search for
   * @param requireAll - Whether all ingredients must be present (default: false)
   * @returns Array of recipe names that contain the ingredients
   */
  findRecipesWithIngredients(ingredients: string[], requireAll: boolean = false): string[] {
    const matchingRecipes: string[] = [];

    this.vectors.forEach((vector, recipeName) => {
      const recipeIngredients = new Set(vector.keys());
      const searchIngredients = new Set(
        ingredients.flatMap(ing => this.tokenize(ing))
      );

      if (requireAll) {
        // Check if all search ingredients are present
        const hasAll = Array.from(searchIngredients).every(ing => 
          recipeIngredients.has(ing)
        );
        if (hasAll) {
          matchingRecipes.push(recipeName);
        }
      } else {
        // Check if any search ingredient is present
        const hasAny = Array.from(searchIngredients).some(ing => 
          recipeIngredients.has(ing)
        );
        if (hasAny) {
          matchingRecipes.push(recipeName);
        }
      }
    });

    return matchingRecipes;
  }

  /**
   * Get vocabulary statistics
   * @returns Statistics about the ingredient vocabulary
   */
  getVocabularyStats(): {
    totalTerms: number;
    averageTermsPerRecipe: number;
    mostCommonTerms: Array<{ term: string; frequency: number }>;
  } {
    const termFrequency = new Map<string, number>();

    this.vectors.forEach((vector) => {
      vector.forEach((count, term) => {
        termFrequency.set(term, (termFrequency.get(term) || 0) + count);
      });
    });

    const totalTerms = this.vocabulary.length;
    const averageTermsPerRecipe = this.recipes.length > 0 
      ? Array.from(this.vectors.values()).reduce((sum, vec) => sum + vec.size, 0) / this.recipes.length 
      : 0;

    const mostCommonTerms = Array.from(termFrequency.entries())
      .map(([term, frequency]) => ({ term, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      totalTerms,
      averageTermsPerRecipe,
      mostCommonTerms,
    };
  }

  /**
   * Update vectors with new recipes
   * @param newRecipes - Array of new recipes to add
   */
  updateRecipes(newRecipes: Recipe[]): void {
    this.recipes = [...this.recipes, ...newRecipes];
    this.vocabulary = this.buildVocabulary();
    this.vectors = this.buildVectors();
  }

  /**
   * Get the current vocabulary
   * @returns Array of all ingredient terms
   */
  getVocabulary(): string[] {
    return [...this.vocabulary];
  }

  /**
   * Get vector for a specific recipe
   * @param recipeName - Recipe name
   * @returns Ingredient vector or null if not found
   */
  getRecipeVector(recipeName: string): Map<string, number> | null {
    return this.vectors.get(recipeName) || null;
  }
}
