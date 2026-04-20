const STORAGE_KEYS = {
    pantry: 'pantry',
    mealPlan: 'mealPlan',
    preferences: 'preferences',
    recipeRatings: 'recipeRatings'
};

const DEFAULT_PREFERENCES = {
    people: 1,
    diet: 'none',
    diets: [],
    allergy: 'none',
    cuisine: 'all',
    maxTime: 60,
    difficulty: 'any'
};

function cloneValue(value) {
    if (Array.isArray(value)) {
        return [...value];
    }
    if (value && typeof value === 'object') {
        return { ...value };
    }
    return value;
}

function safeParse(value, fallback) {
    if (!value) return cloneValue(fallback);
    try {
        const parsed = JSON.parse(value);
        if (parsed === null || typeof parsed === 'undefined') {
            return cloneValue(fallback);
        }
        return parsed;
    } catch (error) {
        console.warn('Failed to parse persisted state, falling back to default', error);
        return cloneValue(fallback);
    }
}

export function loadState() {
    const pantry = safeParse(localStorage.getItem(STORAGE_KEYS.pantry), []);
    const mealPlan = safeParse(localStorage.getItem(STORAGE_KEYS.mealPlan), {});
    const recipeRatings = safeParse(localStorage.getItem(STORAGE_KEYS.recipeRatings), {});
    const rawPreferences = safeParse(localStorage.getItem(STORAGE_KEYS.preferences), DEFAULT_PREFERENCES);

    const preferences = {
        ...DEFAULT_PREFERENCES,
        ...rawPreferences,
        diets: Array.isArray(rawPreferences.diets) ? rawPreferences.diets : []
    };

    if (!preferences.diet && preferences.diets.length > 0) {
        preferences.diet = preferences.diets[0];
    }

    return { pantry, mealPlan, preferences, recipeRatings };
}

export function savePantryState(pantry) {
    localStorage.setItem(STORAGE_KEYS.pantry, JSON.stringify(pantry));
}

export function saveMealPlanState(mealPlan) {
    localStorage.setItem(STORAGE_KEYS.mealPlan, JSON.stringify(mealPlan));
}

export function savePreferencesState(preferences) {
    localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
}

export function saveRecipeRatingsState(recipeRatings) {
    localStorage.setItem(STORAGE_KEYS.recipeRatings, JSON.stringify(recipeRatings));
}
