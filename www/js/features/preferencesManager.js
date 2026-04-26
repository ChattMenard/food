export class PreferencesManager {
  constructor({ getPreferences, savePreferencesState, updateMeals }) {
    this.getPreferences = getPreferences;
    this.savePreferencesState = savePreferencesState;
    this.updateMeals = updateMeals;
    this.domCache = {};
  }

  getDomElement(id) {
    if (!this.domCache[id]) {
      this.domCache[id] = document.getElementById(id);
    }
    return this.domCache[id];
  }

  updatePreferences() {
    const diets = [];
    const dietCheckboxIds = {
      'diet-vegetarian': 'vegetarian',
      'diet-vegan': 'vegan',
      'diet-keto': 'keto',
      'diet-glutenfree': 'gluten-free',
      'diet-diabetic': 'diabetic',
      'diet-lowcarb': 'lowcarb',
      'diet-lowsodium': 'lowsodium',
      'diet-heart': 'heart',
    };
    for (const [id, value] of Object.entries(dietCheckboxIds)) {
      const el = this.getDomElement(id);
      if (el && el.checked) diets.push(value);
    }
    const dietSelect = this.getDomElement('diet');
    if (
      dietSelect &&
      dietSelect.value &&
      dietSelect.value !== 'none' &&
      !diets.includes(dietSelect.value)
    ) {
      diets.push(dietSelect.value);
    }

    const preferences = {
      people: parseInt(this.getDomElement('people-count').value),
      diets: diets,
      diet: diets.length > 0 ? diets[0] : 'none',
      allergy: this.getDomElement('allergy').value,
      maxTime: parseInt(this.getDomElement('max-time').value),
      cuisine: this.getDomElement('cuisine').value,
      difficulty: this.getDomElement('difficulty').value,
    };
    this.savePreferencesState(preferences);
    this.updateMeals();
  }
}
