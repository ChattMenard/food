// @ts-check
import { passesDiet, passesAllergy, passesCuisine } from '../../utils/dietFilters.js';
import type { Recipe, PantryItem, UserPreferences, MealPlan } from '../../types/index.js';

const INITIAL_RENDER_COUNT = 20;
const LOAD_BATCH_SIZE = 10;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Compound food names where individual words should NOT match separately.
// e.g. pantry "butter" should NOT match recipe "peanut butter".
const COMPOUND_FOODS = new Set([
    'peanut butter', 'almond butter', 'apple butter', 'cashew butter',
    'cookie butter', 'cocoa butter', 'sun butter', 'sunflower butter',
    'chicken broth', 'beef broth', 'vegetable broth', 'bone broth',
    'soy sauce', 'fish sauce', 'hot sauce', 'oyster sauce',
    'worcestershire sauce', 'hoisin sauce', 'teriyaki sauce',
    'cream cheese', 'cottage cheese', 'goat cheese', 'ricotta cheese',
    'coconut milk', 'almond milk', 'oat milk', 'soy milk', 'buttermilk',
    'coconut oil', 'sesame oil', 'avocado oil', 'vegetable oil', 'canola oil',
    'baking soda', 'baking powder',
    'brown sugar', 'powdered sugar', 'coconut sugar', 'cane sugar',
    'green onion', 'red onion', 'green beans', 'kidney beans', 'black beans',
    'bell pepper', 'cayenne pepper', 'black pepper', 'chili pepper',
    'tomato paste', 'tomato sauce', 'tomato soup',
    'ice cream', 'sour cream', 'whipped cream', 'heavy cream',
    'corn starch', 'corn syrup', 'corn flour',
    'lime juice', 'lemon juice', 'orange juice', 'apple juice',
    'rice vinegar', 'apple cider vinegar', 'balsamic vinegar', 'white vinegar',
    'vanilla extract', 'almond extract',
]);

export class MealPlanner {
    private getPantry: () => PantryItem[];
    private getMealPlan: () => MealPlan;
    private getPreferences: () => UserPreferences;
    private getRecipes: () => Recipe[];
    private persistMealPlan: (mealPlan: MealPlan) => Promise<void>;
    private mealCache: Map<string, Recipe[]>;
    private lastPantryHash: string;
    private isLoadingMore: boolean;
    private domCache: Record<string, HTMLElement | null>;

    constructor({ 
        getPantry, 
        getMealPlan, 
        getPreferences, 
        getRecipes, 
        persistMealPlan 
    }: {
        getPantry: () => PantryItem[];
        getMealPlan: () => MealPlan;
        getPreferences: () => UserPreferences;
        getRecipes: () => Recipe[];
        persistMealPlan: (mealPlan: MealPlan) => Promise<void>;
    }) {
        this.getPantry = getPantry;
        this.getMealPlan = getMealPlan;
        this.getPreferences = getPreferences;
        this.getRecipes = getRecipes;
        this.persistMealPlan = persistMealPlan;
        this.mealCache = new Map();
        this.lastPantryHash = '';
        this.isLoadingMore = false;
        this.domCache = {};
    }

    getDomElement(id: string): HTMLElement | null {
        if (!this.domCache[id]) {
            this.domCache[id] = document.getElementById(id);
        }
        return this.domCache[id];
    }

    generateMealPlan(): void {
        const pantry = this.getPantry();
        const preferences = this.getPreferences();
        const recipes = this.getRecipes();
        
        // Filter recipes based on preferences and available ingredients
        const suitableRecipes = recipes.filter(recipe => {
            return passesDiet(recipe, preferences) &&
                   passesAllergy(recipe, preferences) &&
                   passesCuisine(recipe, preferences) &&
                   this.hasRequiredIngredients(recipe, pantry);
        });

        // Generate meal plan for the week
        const mealPlan: MealPlan = {};
        DAYS.forEach(day => {
            const dayRecipes = this.selectRecipesForDay(suitableRecipes, day);
            mealPlan[day] = dayRecipes.map((recipe, index) => ({
                recipeId: recipe.id,
                date: day,
                meal: index === 0 ? 'breakfast' : index === 1 ? 'lunch' : 'dinner' as const,
                servings: 1
            }));
        });

        this.persistMealPlan(mealPlan);
        this.renderMealPlan(mealPlan);
    }

    private hasRequiredIngredients(recipe: Recipe, pantry: PantryItem[]): boolean {
        const pantryIngredients = pantry.map(item => 
            typeof item === 'string' ? item : item.name
        ).map(name => name.toLowerCase());

        return recipe.ingredients.some(ingredient => {
            const ingName = typeof ingredient === 'string' ? ingredient : ingredient.name;
            return pantryIngredients.some(pantryIng => 
                this.matchesIngredient(pantryIng, ingName.toLowerCase())
            );
        });
    }

    private matchesIngredient(pantryIng: string, recipeIng: string): boolean {
        // Check for exact match
        if (pantryIng === recipeIng) return true;
        
        // Check if recipe ingredient contains pantry ingredient
        if (recipeIng.includes(pantryIng)) return true;
        
        // Check if pantry ingredient contains recipe ingredient
        if (pantryIng.includes(recipeIng)) return true;
        
        return false;
    }

    private selectRecipesForDay(recipes: Recipe[], day: string): Recipe[] {
        // Simple selection - could be enhanced with variety, nutrition, etc.
        const shuffled = [...recipes].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3); // 3 meals per day
    }

    private renderMealPlan(mealPlan: MealPlan): void {
        const container = this.getDomElement('meal-plan-container');
        if (!container) return;

        container.innerHTML = '';
        
        DAYS.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'meal-day';
            
            const dayEntries = mealPlan[day] || [];
            const recipes = this.getRecipes();
            
            dayElement.innerHTML = `
                <h3>${day}</h3>
                <div class="meals">
                    ${dayEntries.map(entry => {
                        const recipe = recipes.find(r => r.id === entry.recipeId);
                        return recipe ? `
                            <div class="meal-item">
                                <h4>${recipe.name}</h4>
                                <p>${recipe.description || ''}</p>
                                <small>${entry.meal} - ${entry.servings} servings</small>
                            </div>
                        ` : '';
                    }).join('') || '<p>No meals planned</p>'}
                </div>
            `;
            container.appendChild(dayElement);
        });
    }

    loadMoreRecipes(): void {
        if (this.isLoadingMore) return;
        this.isLoadingMore = true;
        
        // Implementation for loading more recipes
        setTimeout(() => {
            this.isLoadingMore = false;
        }, 1000);
    }

    getShoppingListItems(): string[] {
        const mealPlan = this.getMealPlan();
        const recipes = this.getRecipes();
        const allIngredients = new Set<string>();
        
        Object.values(mealPlan).forEach(dayMeals => {
            dayMeals.forEach(entry => {
                const recipe = recipes.find(r => r.id === entry.recipeId);
                if (recipe) {
                    recipe.ingredients.forEach(ingredient => {
                        const name = typeof ingredient === 'string' ? ingredient : ingredient.name;
                        allIngredients.add(name);
                    });
                }
            });
        });
        
        return Array.from(allIngredients);
    }
}
