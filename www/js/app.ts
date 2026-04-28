// @ts-check
import { log } from './utils/logger';
import { sanitize } from './utils/sanitizer';
import environmentConfig from './config/environment';
import cspManager from './security/csp';
import errorTracker from './monitoring/errorTracker';
import errorBoundary from './ui/errorBoundary';
import offlineManager from './utils/offlineManager';
import accessibilityManager from './accessibility/accessibilityManager';
import analyticsManager from './analytics/analyticsManager';

log.log('=== MODULE START ===');
import { loadState, savePantryState, saveMealPlanState, savePreferencesState, saveRecipeRatingsState, signInUser } from './core/appState';
import { PantryManager } from './features/pantry/pantryManager';
import { MealPlanner } from './features/meals/mealPlanner';
import { RecipeEngine } from './logic/recipeEngine';
import { DataManager } from './data/dataManager';
import { UIManager } from './ui/uiManager';
import { PreferencesManager } from './features/preferencesManager';
import { getSeasonalIngredientSuggestion } from './features/pantry/seasonalIngredients';
import { MealPlanSharing } from './features/plan/mealPlanSharing';
import { MealPlanTemplates } from './features/plan/mealPlanTemplates';
import { LeftoverTracker } from './features/pantry/leftoverTracker';
import { MealPrep } from './features/mealPrep';
import syncProcessor from './data/syncProcessor';
import { registerAllHandlers } from './data/mutationHandlers';
import db from './data/db';
import { performanceMonitor } from './utils/performanceMonitor';

// Lazy-loaded modules
let geminiAI: any = null;
let nutritionGoalsManager: any = null;
let mealHistoryAnalytics: any = null;
let budgetMealPlanner: any = null;
let mealPrepPlanner: any = null;
let groceryDelivery: any = null;
let deviceSyncManager: any = null;
let pushNotifications: any = null;

// Global state
let pantry: any[] = [];
let editingIndex: number = -1;
let recipes: any[] = [];
let autocompleteIngredients: string[] = [];

// Global functions for browser access
function updateMeals(): void {
  // Implementation
}

function updateShoppingList(): void {
  // Implementation
}

// Tab switching
function switchTab(tab: string): void {
  updateMeals();
  updateShoppingList();
}

// Pantry management
function addIngredient(name: string): void {
  const parsed = name.split(/[,;]\s*/).map((s: string) => s.trim()).filter(Boolean);
  parsed.forEach((ingredient: string) => {
    pantry.push(ingredient);
  });
  updateMeals();
}

function removeIngredient(index: number): void {
  pantry.splice(index, 1);
  updateMeals();
}

function editIngredient(index: number, value: string): void {
  pantry[index] = value;
  updateMeals();
}

// Recipe management
function loadRecipes(): void {
  if (!window._recipesLoaded) {
    window._recipesLoaded = true;
    // Recipe loading implementation
  }
}

// State management
function loadAppData(): void {
  loadState();
  loadRecipes();
  updateMeals();
}

function savePreferences(prefs: any): void {
  savePreferencesState(prefs);
  updateMeals();
}

// Meal planning
function saveMealPlan(day: string, meals: any[]): void {
  // Implementation
  updateMeals();
}

function clearMealPlan(): void {
  // Implementation
  updateMeals();
}

// UI helpers
function showTab(tabName: string): void {
  // Implementation
}

function selectSuggestion(text: string): void {
  const input = document.getElementById('new-ingredient') as HTMLInputElement;
  if (input) {
    input.value = text;
    input.focus();
  }
}

// Event handlers
function handleAddIngredient(event: Event): void {
  event.preventDefault();
  const input = document.getElementById('new-ingredient') as HTMLInputElement;
  if (input) {
    addIngredient(input.value);
    input.value = '';
  }
}

function handlePantryInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = input.value.trim();
  
  if (value.length > 0) {
    // Autocomplete logic
  }
}

function handleMealPlanChange(day: string, mealIndex: number, recipeId: string): void {
  // Implementation
  updateMeals();
}

function handlePreferenceChange(key: string, value: any): void {
  // Implementation
  updateMeals();
}

// Shopping list
function generateShoppingList(): string[] {
  const mealPlan = {} as any;
  const ingredients = new Set<string>();
  
  Object.values(mealPlan).forEach((dayMeals: any[]) => {
    dayMeals.forEach((meal: any) => {
      if (meal.ingredients) {
        meal.ingredients.forEach((ing: any) => {
          ingredients.add(typeof ing === 'string' ? ing : ing.name);
        });
      }
    });
  });
  
  return Array.from(ingredients);
}

// Nutrition tracking
function updateNutritionGoals(goals: any): void {
  // Implementation
  if (window.updateTodayNutrition) {
    window.updateTodayNutrition();
  }
  if (window.renderNutritionGoals) {
    window.renderNutritionGoals();
  }
}

// Lazy loading
async function loadAdvancedFeatures(): Promise<void> {
  try {
    // AI features temporarily disabled - geminiAI module not found
    console.warn('AI features temporarily disabled');
  } catch (error) {
    console.error('Failed to load AI features:', error);
  }
}

async function loadNutritionFeatures(): Promise<void> {
  try {
    const { NutritionGoalsManager } = await import('./features/nutrition/nutritionGoals.js');
    nutritionGoalsManager = new NutritionGoalsManager();
  } catch (error) {
    console.error('Failed to load nutrition features:', error);
  }
}

async function loadBudgetFeatures(): Promise<void> {
  try {
    const { BudgetMealPlanner } = await import('./features/plan/budgetMealPlanner.js');
    budgetMealPlanner = new BudgetMealPlanner();
  } catch (error) {
    console.error('Failed to load budget features:', error);
  }
}

// Debounce utility
function debounce(func: Function, wait: number): (...args: any[]) => void {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initialize app
async function initializeApp(): Promise<void> {
  try {
    // Initialize core services
    await db.ready;
    await loadAppData();
    
    // Setup CSP
    cspManager.init();
    
    // Initialize managers
    const uiManager = new UIManager({ updateMeals, updateShoppingList });
    const pantryManager = new PantryManager({
      getPantry: () => pantry,
      persistPantry: savePantryState,
      announce: (message: string) => log.log(message),
      getAutocompleteIngredients: () => autocompleteIngredients,
      getEditingIndex: () => editingIndex,
      setEditingIndex: (index: number) => { editingIndex = index; },
      onPantryChange: updateMeals
    });
    
    // Setup event listeners
    document.addEventListener('DOMContentLoaded', () => {
      // DOM ready initialization
      setupEventListeners();
      loadAdvancedFeatures();
      loadNutritionFeatures();
      loadBudgetFeatures();
    });
    
    // Mark as initialized
    window._appInitialized = true;
    
    log.log('Application initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    errorTracker.reportCustomError?.(error?.message || 'Unknown error', 'initialization', { error });
  }
}

function setupEventListeners(): void {
  // Tab switching
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', (event) => {
      const tab = (event.target as HTMLElement).dataset.tab;
      if (tab) showTab(tab);
    });
  });
  
  // Add ingredient form
  const addForm = document.getElementById('add-ingredient-form');
  if (addForm) {
    addForm.addEventListener('submit', handleAddIngredient);
  }
  
  // Ingredient input
  const ingredientInput = document.getElementById('new-ingredient');
  if (ingredientInput) {
    ingredientInput.addEventListener('input', debounce(handlePantryInput, 300));
  }
}

// Performance monitoring
function trackPerformance(): void {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    // Log memory metrics to console for now
    console.log('[Performance] Memory:', {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    });
    // Mark memory check point
    performanceMonitor.mark?.('memory-check');
  }
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for testing
export {
  pantry,
  recipes,
  addIngredient,
  removeIngredient,
  editIngredient,
  updateMeals,
  updateShoppingList,
  initializeApp
};
