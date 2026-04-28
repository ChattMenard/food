// @ts-check
import db from '../../data/db.js';

const DEFAULT_TEMPLATES = {
    'Quick Week': {
        Monday: 'Quick Pasta',
        Tuesday: 'Easy Stir Fry',
        Wednesday: 'Simple Salad',
        Thursday: 'Quick Sandwich',
        Friday: 'Easy Tacos',
        Saturday: 'Pizza Night',
        Sunday: 'Leftovers'
    },
    'Healthy Balanced': {
        Monday: 'Grilled Chicken Salad',
        Tuesday: 'Salmon with Vegetables',
        Wednesday: 'Quinoa Bowl',
        Thursday: 'Turkey Wrap',
        Friday: 'Fish Tacos',
        Saturday: 'Roasted Vegetables',
        Sunday: 'Soup'
    },
    'Budget Friendly': {
        Monday: 'Pasta',
        Tuesday: 'Rice Bowl',
        Wednesday: 'Eggs',
        Thursday: 'Beans',
        Friday: 'Potatoes',
        Saturday: 'Soup',
        Sunday: 'Casserole'
    }
};

export class MealPlanTemplates {
    constructor({ getMealPlan, setMealPlan, persistMealPlan, getRecipes, announce }) {
        this.getMealPlan = getMealPlan;
        this.setMealPlan = setMealPlan;
        this.persistMealPlan = persistMealPlan;
        this.getRecipes = getRecipes;
        this.announce = announce;
        this.customTemplates = {};
        this.loadCustomTemplates();
    }

    async loadCustomTemplates() {
        try {
            await db.ready;
            const saved = await db.get('preferences', 'mealPlanTemplates');
            this.customTemplates = saved || {};
        } catch {
            this.customTemplates = {};
        }
    }

    async saveCustomTemplates() {
        try {
            await db.ready;
            await db.put('preferences', { ...this.customTemplates, key: 'mealPlanTemplates' });
        } catch (error) {
            console.error('Failed to save custom templates:', error);
        }
    }

    getAvailableTemplates() {
        return {
            ...DEFAULT_TEMPLATES,
            ...this.customTemplates
        };
    }

    async applyTemplate(templateName) {
        const templates = this.getAvailableTemplates();
        const template = templates[templateName];
        
        if (!template) {
            this.announce('Template not found');
            return false;
        }

        this.setMealPlan({ ...template });
        await this.persistMealPlan();
        this.announce(`Applied ${templateName} template`);
        return true;
    }

    async saveAsTemplate(name) {
        const mealPlan = this.getMealPlan();
        this.customTemplates[name] = { ...mealPlan };
        await this.saveCustomTemplates();
        this.announce(`Saved meal plan as template: ${name}`);
        return true;
    }

    async deleteTemplate(name) {
        if (DEFAULT_TEMPLATES[name]) {
            this.announce('Cannot delete default template');
            return false;
        }
        
        delete this.customTemplates[name];
        await this.saveCustomTemplates();
        this.announce(`Deleted template: ${name}`);
        return true;
    }
}
