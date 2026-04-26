import { IngredientVectors } from './ingredientVectors.js';

export class RecipeEngine {
  constructor({
    getRecipes,
    getRecipeRatings,
    persistRecipeRatings,
    announce,
  }) {
    this.getRecipes = getRecipes;
    this.getRecipeRatings = getRecipeRatings;
    this.persistRecipeRatings = persistRecipeRatings;
    this.announce = announce;
    this.ingredientVectors = null;
  }

  buildIngredientVectors() {
    const recipes = this.getRecipes();
    if (recipes.length > 0) {
      this.ingredientVectors = new IngredientVectors(recipes);
    }
  }

  findSimilarRecipes(currentRecipe, limit = 3) {
    const recipes = this.getRecipes();

    // Use vector-based similarity if available, otherwise fall back to simple matching
    if (this.ingredientVectors) {
      const similarNames = this.ingredientVectors.findSimilarRecipes(
        currentRecipe.name,
        limit
      );
      return similarNames
        .map((name) => recipes.find((r) => r.name === name))
        .filter(Boolean);
    }

    // Fallback to simple ingredient overlap matching
    const currentIngredients = new Set(
      currentRecipe.ingredients.map((ing) =>
        ing.toLowerCase().replace(/[^a-z]/g, '')
      )
    );

    const similar = recipes
      .filter((r) => r.name !== currentRecipe.name)
      .map((recipe) => {
        const recipeIngredients = new Set(
          recipe.ingredients.map((ing) =>
            ing.toLowerCase().replace(/[^a-z]/g, '')
          )
        );

        let overlap = 0;
        currentIngredients.forEach((ing) => {
          recipeIngredients.forEach((rIng) => {
            if (ing.includes(rIng) || rIng.includes(ing)) {
              overlap++;
            }
          });
        });

        return {
          recipe,
          overlap,
          similarity:
            overlap / Math.max(currentIngredients.size, recipeIngredients.size),
        };
      })
      .filter((item) => item.overlap > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similar.map((item) => item.recipe);
  }

  getRecipeModalData(recipeName) {
    const recipes = this.getRecipes();
    const recipe = recipes.find((r) => r.name === recipeName);
    if (!recipe) return null;

    const recipeRatings = this.getRecipeRatings();
    const similarRecipes = this.findSimilarRecipes(recipe, 3);

    return {
      recipe,
      recipeRatings,
      similarRecipes,
      currentRating: recipeRatings[recipe.name] || 0,
    };
  }

  openRecipeModal(recipeName) {
    const data = this.getRecipeModalData(recipeName);
    if (!data) return;

    this.announce(`Opened recipe details for ${data.recipe.name}`);
    return data;
  }

  closeRecipeModal() {
    // UI layer should handle closing the modal
  }

  rateRecipe(recipeName, rating) {
    const recipeRatings = this.getRecipeRatings();
    recipeRatings[recipeName] = rating;
    this.persistRecipeRatings();
    this.announce(`Rated ${recipeName} ${rating} stars`);
    this.openRecipeModal(recipeName);
  }
}
