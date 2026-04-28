// @ts-check
import { PreferencesManager } from '../../features/preferencesManager.js;

describe('PreferencesManager', () => {
  let prefs;
  let mockGetPreferences;
  let mockSavePreferencesState;
  let mockUpdateMeals;

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
      expect(prefs.getPreferences).toBe(mockGetPreferences);
      expect(prefs.savePreferencesState).toBe(mockSavePreferencesState);
      expect(prefs.updateMeals).toBe(mockUpdateMeals);
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
      prefs.updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          diets: expect.arrayContaining(['vegetarian', 'keto'])
        })
      );
    });

    it('should include diet select value if not in checkboxes', () => {
      const dietSelect = document.getElementById('diet');
      dietSelect.value = 'paleo';
      dietSelect.selectedIndex = 2; // Select the paleo option
      
      prefs.updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({
          diets: expect.arrayContaining(['vegetarian', 'keto', 'paleo'])
        })
      );
    });

    it('should parse people count as integer', () => {
      document.getElementById('people-count').value = '6';
      prefs.updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({ people: 6 })
      );
    });

    it('should parse max time as integer', () => {
      document.getElementById('max-time').value = '45';
      prefs.updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({ maxTime: 45 })
      );
    });

    it('should set primary diet from first checked', () => {
      prefs.updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({ diet: 'vegetarian' })
      );
    });

    it('should set diet to none if no diets selected', () => {
      document.getElementById('diet-vegetarian').checked = false;
      document.getElementById('diet-keto').checked = false;
      prefs.updatePreferences();
      expect(mockSavePreferencesState).toHaveBeenCalledWith(
        expect.objectContaining({ diet: 'none' })
      );
    });

    it('should call updateMeals after saving', () => {
      prefs.updatePreferences();
      expect(mockUpdateMeals).toHaveBeenCalled();
    });
  });
});
