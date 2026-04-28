/**
 * Cost Tracker Module
 * Tracks ingredient costs and provides budget optimization suggestions
 */

import db from '../data/db';
import type { Ingredient } from '../types/index';

export interface CostData {
  cost: number;
  unit: string;
  lastUpdated: string;
}

export interface ShoppingListItem {
  name: string;
  quantity?: number;
  unit?: string;
}

export interface ItemCostBreakdown {
  name: string;
  costPerUnit: number;
  quantity: number;
  total: number;
}

export interface ShoppingListCostResult {
  totalCost: number;
  itemCosts: ItemCostBreakdown[];
  unknownCosts: string[];
  knownPercentage: number;
}

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'under' | 'on-track' | 'over' | 'warning';
}

export class CostTracker {
  private costDatabase: Map<string, CostData> = new Map();
  private shoppingListCosts: Map<string, number> = new Map();
  private budget: number = 0;
  private spentThisMonth: number = 0;

  constructor() {
    this.costDatabase = new Map();
    this.shoppingListCosts = new Map();
    this.budget = 0;
    this.spentThisMonth = 0;
  }

  /**
   * Set monthly budget
   * @param amount - Budget amount
   */
  setBudget(amount: number): void {
    this.budget = amount;
  }

  /**
   * Add cost to database
   * @param ingredient - Ingredient name
   * @param cost - Cost per unit
   * @param unit - Unit (e.g., 'lb', 'kg', 'piece')
   */
  addCost(ingredient: string, cost: number, unit: string = 'piece'): void {
    this.costDatabase.set(ingredient.toLowerCase(), {
      cost,
      unit,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Get cost for ingredient
   * @param ingredient - Ingredient name
   * @returns Cost per unit or null if not found
   */
  getCost(ingredient: string): number | null {
    const data = this.costDatabase.get(ingredient.toLowerCase());
    return data ? data.cost : null;
  }

  /**
   * Get complete cost data for ingredient
   * @param ingredient - Ingredient name
   * @returns Cost data or null if not found
   */
  getCostData(ingredient: string): CostData | null {
    return this.costDatabase.get(ingredient.toLowerCase()) || null;
  }

  /**
   * Calculate total cost of shopping list
   * @param shoppingList - Shopping list items
   * @returns Cost breakdown
   */
  calculateShoppingListCost(shoppingList: ShoppingListItem[]): ShoppingListCostResult {
    let totalCost = 0;
    const itemCosts: ItemCostBreakdown[] = [];
    const unknownCosts: string[] = [];

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

    const knownPercentage = shoppingList.length > 0 
      ? ((itemCosts.length / shoppingList.length) * 100)
      : 0;

    return {
      totalCost,
      itemCosts,
      unknownCosts,
      knownPercentage,
    };
  }

  /**
   * Get budget status
   * @returns Budget status information
   */
  getBudgetStatus(): BudgetStatus {
    const remaining = this.budget - this.spentThisMonth;
    const percentage = this.budget > 0 ? (this.spentThisMonth / this.budget) * 100 : 0;

    let status: BudgetStatus['status'] = 'under';
    if (percentage > 100) {
      status = 'over';
    } else if (percentage > 90) {
      status = 'warning';
    } else if (percentage > 75) {
      status = 'on-track';
    }

    return {
      budget: this.budget,
      spent: this.spentThisMonth,
      remaining,
      percentage,
      status,
    };
  }

  /**
   * Add expense to monthly tracking
   * @param amount - Amount spent
   * @param category - Expense category
   */
  addExpense(amount: number, category: string = 'groceries'): void {
    this.spentThisMonth += amount;
    this.shoppingListCosts.set(category, (this.shoppingListCosts.get(category) || 0) + amount);
  }

  /**
   * Get spending by category
   * @returns Spending breakdown by category
   */
  getSpendingByCategory(): Map<string, number> {
    return new Map(this.shoppingListCosts);
  }

  /**
   * Find cheaper alternatives for expensive ingredients
   * @param ingredients - List of ingredients to check
   * @returns Suggestions for cheaper alternatives
   */
  findCheaperAlternatives(ingredients: string[]): Array<{
    original: string;
    alternatives: Array<{
      name: string;
      cost: number;
      savings: number;
      savingsPercentage: number;
    }>;
  }> {
    const suggestions: Array<{
      original: string;
      alternatives: Array<{
        name: string;
        cost: number;
        savings: number;
        savingsPercentage: number;
      }>;
    }> = [];

    ingredients.forEach((ingredient) => {
      const originalCost = this.getCost(ingredient);
      if (!originalCost) return;

      const alternatives = this.getAlternatives(ingredient)
        .filter(alt => {
          const altCost = this.getCost(alt);
          return altCost && altCost < originalCost;
        })
        .map(alt => {
          const altCost = this.getCost(alt)!;
          const savings = originalCost - altCost;
          const savingsPercentage = (savings / originalCost) * 100;

          return {
            name: alt,
            cost: altCost,
            savings,
            savingsPercentage,
          };
        })
        .sort((a, b) => b.savingsPercentage - a.savingsPercentage)
        .slice(0, 3); // Top 3 alternatives

      if (alternatives.length > 0) {
        suggestions.push({
          original: ingredient,
          alternatives,
        });
      }
    });

    return suggestions;
  }

  /**
   * Get ingredient alternatives (basic implementation)
   * @param ingredient - Ingredient name
   * @returns Array of alternative ingredients
   */
  private getAlternatives(ingredient: string): string[] {
    const alternatives: Record<string, string[]> = {
      'beef': ['chicken', 'turkey', 'pork', 'tofu'],
      'chicken': ['turkey', 'pork', 'tofu', 'tempeh'],
      'salmon': ['tilapia', 'cod', 'trout', 'sardines'],
      'shrimp': ['scallops', 'clams', 'mussels', 'cod'],
      'rice': ['quinoa', 'couscous', 'pasta', 'potatoes'],
      'pasta': ['rice', 'quinoa', 'couscous', 'potatoes'],
      'cheese': ['nutritional yeast', 'cashew cheese', 'tofu cheese'],
      'milk': ['almond milk', 'soy milk', 'oat milk', 'coconut milk'],
      'butter': ['olive oil', 'coconut oil', 'avocado', 'margarine'],
      'eggs': ['flax eggs', 'chia eggs', 'applesauce', 'banana'],
    };

    const key = ingredient.toLowerCase();
    return alternatives[key] || [];
  }

  /**
   * Optimize shopping list for budget
   * @param shoppingList - Original shopping list
   * @param maxBudget - Maximum budget constraint
   * @returns Optimized shopping list with substitutions
   */
  optimizeForBudget(
    shoppingList: ShoppingListItem[], 
    maxBudget: number
  ): {
    optimizedList: ShoppingListItem[];
    originalCost: number;
    optimizedCost: number;
    savings: number;
    substitutions: Array<{
      original: string;
      substituted: string;
      savings: number;
    }>;
  } {
    const originalResult = this.calculateShoppingListCost(shoppingList);
    const originalCost = originalResult.totalCost;

    if (originalCost <= maxBudget) {
      return {
        optimizedList: shoppingList,
        originalCost,
        optimizedCost: originalCost,
        savings: 0,
        substitutions: [],
      };
    }

    const optimizedList: ShoppingListItem[] = [...shoppingList];
    const substitutions: Array<{
      original: string;
      substituted: string;
      savings: number;
    }> = [];

    // Sort items by cost (highest first) for optimization
    const itemsByCost = shoppingList
      .map(item => ({
        item,
        cost: this.getCost(item.name) || 0,
        quantity: item.quantity || 1,
      }))
      .filter(item => item.cost > 0)
      .sort((a, b) => (b.cost * b.quantity) - (a.cost * a.quantity));

    let currentCost = originalCost;

    for (const { item, cost, quantity } of itemsByCost) {
      if (currentCost <= maxBudget) break;

      const alternatives = this.findCheaperAlternatives([item.name]);
      if (alternatives.length === 0) continue;

      const bestAlternative = alternatives[0]?.alternatives[0];
      if (!bestAlternative) continue;
      
      const savings = bestAlternative.savings * quantity;

      // Apply substitution
      const itemIndex = optimizedList.findIndex(i => i.name === item.name);
      if (itemIndex !== -1) {
        optimizedList[itemIndex] = {
          ...optimizedList[itemIndex],
          name: bestAlternative.name,
        };

        substitutions.push({
          original: item.name,
          substituted: bestAlternative.name,
          savings: savings * quantity,
        });

        currentCost -= savings * quantity;
      }
    }

    return {
      optimizedList,
      originalCost,
      optimizedCost: currentCost,
      savings: originalCost - currentCost,
      substitutions,
    };
  }

  /**
   * Save cost database to persistent storage
   */
  async saveCostDatabase(): Promise<void> {
    const costData = Object.fromEntries(this.costDatabase);
    await db.put('preferences', {
      key: 'costDatabase',
      data: costData,
    });
  }

  /**
   * Load cost database from persistent storage
   */
  async loadCostDatabase(): Promise<void> {
    try {
      const stored = await db.get('preferences', 'costDatabase');
      if (stored && (stored as any).data) {
        this.costDatabase = new Map(Object.entries((stored as any).data));
      }
    } catch (error) {
      console.warn('[CostTracker] Failed to load cost database:', error);
    }
  }

  /**
   * Get cost statistics
   * @returns Cost database statistics
   */
  getStatistics(): {
    totalIngredients: number;
    averageCost: number;
    mostExpensive: Array<{ name: string; cost: number }>;
    leastExpensive: Array<{ name: string; cost: number }>;
  } {
    const costs = Array.from(this.costDatabase.entries())
      .map(([name, data]) => ({ name, cost: data.cost }));

    const totalIngredients = costs.length;
    const averageCost = totalIngredients > 0 
      ? costs.reduce((sum, item) => sum + item.cost, 0) / totalIngredients 
      : 0;

    const sortedByCost = costs.sort((a, b) => b.cost - a.cost);
    const mostExpensive = sortedByCost.slice(0, 5);
    const leastExpensive = sortedByCost.slice(-5).reverse();

    return {
      totalIngredients,
      averageCost,
      mostExpensive,
      leastExpensive,
    };
  }

  /**
   * Reset monthly spending
   */
  resetMonthlySpending(): void {
    this.spentThisMonth = 0;
    this.shoppingListCosts.clear();
  }
}
