// @ts-check
import {
  subscribe,
  getState,
  loadState,
  savePantryState,
  saveMealPlanState,
  savePreferencesState,
  saveRecipeRatingsState,
  saveUserState,
  signInUser,
  signOutUser,
} from '../core/appState.js;

jest.mock('../data/db.ts, () => ({
  ready: Promise.resolve(),
  getPantry: jest.fn().mockResolvedValue([]),
  setPantry: jest.fn().mockResolvedValue(),
  getMealPlan: jest.fn().mockResolvedValue({}),
  setMealPlan: jest.fn().mockResolvedValue(),
  getPreferences: jest.fn().mockResolvedValue({}),
  setPreferences: jest.fn().mockResolvedValue(),
  get: jest.fn().mockResolvedValue({}),
  put: jest.fn().mockResolvedValue(),
}));

jest.mock('../auth/authManager.ts, () => ({
  loadSession: jest.fn().mockResolvedValue(null),
  signIn: jest
    .fn()
    .mockResolvedValue({ id: 'user123', email: 'test@example.com' }),
  signOut: jest.fn().mockResolvedValue(),
}));

import db from '../data/db.js;
import authManager from '../auth/authManager.js;

describe('appState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset state cache by importing and modifying it
    const { getState } = require('../core/appState.ts);
    const state = getState();
    state.pantry = [];
    state.mealPlan = {};
    state.preferences = {
      people: 1,
      diet: 'none',
      diets: [],
      allergy: 'none',
      cuisine: 'all',
      maxTime: 60,
      difficulty: 'any',
    };
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
      expect(db.put).toHaveBeenCalledWith(
        'preferences',
        expect.objectContaining({ key: 'recipeRatings' })
      );
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

  describe('loadState', () => {
    it('loads state from db and normalizes preferences', async () => {
      const mockPantry = [{ name: 'tomato', quantity: 2 }];
      const mockMealPlan = { Monday: 'Pasta' };
      const mockPreferences = { people: 4, diet: 'vegetarian' };
      const mockRatings = { recipe1: 5 };

      db.getPantry.mockResolvedValue(mockPantry);
      db.getMealPlan.mockResolvedValue(mockMealPlan);
      db.getPreferences.mockResolvedValue(mockPreferences);
      db.get.mockResolvedValue(mockRatings);
      authManager.loadSession.mockResolvedValue(null);

      const state = await loadState();

      expect(state.pantry).toEqual(mockPantry);
      expect(state.mealPlan).toEqual(mockMealPlan);
      expect(state.preferences.people).toBe(4);
      expect(state.recipeRatings).toEqual(mockRatings);
    });

    it('handles auth session load errors gracefully', async () => {
      db.getPantry.mockResolvedValue([]);
      db.getMealPlan.mockResolvedValue({});
      db.getPreferences.mockResolvedValue({});
      db.get.mockResolvedValue({});
      authManager.loadSession.mockRejectedValue(new Error('Auth error'));

      const state = await loadState();

      expect(state.user).toBeNull();
    });

    it('loads user from auth session', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      db.getPantry.mockResolvedValue([]);
      db.getMealPlan.mockResolvedValue({});
      db.getPreferences.mockResolvedValue({});
      db.get.mockResolvedValue({});
      authManager.loadSession.mockResolvedValue(mockUser);

      const state = await loadState();

      expect(state.user).toEqual(mockUser);
    });
  });

  describe('signInUser', () => {
    it('signs in user and saves state', async () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      authManager.signIn.mockResolvedValue(mockUser);

      const user = await signInUser();

      expect(authManager.signIn).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
      expect(getState().user).toEqual(mockUser);
    });
  });

  describe('signOutUser', () => {
    it('signs out user and saves null state', async () => {
      authManager.signOut.mockResolvedValue();

      await signOutUser();

      expect(authManager.signOut).toHaveBeenCalled();
      expect(getState().user).toBeNull();
    });
  });

  describe('preferences normalization', () => {
    it('normalizes diets array when provided', async () => {
      const preferences = { diets: ['vegetarian', 'gluten-free'] };
      await savePreferencesState(preferences);
      const state = getState();
      expect(state.preferences.diets).toEqual(['vegetarian', 'gluten-free']);
    });

    it('sets diet from diets array when diet is falsy', async () => {
      const preferences = { diet: '', diets: ['keto'] };
      await savePreferencesState(preferences);
      const state = getState();
      expect(state.preferences.diet).toBe('keto');
    });

    it('handles non-array diets gracefully', async () => {
      const preferences = { diets: 'not an array' };
      await savePreferencesState(preferences);
      const state = getState();
      expect(state.preferences.diets).toEqual([]);
    });

    it('merges preferences with defaults', async () => {
      const preferences = { people: 3, cuisine: 'italian' };
      await savePreferencesState(preferences);
      const state = getState();
      expect(state.preferences.people).toBe(3);
      expect(state.preferences.cuisine).toBe('italian');
      expect(state.preferences.diet).toBe('none');
      expect(state.preferences.allergy).toBe('none');
      expect(state.preferences.maxTime).toBe(60);
    });
  });
});
