/**
 * Core type definitions for Main application
 * Defines interfaces for all major data structures
 */

// ============================================================================
// Core Data Types
// ============================================================================

export interface Ingredient {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  category?: string;
  cost?: number;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string[];
  minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  rating?: number;
  tags?: string[];
  cuisine?: string;
}

export interface PantryItem extends Ingredient {
  id: string;
  added: Date;
  expires?: Date;
  quantity: number;
}

export interface MealPlanEntry {
  recipeId: string;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
}

export interface MealPlan {
  [date: string]: MealPlanEntry[];
}

// ============================================================================
// User Preference Types
// ============================================================================

export interface DietPreferences {
  people: number;
  diet: 'none' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'gluten-free';
  diets: string[];
  allergy: 'none' | 'nuts' | 'dairy' | 'gluten' | 'soy' | 'shellfish';
  cuisine: string;
  maxTime: number;
  difficulty: 'any' | 'easy' | 'medium' | 'hard';
}

export interface UserPreferences extends DietPreferences {
  budget?: number;
  favoriteRecipes?: string[];
  dietaryRestrictions?: string[];
  nutritionGoals?: NutritionGoals;
}

// ============================================================================
// Nutrition Types
// ============================================================================

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

export interface NutritionProgress {
  current: NutritionData;
  target: NutritionGoals;
  percentage: number;
  status: 'good' | 'warning' | 'under' | 'over';
}

// ============================================================================
// Budget Types
// ============================================================================

export interface BudgetTier {
  id: 'low' | 'medium' | 'high';
  name: string;
  description: string;
  maxPerServing: number;
  weeklyBudget: number;
  icon: string;
}

export interface CostEstimate {
  totalCost: number;
  costPerServing: number;
  ingredients: {
    name: string;
    cost: number;
    substitution?: string;
  }[];
}

// ============================================================================
// Database Types
// ============================================================================

export interface DatabaseSchema {
  recipes: Recipe;
  pantry: PantryItem;
  mealPlan: MealPlan;
  preferences: UserPreferences;
  recipeRatings: Record<string, number>;
  nutritionLogs: NutritionData[];
}

export interface DatabaseOperation<T> {
  type: 'ADD_ITEM' | 'UPDATE_ITEM' | 'DELETE_ITEM';
  store: keyof DatabaseSchema;
  data: T;
  timestamp: number;
}

// ============================================================================
// AI Types
// ============================================================================

export interface AISuggestion {
  type: 'recipe' | 'meal_plan' | 'substitution' | 'tip';
  title: string;
  description: string;
  confidence: number;
  data?: any;
}

export interface AIResponse {
  suggestions: AISuggestion[];
  reasoning?: string;
  timestamp: number;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'web' | 'ios' | 'android';
  lastSync: Date;
  vectorClock: Record<string, number>;
}

export interface SyncConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  strategy: 'last-write-wins' | 'merge-arrays' | 'max-value' | 'min-value' | 'manual';
}

// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationData {
  id: string;
  type: 'meal_prep' | 'expiration' | 'grocery' | 'nutrition' | 'sync_complete';
  title: string;
  body: string;
  scheduled?: Date;
  data?: any;
}

// ============================================================================
// State Management Types
// ============================================================================

export interface AppState {
  pantry: PantryItem[];
  mealPlan: MealPlan;
  preferences: UserPreferences;
  recipeRatings: Record<string, number>;
  user: any | null;
}

export type StateListener = (state: AppState, previousState: AppState) => void;

export type RecipeRatings = Record<string, number>;

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
