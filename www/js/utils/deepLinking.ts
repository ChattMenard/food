// @ts-check
/**
 * Deep Linking Module
 * Handles deep linking for sharing and external navigation
 */

import { App } from '@capacitor/app';
// @ts-ignore - Capacitor types are declared globally

export class DeepLinkingManager {
  urlHandlers: Map<string, Function>;

  constructor() {
    this.urlHandlers = new Map();
  }

  /**
   * Initialize deep linking
   */
  async init(): Promise<void> {
    try {
      // Handle incoming app URLs
      App.addListener('appUrlOpen', (event: any) => {
        this.handleUrl(event.url);
      });

      // Handle initial URL (if app was opened from a link)
      const initialUrl = await (App as any).getLaunchUrl();
      if (initialUrl) {
        this.handleUrl(initialUrl);
      }

      console.log('[DeepLinking] Initialized');
    } catch (error) {
      console.error('[DeepLinking] Initialization failed:', error);
    }
  }

  /**
   * Register a URL handler
   * @param {string} path - URL path pattern
   * @param {Function} handler - Handler function
   */
  registerHandler(path: string, handler: Function): void {
    this.urlHandlers.set(path, handler);
  }

  /**
   * Handle incoming URL
   * @param {string} url - Incoming URL
   */
  handleUrl(url: string): void {
    console.log('[DeepLinking] Handling URL:', url);

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = Object.fromEntries(urlObj.searchParams);

      // Find matching handler
      for (const [pattern, handler] of this.urlHandlers.entries()) {
        if (path.startsWith(pattern)) {
          handler(params, url);
          return;
        }
      }

      // Default handler
      this.defaultHandler(params, url);
    } catch (error) {
      console.error('[DeepLinking] Failed to handle URL:', error);
    }
  }

  /**
   * Default URL handler
   * @param {Object} params - URL parameters
   * @param {string} url - Full URL
   */
  defaultHandler(params: any, url: string): void {
    console.log('[DeepLinking] No handler for:', url);
    // Navigate to home by default
    window.location.hash = '';
  }

  /**
   * Generate deep link for meal plan sharing
   * @param {string} mealPlanId - Meal plan ID
   * @returns {string} Deep link URL
   */
  generateMealPlanLink(mealPlanId: string): string {
    return `main://meal-plan/${mealPlanId}`;
  }

  /**
   * Generate deep link for recipe
   * @param {number} recipeId - Recipe ID
   * @returns {string} Deep link URL
   */
  generateRecipeLink(recipeId: number): string {
    return `main://recipe/${recipeId}`;
  }

  /**
   * Generate deep link for shopping list
   * @param {string} listId - Shopping list ID
   * @returns {string} Deep link URL
   */
  generateShoppingListLink(listId: string): string {
    return `main://shopping-list/${listId}`;
  }

  /**
   * Register built-in handlers
   */
  registerBuiltInHandlers(): void {
    // Meal plan handler
    this.registerHandler('/meal-plan/', (params: any) => {
      const planId = params.id || params.planId;
      if (planId) {
        // Import meal plan logic here
        console.log('[DeepLinking] Importing meal plan:', planId);
        window.location.hash = 'plan';
      }
    });

    // Recipe handler
    this.registerHandler('/recipe/', (params: any) => {
      const recipeId = params.id;
      if (recipeId) {
        // Open recipe detail logic here
        console.log('[DeepLinking] Opening recipe:', recipeId);
        // Store recipe ID for when the app loads
        sessionStorage.setItem('deepLinkRecipeId', recipeId);
      }
    });

    // Shopping list handler
    this.registerHandler('/shopping-list/', (params: any) => {
      const listId = params.id;
      if (listId) {
        console.log('[DeepLinking] Opening shopping list:', listId);
        window.location.hash = 'shop';
      }
    });
  }
}

// Global deep linking instance
let globalDeepLinking: DeepLinkingManager | null = null;

/**
 * Get or create the global deep linking manager
 * @returns {DeepLinkingManager}
 */
export function getDeepLinkingManager() {
  if (!globalDeepLinking) {
    globalDeepLinking = new DeepLinkingManager();
    globalDeepLinking.registerBuiltInHandlers();
  }
  return globalDeepLinking;
}

/**
 * Initialize deep linking
 */
export async function initDeepLinking() {
  const manager = getDeepLinkingManager();
  await manager.init();
}
