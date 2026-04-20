export class UIManager {
    constructor({ updateMeals, updateShoppingList }) {
        this.updateMeals = updateMeals;
        this.updateShoppingList = updateShoppingList;
    }

    showTab(tab) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.getElementById('tab-' + tab).classList.remove('hidden');
        document.querySelectorAll('#nav-pantry, #nav-meals, #nav-plan, #nav-shop').forEach(n => n.classList.remove('tab-active'));
        document.getElementById('nav-' + tab).classList.add('tab-active');
        if (tab === 'meals') this.updateMeals();
        if (tab === 'shop') this.updateShoppingList();
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}
