// @ts-check

export class UIManager {
  private updateMeals: () => void;
  private updateShoppingList: () => void;
  private updateNutrition?: () => void;

  constructor({ updateMeals, updateShoppingList }: { 
    updateMeals: () => void; 
    updateShoppingList: () => void;
  }) {
    this.updateMeals = updateMeals;
    this.updateShoppingList = updateShoppingList;
  }

  showTab(tab: string): void {
    // Hide all tabs
    document
      .querySelectorAll('.tab-content')
      .forEach((t) => t.classList.add('hidden'));
    document.getElementById('tab-' + tab)?.classList.remove('hidden');

    // Update dropdown menu styling
    document
      .querySelectorAll('.nav-dropdown-item')
      .forEach((n) => n.classList.remove('active'));
    document
      .querySelector(`.nav-dropdown-item[data-tab="${tab}"]`)
      ?.classList.add('active');

    // Update dropdown label to show current tab
    const tabLabels: Record<string, string> = {
      pantry: '🥫 Pantry',
      meals: '🍽️ Meals',
      plan: '📅 Plan',
      shop: '🛒 Shop',
      nutrition: '🥗 Nutrition',
    };
    const labelEl = document.getElementById('current-tab-label');
    if (labelEl && tabLabels[tab]) {
      labelEl.textContent = tabLabels[tab];
    }

    // Close dropdown after selection
    const menu = document.getElementById('nav-dropdown-menu');
    if (menu) menu.classList.remove('active');

    // Tab-specific updates
    if (tab === 'meals') this.updateMeals();
    if (tab === 'shop') this.updateShoppingList();
    if (tab === 'nutrition') this.updateNutrition?.();
  }

  announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }

  setUpdateNutrition(fn: () => void): void {
    this.updateNutrition = fn;
  }
}
