// @ts-check
import db from '../data/db.js;

describe('PantryDB', () => {
  beforeAll(async () => {
    await db.ready;
  });

  beforeEach(async () => {
    // Clear all object stores instead of deleting the database
    const stores = [
      'recipes',
      'pantry',
      'mealPlan',
      'preferences',
      'nutritionLog',
      'searchIndex',
      'queuedMutations',
    ];

    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const transaction = db.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = resolve;
        request.onerror = reject;
      });
    }
  });

  it('stores and retrieves pantry items', async () => {
    await db.addPantryItem({ id: 1, name: 'Beans', quantity: 3 });
    await db.addPantryItem({ id: 2, name: 'Rice', quantity: 1 });

    const pantry = await db.getPantry();
    expect(pantry).toHaveLength(2);
    expect(pantry.map((item) => item.name)).toEqual(['Beans', 'Rice']);
  });

  it('persists and returns meal plan data', async () => {
    const plan = {
      '2024-01-01': { recipeId: 11, meal: 'Lunch' },
      '2024-01-02': { recipeId: 12, meal: 'Dinner' },
    };

    await db.setMealPlan(plan);
    const storedPlan = await db.getMealPlan();

    expect(Object.keys(storedPlan)).toHaveLength(2);
    expect(storedPlan['2024-01-02'].recipeId).toBe(12);
  });

  it('logs nutrition entries and aggregates daily totals', async () => {
    const recipe = {
      id: 100,
      name: 'Protein Shake',
      nutrition: { calories: 250, protein: 20, fat: 5, carbs: 30 },
    };

    await db.put('recipes', recipe);
    const log = await db.logNutrition('2024-01-05', recipe.id, 2);

    expect(log.recipeName).toBe('Protein Shake');
    expect(log.nutrition.calories).toBe(500);

    const daily = await db.getDailyNutrition('2024-01-05');
    expect(daily.totals.protein).toBe(40);
    expect(daily.meals).toHaveLength(1);
  });

  it('builds search index and returns recipe matches', async () => {
    const recipes = [
      {
        id: 201,
        name: 'Creamy Pasta',
        ingredients_clean: ['pasta', 'cream'],
        nutrition: { calories: 400 },
        dietary_flags: {},
        cuisine: 'italian',
      },
      {
        id: 202,
        name: 'Garden Salad',
        ingredients_clean: ['lettuce', 'tomato'],
        nutrition: { calories: 150 },
        dietary_flags: {},
        cuisine: 'mediterranean',
      },
    ];

    for (const recipe of recipes) {
      await db.put('recipes', recipe);
    }

    await db.buildSearchIndex(recipes);
    const results = await db.searchRecipes('pasta');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Creamy Pasta');
  });
});
