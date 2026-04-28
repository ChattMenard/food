// @ts-check
import { PreferencesManager } from '../../features/preferencesManager';

describe('PreferencesManager', () => {
  let prefs: PreferencesManager;
  let mockGetPreferences: jest.Mock;
  let mockSavePreferencesState: jest.Mock;
  let mockUpdateMeals: jest.Mock;

  beforeEach(() => {
    mockGetPreferences = jest.fn();
    mockSavePreferencesState = jest.fn();
    mockUpdateMeals = jest.fn();
    prefs = new PreferencesManager({
      getPreferences: mockGetPreferences,
      savePreferencesState: mockSavePreferencesState,
      updateMeals: mockUpdateMeals
    });
  });

  describe('constructor', () => {
    it('should store dependencies', () => {
      expect((prefs as any).getPreferences).toBe(mockGetPreferences);
      expect((prefs as any).savePreferencesState).toBe(mockSavePreferencesState);
      expect((prefs as any).updateMeals).toBe(mockUpdateMeals);
    });
  });

  describe('updatePreferences', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="diet-vegetarian" type="checkbox" checked>
        <input id="diet-vegan" type="checkbox">
        <input id="diet-keto" type="checkbox" checked>
        <select id="diet">
          <option value="none" selected>None</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="paleo">Paleo</option>
        </select>
        <input id="people-count" value="4">
        <input id="allergy" value="peanuts">
        <input id="max-time" value="60">
        <input id="cuisine" value="italian">
        <input id="difficulty" value="easy">
      `;
    });

    it('should collect checked diet checkboxes', () => {
      (prefs as any).updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          diet: expect.arrayContaining(['vegetarian', 'keto'])
        })
      );
    });

    it('should collect selected diet option', () => {
      (prefs as any).updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          dietType: 'none'
        })
      );
    });

    it('should collect people count', () => {
      (prefs as any).updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          peopleCount: 4
        })
      );
    });

    it('should collect allergies', () => {
      (prefs as any).updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          allergies: ['peanuts']
        })
      );
    });

    it('should collect max cooking time', () => {
      (prefs as any).updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          maxCookingTime: 60
        })
      );
    });

    it('should collect cuisine preferences', () => {
      (prefs as any).updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          cuisine: ['italian']
        })
      );
    });

    it('should collect difficulty level', () => {
      (prefs as any).updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 'easy'
        })
      );
    });

    it('should trigger meal update after saving preferences', () => {
      (prefs as any).updatePreferences();
      expect(mockUpdateMeals).toHaveBeenCalled();
    });

    it('should handle missing elements gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => (prefs as any).updatePreferences()).not.toThrow();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          diet: [],
          dietType: 'none',
          peopleCount: 1,
          allergies: [],
          maxCookingTime: 120,
          cuisine: [],
          difficulty: 'medium'
        })
      );
    });
  });

  describe('loadPreferences', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="diet-vegetarian" type="checkbox">
        <input id="diet-vegan" type="checkbox">
        <input id="diet-keto" type="checkbox">
        <select id="diet">
          <option value="none">None</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="paleo">Paleo</option>
        </select>
        <input id="people-count" value="">
        <input id="allergy" value="">
        <input id="max-time" value="">
        <input id="cuisine" value="">
        <input id="difficulty" value="">
      `;
    });

    it('should populate diet checkboxes', () => {
      const preferences = {
        diet: ['vegetarian', 'keto']
      };
      mockGetPreferences.mockReturnValue(preferences);

      (prefs as any).loadPreferences();

      expect(document.getElementById('diet-vegetarian')).toBeChecked();
      expect(document.getElementById('diet-keto')).toBeChecked();
      expect(document.getElementById('diet-vegan')).not.toBeChecked();
    });

    it('should select diet type', () => {
      const preferences = {
        dietType: 'vegetarian'
      };
      mockGetPreferences.mockReturnValue(preferences);

      (prefs as any).loadPreferences();

      const dietSelect = document.getElementById('diet') as HTMLSelectElement;
      expect(dietSelect.value).toBe('vegetarian');
    });

    it('should populate people count', () => {
      const preferences = {
        peopleCount: 6
      };
      mockGetPreferences.mockReturnValue(preferences);

      (prefs as any).loadPreferences();

      const peopleInput = document.getElementById('people-count') as HTMLInputElement;
      expect(peopleInput.value).toBe('6');
    });

    it('should populate allergies', () => {
      const preferences = {
        allergies: ['peanuts', 'dairy']
      };
      mockGetPreferences.mockReturnValue(preferences);

      (prefs as any).loadPreferences();

      const allergyInput = document.getElementById('allergy') as HTMLInputElement;
      expect(allergyInput.value).toBe('peanuts,dairy');
    });

    it('should populate max cooking time', () => {
      const preferences = {
        maxCookingTime: 45
      };
      mockGetPreferences.mockReturnValue(preferences);

      (prefs as any).loadPreferences();

      const timeInput = document.getElementById('max-time') as HTMLInputElement;
      expect(timeInput.value).toBe('45');
    });

    it('should populate cuisine preferences', () => {
      const preferences = {
        cuisine: ['italian', 'mexican']
      };
      mockGetPreferences.mockReturnValue(preferences);

      (prefs as any).loadPreferences();

      const cuisineInput = document.getElementById('cuisine') as HTMLInputElement;
      expect(cuisineInput.value).toBe('italian,mexican');
    });

    it('should populate difficulty level', () => {
      const preferences = {
        difficulty: 'hard'
      };
      mockGetPreferences.mockReturnValue(preferences);

      (prefs as any).loadPreferences();

      const difficultyInput = document.getElementById('difficulty') as HTMLInputElement;
      expect(difficultyInput.value).toBe('hard');
    });

    it('should handle empty preferences', () => {
      mockGetPreferences.mockReturnValue({});

      (prefs as any).loadPreferences();

      // Should not throw and should use default values
      expect(() => (prefs as any).loadPreferences()).not.toThrow();
    });

    it('should handle null preferences', () => {
      mockGetPreferences.mockReturnValue(null);

      (prefs as any).loadPreferences();

      // Should not throw and should use default values
      expect(() => (prefs as any).loadPreferences()).not.toThrow();
    });
  });

  describe('validatePreferences', () => {
    it('should validate people count', () => {
      const validPrefs = { peopleCount: 4 };
      expect((prefs as any).validatePreferences(validPrefs)).toBe(true);

      const invalidPrefs = { peopleCount: 0 };
      expect((prefs as any).validatePreferences(invalidPrefs)).toBe(false);

      const negativePrefs = { peopleCount: -2 };
      expect((prefs as any).validatePreferences(negativePrefs)).toBe(false);
    });

    it('should validate max cooking time', () => {
      const validPrefs = { maxCookingTime: 60 };
      expect((prefs as any).validatePreferences(validPrefs)).toBe(true);

      const invalidPrefs = { maxCookingTime: 0 };
      expect((prefs as any).validatePreferences(invalidPrefs)).toBe(false);

      const negativePrefs = { maxCookingTime: -30 };
      expect((prefs as any).validatePreferences(negativePrefs)).toBe(false);
    });

    it('should validate diet type', () => {
      const validPrefs = { dietType: 'vegetarian' };
      expect((prefs as any).validatePreferences(validPrefs)).toBe(true);

      const invalidPrefs = { dietType: 'invalid-diet' };
      expect((prefs as any).validatePreferences(invalidPrefs)).toBe(false);
    });

    it('should validate difficulty', () => {
      const validPrefs = { difficulty: 'easy' };
      expect((prefs as any).validatePreferences(validPrefs)).toBe(true);

      const invalidPrefs = { difficulty: 'invalid-difficulty' };
      expect((prefs as any).validatePreferences(invalidPrefs)).toBe(false);
    });
  });

  describe('resetPreferences', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="diet-vegetarian" type="checkbox" checked>
        <select id="diet">
          <option value="vegetarian" selected>Vegetarian</option>
          <option value="none">None</option>
        </select>
        <input id="people-count" value="6">
        <input id="allergy" value="peanuts">
        <input id="max-time" value="90">
        <input id="cuisine" value="italian">
        <input id="difficulty" value="hard">
      `;
    });

    it('should reset all preferences to defaults', () => {
      (prefs as any).resetPreferences();

      expect(document.getElementById('diet-vegetarian')).not.toBeChecked();
      
      const dietSelect = document.getElementById('diet') as HTMLSelectElement;
      expect(dietSelect.value).toBe('none');

      const peopleInput = document.getElementById('people-count') as HTMLInputElement;
      expect(peopleInput.value).toBe('2');

      const allergyInput = document.getElementById('allergy') as HTMLInputElement;
      expect(allergyInput.value).toBe('');

      const timeInput = document.getElementById('max-time') as HTMLInputElement;
      expect(timeInput.value).toBe('30');

      const cuisineInput = document.getElementById('cuisine') as HTMLInputElement;
      expect(cuisineInput.value).toBe('');

      const difficultyInput = document.getElementById('difficulty') as HTMLInputElement;
      expect(difficultyInput.value).toBe('medium');
    });

    it('should save default preferences after reset', () => {
      (prefs as any).resetPreferences();

      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          diet: [],
          dietType: 'none',
          peopleCount: 2,
          allergies: [],
          maxCookingTime: 30,
          cuisine: [],
          difficulty: 'medium'
        })
      );
    });

    it('should trigger meal update after reset', () => {
      (prefs as any).resetPreferences();
      expect(mockUpdateMeals).toHaveBeenCalled();
    });
  });

  describe('getPreferencesSummary', () => {
    it('should return human-readable summary', () => {
      const preferences = {
        diet: ['vegetarian'],
        dietType: 'vegetarian',
        peopleCount: 4,
        allergies: ['nuts'],
        maxCookingTime: 60,
        cuisine: ['italian'],
        difficulty: 'easy'
      };
      mockGetPreferences.mockReturnValue(preferences);

      const summary = (prefs as any).getPreferencesSummary();

      expect(summary).toContain('Vegetarian');
      expect(summary).toContain('4 people');
      expect(summary).toContain('60 minutes');
      expect(summary).toContain('Italian');
      expect(summary).toContain('Easy');
      expect(summary).toContain('Nuts allergy');
    });

    it('should handle empty preferences', () => {
      mockGetPreferences.mockReturnValue({});

      const summary = (prefs as any).getPreferencesSummary();

      expect(summary).toContain('No dietary restrictions');
      expect(summary).toContain('2 people');
      expect(summary).toContain('No allergies');
    });
  });
});
