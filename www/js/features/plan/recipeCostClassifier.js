// @ts-check
/**
 * Recipe Cost Classifier
 * Classifies recipes into Cheap (C), Normal (N), or Fancy (F) tiers
 * Based on ingredient cost categories and cooking techniques
 */

// Ingredient tier lookup dictionary
const INGREDIENT_TIERS = {
  // Cheap (C) ingredients
  'rice': 'C',
  'pasta': 'C', 
  'potatoes': 'C',
  'flour': 'C',
  'oats': 'C',
  'cornmeal': 'C',
  'breadcrumbs': 'C',
  'beans': 'C',
  'lentils': 'C',
  'chickpeas': 'C',
  'split peas': 'C',
  'onions': 'C',
  'carrots': 'C',
  'cabbage': 'C',
  'celery': 'C',
  'vegetables': 'C',
  'tomatoes': 'C',
  'zucchini': 'C',
  'eggplant': 'C',
  'eggs': 'C',
  'chicken thighs': 'C',
  'chicken': 'C',
  'whole chicken': 'C',
  'tuna': 'C',
  'sardines': 'C',
  'tofu': 'C',
  'paneer': 'C',
  'turkey': 'C',
  'oil': 'C',
  'vegetable oil': 'C',
  'butter': 'C',
  'margarine': 'C',
  'milk': 'C',
  'yogurt': 'C',
  'salt': 'C',
  'sugar': 'C',
  'pepper': 'C',
  'black pepper': 'C',
  'paprika': 'C',
  'garlic powder': 'C',
  'ketchup': 'C',
  'soy sauce': 'C',
  'vinegar': 'C',
  
  // Normal (N) ingredients
  'chicken breast': 'N',
  'beef': 'N',
  'ground beef': 'N',
  'pork': 'N',
  'pork chops': 'N',
  'cheese': 'N',
  'cheddar': 'N',
  'mozzarella': 'N',
  'feta': 'N',
  'fish': 'N',
  'tilapia': 'N',
  'cod': 'N',
  'bell peppers': 'N',
  'peppers': 'N',
  'broccoli': 'N',
  'cauliflower': 'N',
  'mushrooms': 'N',
  'spinach': 'N',
  'lettuce': 'N',
  'cucumbers': 'C',
  'apples': 'N',
  'oranges': 'N',
  'bananas': 'N',
  'grapes': 'N',
  'cream': 'N',
  'sour cream': 'N',
  'bread': 'N',
  'cumin': 'N',
  'oregano': 'N',
  'thyme': 'N',
  'honey': 'N',
  'canned beans': 'N',
  'tomato paste': 'N',
  
  // Fancy (F) ingredients
  'steak': 'F',
  'ribeye': 'F',
  'sirloin': 'F',
  'filet': 'F',
  'lamb chops': 'F',
  'duck': 'F',
  'lobster': 'F',
  'shrimp': 'F',
  'jumbo shrimp': 'F',
  'scallops': 'F',
  'salmon': 'F',
  'wild salmon': 'F',
  'caviar': 'F',
  'prosciutto': 'F',
  'serrano ham': 'F',
  'asparagus': 'F',
  'morel': 'F',
  'chanterelle': 'F',
  'avocado': 'F',
  'truffle': 'F',
  'fresh truffle': 'F',
  'tarragon': 'F',
  'chervil': 'F',
  'basil': 'F',
  'microgreens': 'F',
  'heirloom tomatoes': 'F',
  'brie': 'F',
  'camembert': 'F',
  'gouda': 'F',
  'blue cheese': 'F',
  'triple cream': 'F',
  'clotted cream': 'F',
  'creme fraiche': 'F',
  'saffron': 'F',
  'vanilla bean': 'F',
  'pine nuts': 'F',
  'cashews': 'F',
  'macadamia nuts': 'F',
  'sourdough': 'F',
  'olive oil': 'F',
  'extra virgin olive oil': 'F',
  'wine': 'F',
  'champagne': 'F',
  'edible flowers': 'F'
};

// Fancy cooking techniques that indicate restaurant-style preparation
const FANCY_TECHNIQUES = [
  'sous-vide',
  'sous vide',
  'flambe',
  'flambé',
  'tempering chocolate',
  'laminated dough',
  'pipe',
  'torch',
  'liquid nitrogen',
  'foam',
  'spherification',
  'dry-age',
  'confit',
  'en croute',
  'tuile',
  'fumet',
  'court-bouillon'
];

class RecipeCostClassifier {
  constructor() {
    this.ingredientCache = new Map();
    this.techniqueCache = new Map();
  }

  /**
   * Normalize ingredient name for lookup
   * @param {string} ingredient - Raw ingredient name
   * @returns {string} - Normalized ingredient name
   */
  normalizeIngredient(ingredient) {
    return ingredient.toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove non-alphabetic characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Get the tier for a single ingredient
   * @param {string} ingredient - Ingredient name
   * @returns {string} - 'C', 'N', or 'F'
   */
  getIngredientTier(ingredient) {
    const normalized = this.normalizeIngredient(ingredient);
    
    // Check cache first
    if (this.ingredientCache.has(normalized)) {
      return this.ingredientCache.get(normalized);
    }

    // Direct lookup
    if (INGREDIENT_TIERS[normalized]) {
      this.ingredientCache.set(normalized, INGREDIENT_TIERS[normalized]);
      return INGREDIENT_TIERS[normalized];
    }

    // Partial matching for compound ingredients
    for (const [key, tier] of Object.entries(INGREDIENT_TIERS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        this.ingredientCache.set(normalized, tier);
        return tier;
      }
    }

    // Default to Normal for unlisted ingredients
    this.ingredientCache.set(normalized, 'N');
    return 'N';
  }

  /**
   * Count ingredients by tier in a recipe
   * @param {string[]} ingredients - Array of ingredient names
   * @returns {Object} - Counts for each tier
   */
  countIngredientsByTier(ingredients) {
    const counts = { C: 0, N: 0, F: 0 };
    const uniqueIngredients = new Set();

    ingredients.forEach(ingredient => {
      const tier = this.getIngredientTier(ingredient);
      counts[tier]++;
      uniqueIngredients.add(tier);
    });

    return { counts, uniqueIngredients: Array.from(uniqueIngredients) };
  }

  /**
   * Check if instructions contain fancy techniques
   * @param {string} instructions - Recipe instructions text
   * @returns {boolean} - True if fancy techniques found
   */
  hasFancyTechniques(instructions) {
    if (!instructions) return false;
    
    const normalized = instructions.toLowerCase();
    
    // Check cache first
    if (this.techniqueCache.has(normalized)) {
      return this.techniqueCache.get(normalized);
    }

    const hasFancy = FANCY_TECHNIQUES.some(technique => 
      normalized.includes(technique.toLowerCase())
    );

    this.techniqueCache.set(normalized, hasFancy);
    return hasFancy;
  }

  /**
   * Classify a recipe into C/N/F tier
   * @param {Object} recipe - Recipe object with ingredients and instructions
   * @returns {Object} - Classification result with tier and reasoning
   */
  classifyRecipe(recipe) {
    const { ingredients = [], instructions = '' } = recipe;
    
    // Step 1: Count tiers
    const { counts, uniqueIngredients } = this.countIngredientsByTier(ingredients);
    
    // Step 2: Check for fancy techniques
    const hasFancyTechniques = this.hasFancyTechniques(instructions);
    
    // Step 3: Apply decision logic
    let tier = 'N'; // Default
    let reasoning = [];

    // Any ingredient in F → Fancy
    if (counts.F > 0) {
      tier = 'F';
      reasoning.push(`Contains ${counts.F} fancy ingredient(s)`);
    }
    // No F, and at least 2 N → Normal
    else if (counts.N >= 2) {
      tier = 'N';
      reasoning.push(`Contains ${counts.N} normal ingredients, no fancy ingredients`);
    }
    // No F, fewer than 2 N → Cheap
    else {
      tier = 'C';
      reasoning.push(`Contains only ${counts.N} normal ingredient(s), no fancy ingredients`);
    }

    // Apply exceptions
    if (tier === 'C' && counts.N === 1 && counts.C >= 10) {
      tier = 'C';
      reasoning.push('Exception: 1 normal ingredient with many cheap ingredients → Cheap (dominant cheap volume)');
    }

    if (tier === 'C' && counts.F === 1 && counts.N === 0) {
      tier = 'F';
      reasoning.push('Exception: Single premium ingredient → Fancy');
    }

    if (tier === 'C' && counts.N >= 10 && counts.F === 0) {
      tier = 'N';
      reasoning.push('Exception: High variety but no premium items → Normal');
    }

    // Fancy techniques can upgrade to Fancy
    if (hasFancyTechniques && tier !== 'F') {
      tier = 'F';
      reasoning.push('Upgraded to Fancy due to fancy cooking techniques');
    }

    return {
      tier,
      counts,
      hasFancyTechniques,
      reasoning,
      needsReview: ingredients.some(ing => this.getIngredientTier(ing) === 'N' && !INGREDIENT_TIERS[this.normalizeIngredient(ing)])
    };
  }

  /**
   * Batch classify multiple recipes
   * @param {Object[]} recipes - Array of recipe objects
   * @returns {Object[]} - Array of classification results
   */
  batchClassify(recipes) {
    return recipes.map(recipe => this.classifyRecipe(recipe));
  }

  /**
   * Get classification statistics for a batch of recipes
   * @param {Object[]} recipes - Array of recipe objects
   * @returns {Object} - Statistics by tier
   */
  getClassificationStats(recipes) {
    const results = this.batchClassify(recipes);
    const stats = { C: 0, N: 0, F: 0, total: results.length, needsReview: 0 };

    results.forEach(result => {
      stats[result.tier]++;
      if (result.needsReview) stats.needsReview++;
    });

    return stats;
  }

  /**
   * Clear caches (useful for testing or memory management)
   */
  clearCache() {
    this.ingredientCache.clear();
    this.techniqueCache.clear();
  }
}

// Export singleton instance
const recipeCostClassifier = new RecipeCostClassifier();
export default recipeCostClassifier;
export { RecipeCostClassifier, INGREDIENT_TIERS, FANCY_TECHNIQUES };
