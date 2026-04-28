// @ts-check
/**
 * Cost Tracker Module
 * Tracks ingredient costs and provides budget optimization suggestions
 */

import db from '../data/db.js';

export class CostTracker {
  constructor() {
    this.costDatabase = new Map();
    this.shoppingListCosts = new Map();
    this.budget = 0;
    this.spentThisMonth = 0;
  }

  /**
   * Set monthly budget
   * @param {number} amount - Budget amount
   */
  setBudget(amount) {
    this.budget = amount;
  }

  /**
   * Add cost to database
   * @param {string} ingredient - Ingredient name
   * @param {number} cost - Cost per unit
   * @param {string} unit - Unit (e.g., 'lb', 'kg', 'piece')
   */
  addCost(ingredient, cost, unit = 'piece') {
    this.costDatabase.set(ingredient.toLowerCase(), {
      cost,
      unit,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Get cost for ingredient
   * @param {string} ingredient - Ingredient name
   * @returns {number|null} Cost per unit
   */
  getCost(ingredient) {
    const data = this.costDatabase.get(ingredient.toLowerCase());
    return data ? data.cost : null;
  }

  /**
   * Calculate total cost of shopping list
   * @param {Array} shoppingList - Shopping list items
   * @returns {Object} Cost breakdown
   */
  calculateShoppingListCost(shoppingList) {
    let totalCost = 0;
    const itemCosts = [];
    const unknownCosts = [];

    shoppingList.forEach((item) => {
      const cost = this.getCost(item.name);
      const quantity = item.quantity || 1;

      if (cost !== null) {
        const itemTotal = cost * quantity;
        totalCost += itemTotal;
        itemCosts.push({
          name: item.name,
          costPerUnit: cost,
          quantity,
          total: itemTotal,
        });
      } else {
        unknownCosts.push(item.name);
      }
    });

    return {
      totalCost,
      itemCosts,
      unknownCosts,
      knownPercentage:
        shoppingList.length > 0
          ? (itemCosts.length / shoppingList.length) * 100
          : 0,
    };
  }

  /**
   * Calculate monthly spending from pantry additions
   * @param {Array} pantryItems - Pantry items with purchase dates
   * @returns {Object} Monthly spending breakdown
   */
  calculateMonthlySpending(pantryItems) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalSpent = 0;
    const purchases = [];

    pantryItems.forEach((item) => {
      if (!item.purchaseDate) return;

      const purchaseDate = new Date(item.purchaseDate);

      if (
        purchaseDate.getMonth() === currentMonth &&
        purchaseDate.getFullYear() === currentYear
      ) {
        const cost = item.cost || this.estimateCost(item);
        totalSpent += cost;

        purchases.push({
          name: item.name,
          cost,
          date: item.purchaseDate,
        });
      }
    });

    this.spentThisMonth = totalSpent;

    return {
      totalSpent,
      budget: this.budget,
      remaining: this.budget - totalSpent,
      percentageUsed: this.budget > 0 ? (totalSpent / this.budget) * 100 : 0,
      purchases,
      isOverBudget: totalSpent > this.budget,
    };
  }

  /**
   * Estimate cost of an item
   * @param {Object} item - Item object
   * @returns {number} Estimated cost
   */
  estimateCost(item) {
    const categoryCosts = {
      vegetables: 2.5,
      fruits: 3.0,
      dairy: 4.0,
      meat: 8.0,
      poultry: 6.0,
      fish: 10.0,
      grains: 3.5,
      spices: 1.5,
      condiments: 2.0,
      beverages: 2.5,
      snacks: 4.0,
      other: 3.0,
    };

    const category = item.category || 'other';
    const baseCost = categoryCosts[category] || 3.0;
    const quantity = item.quantity || 1;

    return baseCost * quantity;
  }

  /**
   * Get budget optimization suggestions
   * @param {Array} shoppingList - Shopping list
   * @param {Array} pantry - Current pantry
   * @returns {Array} Optimization suggestions
   */
  getOptimizationSuggestions(shoppingList, pantry) {
    const suggestions = [];
    const pantryNames = new Set(pantry.map((p) => p.name.toLowerCase()));

    // Find items already in pantry
    shoppingList.forEach((item) => {
      if (pantryNames.has(item.name.toLowerCase())) {
        suggestions.push({
          type: 'duplicate',
          priority: 'high',
          message: `You already have ${item.name} in your pantry`,
          savings: this.getCost(item.name) || this.estimateCost(item),
          action: 'remove-from-list',
        });
      }
    });

    // Suggest cheaper alternatives for expensive items
    const itemCosts = this.calculateShoppingListCost(shoppingList);
    const expensiveItems = itemCosts.itemCosts
      .filter((i) => i.total > 5)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    expensiveItems.forEach((item) => {
      suggestions.push({
        type: 'expensive',
        priority: 'medium',
        message: `${item.name} costs $${item.total.toFixed(2)} - consider alternatives`,
        savings: item.total * 0.3, // Assume 30% savings with alternative
        action: 'find-alternative',
      });
    });

    // Budget warning
    const monthlySpending = this.calculateMonthlySpending(pantry);
    if (monthlySpending.percentageUsed > 80) {
      suggestions.push({
        type: 'budget-warning',
        priority: 'urgent',
        message: `You've used ${monthlySpending.percentageUsed.toFixed(0)}% of your monthly budget`,
        savings: monthlySpending.remaining,
        action: 'review-spending',
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Track cost savings from waste reduction
   * @param {number} savings - Amount saved
   */
  async trackSavings(savings) {
    await db.ready;
    const key = 'cost-savings';
    const current = await db.get('preferences', key);
    const currentSavings = current ? parseFloat(current.value) : 0;
    await db.put('preferences', {
      key,
      value: (currentSavings + savings).toString(),
    });
  }

  /**
   * Get total savings tracked
   * @returns {Promise<number>} Total savings
   */
  async getTotalSavings() {
    await db.ready;
    const key = 'cost-savings';
    const current = await db.get('preferences', key);
    return current ? parseFloat(current.value) : 0;
  }

  /**
   * Generate cost report
   * @param {Array} shoppingList - Shopping list
   * @param {Array} pantry - Pantry items
   * @returns {Object} Cost report
   */
  generateReport(shoppingList, pantry) {
    const shoppingCost = this.calculateShoppingListCost(shoppingList);
    const monthlySpending = this.calculateMonthlySpending(pantry);
    const suggestions = this.getOptimizationSuggestions(shoppingList, pantry);

    return {
      date: new Date().toISOString(),
      shoppingList: shoppingCost,
      monthlySpending,
      budget: this.budget,
      totalSavings: this.getTotalSavings(),
      suggestions,
      summary: {
        shoppingTotal: shoppingCost.totalCost,
        monthlySpent: monthlySpending.totalSpent,
        budgetRemaining: monthlySpending.remaining,
        potentialSavings: suggestions.reduce(
          (sum, s) => sum + (s.savings || 0),
          0
        ),
      },
    };
  }
}

// Global cost tracker instance
let globalCostTracker = null;

/**
 * Get or create the global cost tracker
 * @returns {CostTracker}
 */
export function getCostTracker() {
  if (!globalCostTracker) {
    globalCostTracker = new CostTracker();
  }
  return globalCostTracker;
}
