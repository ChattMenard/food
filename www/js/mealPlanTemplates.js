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
        this.customTemplates = this.loadCustomTemplates();
    }

    loadCustomTemplates() {
        try {
            const saved = localStorage.getItem('mealPlanTemplates');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    }

    saveCustomTemplates() {
        localStorage.setItem('mealPlanTemplates', JSON.stringify(this.customTemplates));
    }

    getAvailableTemplates() {
        return {
            ...DEFAULT_TEMPLATES,
            ...this.customTemplates
        };
    }

    applyTemplate(templateName) {
        const templates = this.getAvailableTemplates();
        const template = templates[templateName];
        
        if (!template) {
            this.announce('Template not found');
            return false;
        }

        this.setMealPlan({ ...template });
        this.persistMealPlan();
        this.announce(`Applied ${templateName} template`);
        return true;
    }

    saveAsTemplate(name) {
        const mealPlan = this.getMealPlan();
        this.customTemplates[name] = { ...mealPlan };
        this.saveCustomTemplates();
        this.announce(`Saved meal plan as template: ${name}`);
        return true;
    }

    deleteTemplate(name) {
        if (DEFAULT_TEMPLATES[name]) {
            this.announce('Cannot delete default template');
            return false;
        }
        
        delete this.customTemplates[name];
        this.saveCustomTemplates();
        this.announce(`Deleted template: ${name}`);
        return true;
    }
}
