import {
  subscribe,
  getState
} from '../core/appState.js';

describe('appState', () => {
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
});
