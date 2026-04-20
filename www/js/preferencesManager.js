export class PreferencesManager {
    constructor({ getPreferences, savePreferencesState, updateMeals }) {
        this.getPreferences = getPreferences;
        this.savePreferencesState = savePreferencesState;
        this.updateMeals = updateMeals;
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
            'diet-heart': 'heart'
        };
        for (const [id, value] of Object.entries(dietCheckboxIds)) {
            const el = document.getElementById(id);
            if (el && el.checked) diets.push(value);
        }
        const dietSelect = document.getElementById('diet');
        if (dietSelect && dietSelect.value && dietSelect.value !== 'none' && !diets.includes(dietSelect.value)) {
            diets.push(dietSelect.value);
        }

        const preferences = {
            people: parseInt(document.getElementById('people-count').value),
            diets: diets,
            diet: diets.length > 0 ? diets[0] : 'none',
            allergy: document.getElementById('allergy').value,
            maxTime: parseInt(document.getElementById('max-time').value),
            cuisine: document.getElementById('cuisine').value,
            difficulty: document.getElementById('difficulty').value
        };
        this.savePreferencesState(preferences);
        this.updateMeals();
    }
}
