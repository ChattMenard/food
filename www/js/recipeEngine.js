import { IngredientVectors } from './ingredientVectors.js';

export class RecipeEngine {
    constructor({ getRecipes, getRecipeRatings, persistRecipeRatings, announce }) {
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
            const similarNames = this.ingredientVectors.findSimilarRecipes(currentRecipe.name, limit);
            return similarNames.map(name => recipes.find(r => r.name === name)).filter(Boolean);
        }

        // Fallback to simple ingredient overlap matching
        const currentIngredients = new Set(
            currentRecipe.ingredients.map(ing => ing.toLowerCase().replace(/[^a-z]/g, ''))
        );

        const similar = recipes
            .filter(r => r.name !== currentRecipe.name)
            .map(recipe => {
                const recipeIngredients = new Set(
                    recipe.ingredients.map(ing => ing.toLowerCase().replace(/[^a-z]/g, ''))
                );
                
                let overlap = 0;
                currentIngredients.forEach(ing => {
                    recipeIngredients.forEach(rIng => {
                        if (ing.includes(rIng) || rIng.includes(ing)) {
                            overlap++;
                        }
                    });
                });

                return {
                    recipe,
                    overlap,
                    similarity: overlap / Math.max(currentIngredients.size, recipeIngredients.size)
                };
            })
            .filter(item => item.overlap > 0)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return similar.map(item => item.recipe);
    }

    openRecipeModal(recipeName) {
        const recipes = this.getRecipes();
        const recipe = recipes.find(r => r.name === recipeName);
        if (!recipe) return;

        document.getElementById('recipe-modal-title').textContent = recipe.name;
        const content = document.getElementById('recipe-modal-content');
        const recipeRatings = this.getRecipeRatings();
        const similarRecipes = this.findSimilarRecipes(recipe, 3);

        content.innerHTML = `
            <div class="grid grid-cols-3 gap-4 text-sm">
                <div class="bg-orange-100 p-3 rounded-lg">
                    <div class="text-gray-600">Time</div>
                    <div class="font-semibold">${recipe.time} min</div>
                </div>
                <div class="bg-orange-100 p-3 rounded-lg">
                    <div class="text-gray-600">Servings</div>
                    <div class="font-semibold">${recipe.servings || 'N/A'}</div>
                </div>
                <div class="bg-orange-100 p-3 rounded-lg">
                    <div class="text-gray-600">Rating</div>
                    <div class="font-semibold">★${recipe.rating || '-'}</div>
                </div>
            </div>
            <div>
                <h4 class="font-semibold mb-2">Your Rating</h4>
                <div class="flex gap-1" id="rating-stars">
                    ${[1,2,3,4,5].map(star => `
                        <button onclick="rateRecipe('${recipe.name.replace(/'/g, "\\'")}', ${star})" class="text-2xl ${star <= (recipeRatings[recipe.name] || 0) ? 'text-orange-500' : 'text-gray-300'} hover:text-orange-400">★</button>
                    `).join('')}
                </div>
            </div>
            <div>
                <h4 class="font-semibold mb-2">Ingredients</h4>
                <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
                    ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
                </ul>
            </div>
            <div>
                <h4 class="font-semibold mb-2">Instructions</h4>
                <p class="text-sm text-gray-700">${recipe.instructions || 'Instructions not available in dataset. Click the recipe link below for full details.'}</p>
            </div>
            ${recipe.nutrition ? `
            <div>
                <h4 class="font-semibold mb-2">Nutrition (per serving)</h4>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    ${Object.entries(recipe.nutrition).map(([key, value]) => `
                        <div class="bg-orange-100 p-2 rounded">
                            <span class="text-gray-600">${key}:</span> <span class="font-medium">${value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            ${similarRecipes.length > 0 ? `
            <div>
                <h4 class="font-semibold mb-2">Similar Recipes</h4>
                <div class="space-y-2">
                    ${similarRecipes.map(similar => `
                        <button onclick="openRecipeModal('${similar.name.replace(/'/g, "\\'")}')" class="w-full text-left p-2 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm">
                            <div class="font-medium">${similar.name}</div>
                            <div class="text-gray-500">${similar.time} min · ★${similar.rating || '-'}</div>
                        </button>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            <div class="flex gap-2 pt-4">
                <button onclick="addToPlanByName('${recipe.name.replace(/'/g, "\\'")}')" class="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">Add to Meal Plan</button>
                ${recipe.verified_url || recipe.fallback_url ? `
                <a href="${recipe.verified_url || recipe.fallback_url}" target="_blank" class="px-4 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50">View Full Recipe</a>
                ` : ''}
            </div>
        `;

        document.getElementById('recipe-modal').classList.remove('hidden');
        document.getElementById('recipe-modal').classList.add('flex');
        this.announce(`Opened recipe details for ${recipe.name}`);
    }

    closeRecipeModal() {
        document.getElementById('recipe-modal').classList.add('hidden');
        document.getElementById('recipe-modal').classList.remove('flex');
    }

    rateRecipe(recipeName, rating) {
        const recipeRatings = this.getRecipeRatings();
        recipeRatings[recipeName] = rating;
        this.persistRecipeRatings();
        this.announce(`Rated ${recipeName} ${rating} stars`);
        this.openRecipeModal(recipeName);
    }
}
