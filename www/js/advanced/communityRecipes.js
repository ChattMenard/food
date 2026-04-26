/**
 * Community Recipes Module
 * Handles recipe submission and community features
 */

export class CommunityRecipes {
  constructor(db) {
    this.db = db;
  }

  /**
   * Submit a recipe to the community
   * @param {Object} recipe - Recipe to submit
   * @returns {Promise<Object>} Submission result
   */
  async submitRecipe(recipe) {
    // Validate recipe
    const validation = this.validateRecipe(recipe);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Add submission metadata
    const submission = {
      ...recipe,
      id: 'community_' + Date.now(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
      likes: 0,
      saves: 0,
    };

    // Save to local storage for syncing
    await this.db.put('communitySubmissions', submission);

    console.log('[CommunityRecipes] Recipe submitted:', submission.id);
    return submission;
  }

  /**
   * Validate recipe submission
   * @param {Object} recipe - Recipe to validate
   * @returns {Object} Validation result
   */
  validateRecipe(recipe) {
    const errors = [];

    if (!recipe.name || recipe.name.trim().length === 0) {
      errors.push('Recipe name is required');
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    }

    if (!recipe.instructions || recipe.instructions.trim().length === 0) {
      errors.push('Instructions are required');
    }

    if (!recipe.time || recipe.time < 0) {
      errors.push('Valid cooking time is required');
    }

    if (!recipe.servings || recipe.servings < 1) {
      errors.push('Valid serving size is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get community recipes
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Community recipes
   */
  async getCommunityRecipes(filters = {}) {
    // In production, fetch from server
    // For now, return local submissions
    const submissions = (await this.db.getAll('communitySubmissions')) || [];

    let filtered = submissions.filter((s) => s.status === 'approved');

    if (filters.cuisine) {
      filtered = filtered.filter((r) => r.cuisine === filters.cuisine);
    }

    if (filters.dietary) {
      filtered = filtered.filter(
        (r) => r.dietary && r.dietary.includes(filters.dietary)
      );
    }

    // Sort by likes
    filtered.sort((a, b) => b.likes - a.likes);

    return filtered;
  }

  /**
   * Like a community recipe
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<Object>} Updated recipe
   */
  async likeRecipe(recipeId) {
    const recipe = await this.db.get('communitySubmissions', recipeId);

    if (recipe) {
      recipe.likes = (recipe.likes || 0) + 1;
      await this.db.put('communitySubmissions', recipe);

      // Track analytics
      if (window.analytics) {
        window.analytics.track('recipe_liked', { recipeId });
      }

      return recipe;
    }

    throw new Error('Recipe not found');
  }

  /**
   * Save a community recipe to user's collection
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<Object>} Saved recipe
   */
  async saveRecipe(recipeId) {
    const recipe = await this.db.get('communitySubmissions', recipeId);

    if (recipe) {
      recipe.saves = (recipe.saves || 0) + 1;
      await this.db.put('communitySubmissions', recipe);

      // Add to user's saved recipes
      const saved = (await this.db.getAll('savedRecipes')) || [];
      saved.push(recipeId);
      await this.db.put('savedRecipes', saved);

      // Track analytics
      if (window.analytics) {
        window.analytics.track('recipe_saved', { recipeId });
      }

      return recipe;
    }

    throw new Error('Recipe not found');
  }

  /**
   * Get user's saved recipes
   * @returns {Promise<Array>} Saved recipe IDs
   */
  async getSavedRecipes() {
    return (await this.db.getAll('savedRecipes')) || [];
  }

  /**
   * Get user's recipe submissions
   * @returns {Promise<Array>} User's submissions
   */
  async getMySubmissions() {
    const submissions = (await this.db.getAll('communitySubmissions')) || [];
    // In production, filter by user ID
    return submissions;
  }

  /**
   * Report a recipe
   * @param {string} recipeId - Recipe ID
   * @param {string} reason - Report reason
   * @returns {Promise<Object>} Report result
   */
  async reportRecipe(recipeId, reason) {
    // In production, send to server
    console.log('[CommunityRecipes] Recipe reported:', recipeId, reason);

    if (window.analytics) {
      window.analytics.track('recipe_reported', { recipeId, reason });
    }

    return { success: true };
  }

  /**
   * Add review to recipe
   * @param {string} recipeId - Recipe ID
   * @param {Object} review - Review object
   * @returns {Promise<Object>} Updated recipe
   */
  async addReview(recipeId, review) {
    const recipe = await this.db.get('communitySubmissions', recipeId);

    if (recipe) {
      if (!recipe.reviews) {
        recipe.reviews = [];
      }

      recipe.reviews.push({
        ...review,
        id: 'review_' + Date.now(),
        createdAt: new Date().toISOString(),
      });

      // Update average rating
      const avgRating =
        recipe.reviews.reduce((sum, r) => sum + r.rating, 0) /
        recipe.reviews.length;
      recipe.rating = Math.round(avgRating * 10) / 10;

      await this.db.put('communitySubmissions', recipe);

      return recipe;
    }

    throw new Error('Recipe not found');
  }

  /**
   * Search community recipes
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  async searchRecipes(query) {
    const recipes = await this.getCommunityRecipes();
    const lowerQuery = query.toLowerCase();

    return recipes.filter((recipe) => {
      return (
        recipe.name.toLowerCase().includes(lowerQuery) ||
        (recipe.ingredients &&
          recipe.ingredients.some((i) => i.toLowerCase().includes(lowerQuery)))
      );
    });
  }
}

// Global community recipes instance
let globalCommunityRecipes = null;

/**
 * Get or create the global community recipes instance
 * @param {Object} db - Database instance
 * @returns {CommunityRecipes}
 */
export function getCommunityRecipes(db) {
  if (!globalCommunityRecipes) {
    globalCommunityRecipes = new CommunityRecipes(db);
  }
  return globalCommunityRecipes;
}
