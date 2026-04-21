import db from '../data/db.js';
import authManager from '../auth/authManager.js';

const DEFAULT_PREFERENCES = {
    people: 1,
    diet: 'none',
    diets: [],
    allergy: 'none',
    cuisine: 'all',
    maxTime: 60,
    difficulty: 'any'
};

// In-memory state cache
let stateCache = {
    pantry: [],
    mealPlan: {},
    preferences: { ...DEFAULT_PREFERENCES },
    recipeRatings: {},
    user: null
};

// Pub-sub listeners
const listeners = [];

function normalizePreferences(preferences = {}) {
    const normalizedPreferences = {
        ...DEFAULT_PREFERENCES,
        ...preferences,
        diets: Array.isArray(preferences.diets) ? preferences.diets : []
    };

    if (!normalizedPreferences.diet && normalizedPreferences.diets.length > 0) {
        normalizedPreferences.diet = normalizedPreferences.diets[0];
    }

    return normalizedPreferences;
}

function setState(partialState) {
    stateCache = {
        ...stateCache,
        ...partialState
    };
}

/**
 * Subscribe to state changes
 * @param {Function} fn - Callback function
 */
export function subscribe(fn) {
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
function notify() {
    listeners.forEach(fn => fn(stateCache));
}

/**
 * Load state from IndexedDB
 * @returns {Promise<Object>} State object
 */
export async function loadState() {
    await db.ready;
    
    const userPromise = authManager.loadSession().catch(error => {
        console.error('[AppState] Failed to load auth session:', error);
        return null;
    });
    
    const [pantry, mealPlan, preferences, recipeRatings, user] = await Promise.all([
        db.getPantry(),
        db.getMealPlan(),
        db.getPreferences(),
        db.get('preferences', 'recipeRatings').then(r => r || {}),
        userPromise
    ]);

    stateCache = {
        pantry,
        mealPlan,
        preferences: normalizePreferences(preferences),
        recipeRatings,
        user
    };

    return stateCache;
}

/**
 * Save pantry state to IndexedDB
 * @param {Array} pantry - Pantry array
 */
export async function savePantryState(pantry) {
    await db.ready;
    await db.setPantry(pantry);
    setState({ pantry });
    notify();
}

/**
 * Save meal plan state to IndexedDB
 * @param {Object} mealPlan - Meal plan object
 */
export async function saveMealPlanState(mealPlan) {
    await db.ready;
    await db.setMealPlan(mealPlan);
    setState({ mealPlan });
    notify();
}

/**
 * Save preferences state to IndexedDB
 * @param {Object} preferences - Preferences object
 */
export async function savePreferencesState(preferences) {
    await db.ready;
    await db.setPreferences(preferences);
    setState({ preferences: normalizePreferences(preferences) });
    notify();
}

/**
 * Save recipe ratings state to IndexedDB
 * @param {Object} recipeRatings - Recipe ratings object
 */
export async function saveRecipeRatingsState(recipeRatings) {
    await db.ready;
    await db.put('preferences', { ...recipeRatings, key: 'recipeRatings' });
    setState({ recipeRatings });
    notify();
}

/**
 * Save user state
 * @param {Object} user - User object
 */
export async function saveUserState(user) {
    setState({ user });
    notify();
}

/**
 * Sign in user
 * @returns {Promise<Object>} User object
 */
export async function signInUser() {
    const user = await authManager.signIn();
    await saveUserState(user);
    return user;
}

/**
 * Sign out user
 * @returns {Promise<void>}
 */
export async function signOutUser() {
    await authManager.signOut();
    await saveUserState(null);
}

/**
 * Get current in-memory state (synchronous)
 * @returns {Object} Current state
 */
export function getState() {
    return stateCache;
}
