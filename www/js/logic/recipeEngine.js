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

    const { recipe, currentRating, similarRecipes } = data;
    
    // Populate modal
    document.getElementById('recipe-modal-title').textContent = recipe.name;
    
    // Build rating stars
    const ratingStars = [1,2,3,4,5].map(star => {
      const color = star <= currentRating ? 'text-orange-500' : 'text-gray-300';
      const escapedName = recipe.name.replace(/'/g, '\\\'');
      return `<button onclick="rateRecipe('${escapedName}', ${star})" class="text-2xl ${color}">★</button>`;
    }).join('');
    
    // Build similar recipes
    const similarHtml = similarRecipes.slice(0, 3).map(r => {
      const escapedName = r.name.replace(/'/g, '\\\'');
      return `<div class="text-sm text-orange-600 cursor-pointer hover:underline" onclick="openRecipeModal('${escapedName}')">${r.name}</div>`;
    }).join('');
    
    const escapedRecipeName = recipe.name.replace(/'/g, '\\\'');
    
    const content = `
      ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" class="w-full h-48 object-cover rounded-lg mb-4">` : ''}
      
      <div class="mb-4">
        <h3 class="font-semibold mb-2">Ingredients</h3>
        <ul class="list-disc pl-5 space-y-1">
          ${recipe.ingredients.map(ing => `<li class="text-sm">${ing}</li>`).join('')}
        </ul>
      </div>
      
      ${recipe.instructions ? `
        <div class="mb-4">
          <h3 class="font-semibold mb-2">Instructions</h3>
          <p class="text-sm whitespace-pre-line">${recipe.instructions}</p>
        </div>
      ` : ''}
      
      ${recipe.link ? `
        <div class="mb-4">
          <a href="${recipe.link}" target="_blank" class="text-orange-600 hover:underline text-sm">View full recipe →</a>
        </div>
      ` : ''}
      
      <div class="mb-4">
        <h3 class="font-semibold mb-2">Rate this recipe</h3>
        <div class="flex gap-2">
          ${ratingStars}
        </div>
      </div>
      
      <div class="mb-4">
        <button onclick="addRecipeToMealPlan('${escapedRecipeName}')" 
                class="btn btn-primary btn-full">Add to Meal Plan</button>
      </div>
      
      ${similarRecipes.length > 0 ? `
        <div>
          <h3 class="font-semibold mb-2">Similar recipes</h3>
          <div class="space-y-2">
            ${similarHtml}
          </div>
        </div>
      ` : ''}
    `;
    
    document.getElementById('recipe-modal-content').innerHTML = content;
    document.getElementById('recipe-modal').classList.add('active');
    
    this.announce(`Opened recipe details for ${recipe.name}`);
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
