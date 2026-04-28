// @ts-check
import type { UserPreferences } from '../types/index';

export class PreferencesManager {
  private getPreferences: () => UserPreferences;
  private savePreferencesState: (preferences: UserPreferences) => Promise<void>;
  private updateMeals: () => void;
  private domCache: Record<string, HTMLElement | null>;

  constructor({ 
    getPreferences, 
    savePreferencesState, 
    updateMeals 
  }: {
    getPreferences: () => UserPreferences;
    savePreferencesState: (preferences: UserPreferences) => Promise<void>;
    updateMeals: () => void;
  }) {
    this.getPreferences = getPreferences;
    this.savePreferencesState = savePreferencesState;
    this.updateMeals = updateMeals;
    this.domCache = {};
  }

  getDomElement(id: string): HTMLElement | null {
    if (!this.domCache[id]) {
      this.domCache[id] = document.getElementById(id);
    }
    return this.domCache[id];
  }

  async updatePreferences(): Promise<void> {
    const diets: string[] = [];
    const dietCheckboxIds: Record<string, string> = {
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
      const el = this.getDomElement(id) as HTMLInputElement;
      if (el && el.checked) diets.push(value);
    }
    
    const dietSelect = this.getDomElement('diet') as HTMLSelectElement;
    if (
      dietSelect &&
      dietSelect.value &&
      dietSelect.value !== 'none' &&
      !diets.includes(dietSelect.value)
    ) {
      diets.push(dietSelect.value);
    }

    const peopleCountEl = this.getDomElement('people-count') as HTMLInputElement;
    const allergyEl = this.getDomElement('allergy') as HTMLSelectElement;
    const maxTimeEl = this.getDomElement('max-time') as HTMLInputElement;
    const cuisineEl = this.getDomElement('cuisine') as HTMLSelectElement;
    const difficultyEl = this.getDomElement('difficulty') as HTMLSelectElement;

    const preferences: UserPreferences = {
      people: parseInt(peopleCountEl?.value || '1'),
      diets: diets,
      diet: (diets.length > 0 ? diets[0] : 'none') as 'none' | 'vegetarian' | 'vegan' | 'keto' | 'gluten-free' | 'paleo',
      allergy: (allergyEl?.value || 'none') as 'none' | 'nuts' | 'dairy' | 'gluten' | 'soy' | 'shellfish',
      maxTime: parseInt(maxTimeEl?.value || '60'),
      cuisine: cuisineEl?.value || 'all',
      difficulty: (difficultyEl?.value || 'any') as 'any' | 'easy' | 'medium' | 'hard',
    };

    await this.savePreferencesState(preferences);
    this.updateMeals();
  }

  renderPreferences(): void {
    const preferences = this.getPreferences();
    
    // Update people count
    const peopleCountEl = this.getDomElement('people-count') as HTMLInputElement;
    if (peopleCountEl) {
      peopleCountEl.value = preferences.people.toString();
    }

    // Update diet checkboxes
    const dietCheckboxIds: Record<string, string> = {
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
      const el = this.getDomElement(id) as HTMLInputElement;
      if (el) {
        el.checked = preferences.diets.includes(value);
      }
    }

    // Update diet select
    const dietSelect = this.getDomElement('diet') as HTMLSelectElement;
    if (dietSelect) {
      dietSelect.value = preferences.diet;
    }

    // Update other preferences
    const allergyEl = this.getDomElement('allergy') as HTMLSelectElement;
    const maxTimeEl = this.getDomElement('max-time') as HTMLInputElement;
    const cuisineEl = this.getDomElement('cuisine') as HTMLSelectElement;
    const difficultyEl = this.getDomElement('difficulty') as HTMLSelectElement;

    if (allergyEl) allergyEl.value = preferences.allergy;
    if (maxTimeEl) maxTimeEl.value = preferences.maxTime.toString();
    if (cuisineEl) cuisineEl.value = preferences.cuisine;
    if (difficultyEl) difficultyEl.value = preferences.difficulty;
  }

  setupEventListeners(): void {
    // People count change
    const peopleCountEl = this.getDomElement('people-count') as HTMLInputElement;
    if (peopleCountEl) {
      peopleCountEl.addEventListener('change', () => this.updatePreferences());
    }

    // Diet checkboxes
    const dietCheckboxIds: Record<string, string> = {
      'diet-vegetarian': 'vegetarian',
      'diet-vegan': 'vegan',
      'diet-keto': 'keto',
      'diet-glutenfree': 'gluten-free',
      'diet-diabetic': 'diabetic',
      'diet-lowcarb': 'lowcarb',
      'diet-lowsodium': 'lowsodium',
      'diet-heart': 'heart',
    };
    
    for (const id of Object.keys(dietCheckboxIds)) {
      const el = this.getDomElement(id) as HTMLInputElement;
      if (el) {
        el.addEventListener('change', () => this.updatePreferences());
      }
    }

    // Diet select
    const dietSelect = this.getDomElement('diet') as HTMLSelectElement;
    if (dietSelect) {
      dietSelect.addEventListener('change', () => this.updatePreferences());
    }

    // Other preference controls
    const allergyEl = this.getDomElement('allergy') as HTMLSelectElement;
    const maxTimeEl = this.getDomElement('max-time') as HTMLInputElement;
    const cuisineEl = this.getDomElement('cuisine') as HTMLSelectElement;
    const difficultyEl = this.getDomElement('difficulty') as HTMLSelectElement;

    if (allergyEl) allergyEl.addEventListener('change', () => this.updatePreferences());
    if (maxTimeEl) maxTimeEl.addEventListener('change', () => this.updatePreferences());
    if (cuisineEl) cuisineEl.addEventListener('change', () => this.updatePreferences());
    if (difficultyEl) difficultyEl.addEventListener('change', () => this.updatePreferences());
  }

  validatePreferences(): boolean {
    const peopleCountEl = this.getDomElement('people-count') as HTMLInputElement;
    const maxTimeEl = this.getDomElement('max-time') as HTMLInputElement;

    const people = parseInt(peopleCountEl?.value || '1');
    const maxTime = parseInt(maxTimeEl?.value || '60');

    if (people < 1 || people > 20) {
      alert('Number of people must be between 1 and 20');
      return false;
    }

    if (maxTime < 5 || maxTime > 480) {
      alert('Maximum cooking time must be between 5 and 480 minutes');
      return false;
    }

    return true;
  }

  resetToDefaults(): void {
    const defaultPreferences: UserPreferences = {
      people: 1,
      diet: 'none',
      diets: [],
      allergy: 'none',
      cuisine: 'all',
      maxTime: 60,
      difficulty: 'any',
    };

    this.savePreferencesState(defaultPreferences);
    this.renderPreferences();
    this.updateMeals();
  }
}
