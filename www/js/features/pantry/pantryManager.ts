// @ts-check
import { parseIngredients } from '../../utils/ingredientParser';
import type { PantryItem } from '../../types/index';

const INGREDIENT_CATEGORIES: Record<string, string[]> = {
    'Produce': ['lettuce', 'spinach', 'kale', 'cabbage', 'broccoli', 'carrots', 'potatoes', 'onions', 'garlic', 'tomatoes', 'peppers', 'cucumber', 'zucchini', 'bananas', 'apples', 'oranges', 'berries', 'mushrooms', 'avocado', 'lemon', 'lime', 'herbs', 'parsley', 'cilantro', 'basil', 'thyme', 'rosemary'],
    'Dairy & Eggs': ['milk', 'cream', 'yogurt', 'cheese', 'butter', 'eggs', 'sour cream', 'cream cheese'],
    'Meat & Poultry': ['chicken', 'beef', 'pork', 'turkey', 'bacon', 'sausage', 'ham', 'lamb', 'duck'],
    'Seafood': ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'anchovies', 'sardines'],
    'Pantry Staples': ['rice', 'pasta', 'flour', 'sugar', 'oil', 'salt', 'pepper', 'spices', 'honey', 'vinegar', 'soy sauce', 'ketchup', 'mustard', 'mayonnaise'],
    'Canned & Jarred': ['beans', 'tomatoes', 'tuna', 'corn', 'coconut milk', 'jam', 'jelly', 'peanut butter', 'pickles', 'sauce', 'paste'],
    'Bakery': ['bread', 'bagels', 'tortillas', 'crackers', 'cereal', 'granola'],
    'Frozen': ['frozen vegetables', 'frozen fruit', 'ice cream'],
    'Beverages': ['juice', 'soda', 'water', 'coffee', 'tea', 'beer', 'wine'],
    'Plant-Based Proteins': ['tofu', 'tempeh', 'edamame', 'seitan']
};

function getIngredientCategory(ingredient: string): string {
    const name = ingredient.toLowerCase();
    for (const [category, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
        if (keywords.some(k => name.includes(k))) return category;
    }
    return 'Other';
}

export class PantryManager {
    private getPantry: () => PantryItem[];
    private persistPantry: (pantry: PantryItem[]) => Promise<void>;
    private announce: (message: string) => void;
    private getAutocompleteIngredients: () => string[];
    private getEditingIndex: () => number;
    private setEditingIndex: (index: number) => void;
    private onPantryChange: () => void;

    constructor({ 
        getPantry, 
        persistPantry, 
        announce, 
        getAutocompleteIngredients, 
        getEditingIndex, 
        setEditingIndex, 
        onPantryChange 
    }: {
        getPantry: () => PantryItem[];
        persistPantry: (pantry: PantryItem[]) => Promise<void>;
        announce: (message: string) => void;
        getAutocompleteIngredients: () => string[];
        getEditingIndex: () => number;
        setEditingIndex: (index: number) => void;
        onPantryChange?: () => void;
    }) {
        this.getPantry = getPantry;
        this.persistPantry = persistPantry;
        this.announce = announce;
        this.getAutocompleteIngredients = getAutocompleteIngredients;
        this.getEditingIndex = getEditingIndex;
        this.setEditingIndex = setEditingIndex;
        this.onPantryChange = onPantryChange || (() => {});
    }

    showSuggestions(): void {
        const input = document.getElementById('new-ingredient') as HTMLInputElement;
        const box = document.getElementById('ingredient-suggestions');
        if (!input || !box) return;

        const query = input.value.trim().toLowerCase();
        const allIngredients = this.getAutocompleteIngredients();
        
        // Update dropdown
        if (!query) { 
            box.classList.add('hidden'); 
        } else {
            const matches = allIngredients.filter(i => i.includes(query)).slice(0, 10);
            if (matches.length === 0) { 
                box.classList.add('hidden'); 
            } else {
                box.innerHTML = matches.map(m => 
                    `<div onclick="selectSuggestion('${m}')" class="px-4 py-2 hover:bg-purple-200 cursor-pointer capitalize">${m}</div>`
                ).join('');
                box.classList.remove('hidden');
            }
        }
    }

    async addIngredient(name: string): Promise<void> {
        const pantry = this.getPantry();
        const existingIndex = pantry.findIndex(item => 
            (typeof item === 'string' ? item : item.name).toLowerCase() === name.toLowerCase()
        );

        if (existingIndex !== -1) {
            this.announce(`${name} is already in your pantry`);
            return;
        }

        const newItem: PantryItem = {
            id: Date.now().toString(),
            name,
            added: new Date(),
            quantity: 1,
            category: getIngredientCategory(name)
        };

        pantry.push(newItem);
        await this.persistPantry(pantry);
        this.onPantryChange();
        this.announce(`Added ${name} to pantry`);
    }

    async removeIngredient(index: number): Promise<void> {
        const pantry = this.getPantry();
        if (index < 0 || index >= pantry.length) return;

        const item = pantry[index];
        const name = typeof item === 'string' ? item : item.name;
        
        pantry.splice(index, 1);
        await this.persistPantry(pantry);
        this.onPantryChange();
        this.announce(`Removed ${name} from pantry`);
    }

    async updateIngredient(index: number, name: string): Promise<void> {
        const pantry = this.getPantry();
        if (index < 0 || index >= pantry.length) return;

        const item = pantry[index];
        if (typeof item === 'string') {
            pantry[index] = {
                id: Date.now().toString(),
                name,
                added: new Date(),
                quantity: 1,
                category: getIngredientCategory(name)
            };
        } else {
            item.name = name;
            item.category = getIngredientCategory(name);
        }

        await this.persistPantry(pantry);
        this.onPantryChange();
        this.announce(`Updated ingredient to ${name}`);
    }

    parseAndAddIngredients(text: string): void {
        const ingredients = parseIngredients(text);
        const input = document.getElementById('new-ingredient') as HTMLInputElement;
        
        if (ingredients.length > 0) {
            ingredients.forEach(ingredient => {
                this.addIngredient(ingredient);
            });
            input.value = '';
            this.announce(`Added ${ingredients.length} ingredients to pantry`);
        } else {
            this.announce('No ingredients found in text');
        }
    }

    categorizePantry(): Record<string, PantryItem[]> {
        const pantry = this.getPantry();
        const categorized: Record<string, PantryItem[]> = {};

        pantry.forEach(item => {
            const name = typeof item === 'string' ? item : item.name;
            const category = getIngredientCategory(name);
            
            if (!categorized[category]) {
                categorized[category] = [];
            }
            
            const pantryItem: PantryItem = typeof item === 'string' ? {
                id: Date.now().toString(),
                name: item,
                added: new Date(),
                quantity: 1,
                category
            } : item;
            
            categorized[category].push(pantryItem);
        });

        return categorized;
    }

    getExpiringItems(days: number = 7): PantryItem[] {
        const pantry = this.getPantry();
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        return pantry.filter(item => {
            if (typeof item === 'string') return false;
            return item.expires && item.expires <= futureDate;
        }) as PantryItem[];
    }

    getLowStockItems(threshold: number = 1): PantryItem[] {
        const pantry = this.getPantry();
        
        return pantry.filter(item => {
            if (typeof item === 'string') return false;
            return item.quantity <= threshold;
        }) as PantryItem[];
    }
}
