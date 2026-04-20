import db from '../data/db.js';

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
    recipeRatings: {}
};

// Pub-sub listeners
const listeners = [];

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
    
    const [pantry, mealPlan, preferences, recipeRatings] = await Promise.all([
        db.getPantry(),
        db.getMealPlan(),
        db.getPreferences(),
        db.get('preferences', 'recipeRatings').then(r => r || {})
    ]);

    // Normalize preferences with defaults
    const normalizedPreferences = {
        ...DEFAULT_PREFERENCES,
        ...preferences,
        diets: Array.isArray(preferences.diets) ? preferences.diets : []
    };

    if (!normalizedPreferences.diet && normalizedPreferences.diets.length > 0) {
        normalizedPreferences.diet = normalizedPreferences.diets[0];
    }

    stateCache = {
        pantry,
        mealPlan,
        preferences: normalizedPreferences,
        recipeRatings
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
    stateCache.pantry = pantry;
    notify();
}

/**
 * Save meal plan state to IndexedDB
 * @param {Object} mealPlan - Meal plan object
 */
export async function saveMealPlanState(mealPlan) {
    await db.ready;
    await db.setMealPlan(mealPlan);
    stateCache.mealPlan = mealPlan;
    notify();
}

/**
 * Save preferences state to IndexedDB
 * @param {Object} preferences - Preferences object
 */
export async function savePreferencesState(preferences) {
    await db.ready;
    await db.setPreferences(preferences);
    stateCache.preferences = preferences;
    notify();
}

/**
 * Save recipe ratings state to IndexedDB
 * @param {Object} recipeRatings - Recipe ratings object
 */
export async function saveRecipeRatingsState(recipeRatings) {
    await db.ready;
    await db.put('preferences', { ...recipeRatings, key: 'recipeRatings' });
    stateCache.recipeRatings = recipeRatings;
    notify();
}

/**
 * Get current in-memory state (synchronous)
 * @returns {Object} Current state
 */
export function getState() {
    return stateCache;
}
