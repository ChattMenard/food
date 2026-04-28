import db from '../data/db';
import authManager from '../auth/authManager';
import type { 
  AppState, 
  UserPreferences, 
  PantryItem, 
  MealPlan, 
  StateListener,
  RecipeRatings 
} from '../types/index';

const DEFAULT_PREFERENCES: UserPreferences = {
  people: 1,
  diet: 'none',
  diets: [],
  allergy: 'none',
  cuisine: 'all',
  maxTime: 60,
  difficulty: 'any',
};

// In-memory state cache
let stateCache: AppState = {
  pantry: [],
  mealPlan: {},
  preferences: { ...DEFAULT_PREFERENCES },
  recipeRatings: {},
  user: null,
};

// Pub-sub listeners
const listeners: StateListener[] = [];

function normalizePreferences(preferences: Partial<UserPreferences> = {}): UserPreferences {
  const normalizedPreferences: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    diets: Array.isArray(preferences.diets) ? preferences.diets : [],
  };

  if (!normalizedPreferences.diet && normalizedPreferences.diets.length > 0) {
    normalizedPreferences.diet = normalizedPreferences.diets[0] as UserPreferences['diet'];
  }

  return normalizedPreferences;
}

function setState(partialState: Partial<AppState>): void {
  const previousState = { ...stateCache };
  stateCache = {
    ...stateCache,
    ...partialState,
  };
  notify(previousState);
}

/**
 * Subscribe to state changes
 * @param fn - Callback function
 * @returns Unsubscribe function
 */
export function subscribe(fn: StateListener): () => void {
  listeners.push(fn);
  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(fn);
    if (index > -1) listeners.splice(index, 1);
  };
}

/**
 * Notify all listeners of state change
 */
function notify(previousState: AppState): void {
  listeners.forEach((fn) => fn(stateCache, previousState));
}

/**
 * Load state from IndexedDB
 * @returns Promise that resolves to state object
 */
export async function loadState(): Promise<AppState> {
  await db.ready;

  const userPromise = authManager.loadSession().catch((error: Error) => {
    console.error('[AppState] Failed to load auth session:', error);
    return null;
  });

  const [pantry, mealPlan, preferences, recipeRatings, user] =
    await Promise.all([
      db.getPantry(),
      db.getMealPlan(),
      db.getPreferences(),
      db.get('preferences', 'recipeRatings').then((r: unknown) => (r as RecipeRatings) || {}),
      userPromise,
    ]);

  stateCache = {
    pantry,
    mealPlan: mealPlan as MealPlan,
    preferences: normalizePreferences(preferences),
    recipeRatings,
    user,
  };

  return stateCache;
}

/**
 * Save pantry state to IndexedDB
 * @param pantry - Pantry array
 */
export async function savePantryState(pantry: PantryItem[]): Promise<void> {
  await db.ready;
  await db.setPantry(pantry);
  setState({ pantry });
}

/**
 * Save meal plan state to IndexedDB
 * @param mealPlan - Meal plan object
 */
export async function saveMealPlanState(mealPlan: MealPlan): Promise<void> {
  await db.ready;
  await db.setMealPlan(mealPlan);
  setState({ mealPlan });
}

/**
 * Save preferences state to IndexedDB
 * @param preferences - Preferences object
 */
export async function savePreferencesState(preferences: UserPreferences): Promise<void> {
  await db.ready;
  await db.setPreferences(preferences);
  setState({ preferences: normalizePreferences(preferences) });
}

/**
 * Save recipe ratings state to IndexedDB
 * @param recipeRatings - Recipe ratings object
 */
export async function saveRecipeRatingsState(recipeRatings: RecipeRatings): Promise<void> {
  await db.ready;
  await db.put('preferences', { ...recipeRatings, key: 'recipeRatings' });
  setState({ recipeRatings });
}

/**
 * Save user state
 * @param user - User object
 */
export async function saveUserState(user: AppState['user']): Promise<void> {
  setState({ user });
}

/**
 * Sign in user
 * @returns Promise that resolves to user object
 */
export async function signInUser(): Promise<AppState['user']> {
  const user = await authManager.signIn();
  await saveUserState(user);
  return user;
}

/**
 * Sign out user
 * @returns Promise that resolves when sign out is complete
 */
export async function signOutUser(): Promise<void> {
  await authManager.signOut();
  await saveUserState(null);
}

/**
 * Get current in-memory state (synchronous)
 * @returns Current state
 */
export function getState(): AppState {
  return stateCache;
}
