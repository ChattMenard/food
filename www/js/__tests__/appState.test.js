import {
  subscribe,
  getState,
  savePantryState,
  saveMealPlanState,
  savePreferencesState,
  saveRecipeRatingsState,
  saveUserState
} from '../core/appState.js';

jest.mock('../data/db.js', () => ({
  ready: Promise.resolve(),
  getPantry: jest.fn().mockResolvedValue([]),
  setPantry: jest.fn().mockResolvedValue(),
  getMealPlan: jest.fn().mockResolvedValue({}),
  setMealPlan: jest.fn().mockResolvedValue(),
  getPreferences: jest.fn().mockResolvedValue({}),
  setPreferences: jest.fn().mockResolvedValue(),
  put: jest.fn().mockResolvedValue()
}));

jest.mock('../auth/authManager.js', () => ({
  loadSession: jest.fn().mockResolvedValue(null),
  signIn: jest.fn().mockResolvedValue({ id: 'user123', email: 'test@example.com' }),
  signOut: jest.fn().mockResolvedValue()
}));

import db from '../data/db.js';
import authManager from '../auth/authManager.js';

describe('appState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset state cache by importing and modifying it
    const { getState } = require('../core/appState.js');
    const state = getState();
    state.pantry = [];
    state.mealPlan = {};
    state.preferences = { people: 1, diet: 'none', diets: [], allergy: 'none', cuisine: 'all', maxTime: 60, difficulty: 'any' };
    state.recipeRatings = {};
    state.user = null;
  });

  describe('subscribe', () => {
    it('adds listener and returns unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribes listener when returned function is called', () => {
      const listener = jest.fn();
      const unsubscribe = subscribe(listener);
      unsubscribe();
      // Listener should be removed
    });

    it('calls listener when state changes', () => {
      const listener = jest.fn();
      subscribe(listener);
      // Trigger a state change by calling one of the save functions
      saveUserState({ id: 'test' });
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('returns current state cache', () => {
      const state = getState();
      expect(state).toHaveProperty('pantry');
      expect(state).toHaveProperty('mealPlan');
      expect(state).toHaveProperty('preferences');
      expect(state).toHaveProperty('recipeRatings');
      expect(state).toHaveProperty('user');
    });

    it('returns default preferences when no state loaded', () => {
      const state = getState();
      expect(state.preferences).toHaveProperty('people', 1);
      expect(state.preferences).toHaveProperty('diet', 'none');
      expect(state.preferences).toHaveProperty('maxTime', 60);
      expect(state.preferences).toHaveProperty('allergy', 'none');
      expect(state.preferences).toHaveProperty('cuisine', 'all');
    });

    it('returns empty pantry by default', () => {
      const state = getState();
      expect(state.pantry).toEqual([]);
    });

    it('returns empty mealPlan by default', () => {
      const state = getState();
      expect(state.mealPlan).toEqual({});
    });

    it('returns empty recipeRatings by default', () => {
      const state = getState();
      expect(state.recipeRatings).toEqual({});
    });

    it('returns null user by default', () => {
      const state = getState();
      expect(state.user).toBeNull();
    });
  });

  describe('savePantryState', () => {
    it('saves pantry to db and updates state', async () => {
      const pantry = [{ name: 'tomato', quantity: 2 }];
      await savePantryState(pantry);
      expect(db.setPantry).toHaveBeenCalledWith(pantry);
      expect(getState().pantry).toEqual(pantry);
    });
  });

  describe('saveMealPlanState', () => {
    it('saves meal plan to db and updates state', async () => {
      const mealPlan = { Monday: 'Pasta', Tuesday: 'Salad' };
      await saveMealPlanState(mealPlan);
      expect(db.setMealPlan).toHaveBeenCalledWith(mealPlan);
      expect(getState().mealPlan).toEqual(mealPlan);
    });
  });

  describe('savePreferencesState', () => {
    it('saves preferences to db and updates state', async () => {
      const preferences = { people: 4, diet: 'vegetarian' };
      await savePreferencesState(preferences);
      expect(db.setPreferences).toHaveBeenCalledWith(preferences);
      expect(getState().preferences.people).toBe(4);
    });

    it('normalizes preferences with defaults', async () => {
      const preferences = { people: 2 };
      await savePreferencesState(preferences);
      const state = getState();
      expect(state.preferences.people).toBe(2);
      expect(state.preferences.diet).toBe('none');
      expect(state.preferences.maxTime).toBe(60);
    });
  });

  describe('saveRecipeRatingsState', () => {
    it('saves recipe ratings to db and updates state', async () => {
      const ratings = { recipe1: 5, recipe2: 4 };
      await saveRecipeRatingsState(ratings);
      expect(db.put).toHaveBeenCalledWith('preferences', expect.objectContaining({ key: 'recipeRatings' }));
      expect(getState().recipeRatings).toEqual(ratings);
    });
  });

  describe('saveUserState', () => {
    it('updates user state and notifies listeners', async () => {
      const user = { id: 'user123', email: 'test@example.com' };
      await saveUserState(user);
      expect(getState().user).toEqual(user);
    });

    it('sets user to null', async () => {
      await saveUserState(null);
      expect(getState().user).toBeNull();
    });
  });
});
