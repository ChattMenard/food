/**
 * Main IndexedDB Database Layer
 * Provides persistent storage for recipes, pantry items, meal plans, preferences, and nutrition logs
 */
import type { 
  Recipe, 
  PantryItem, 
  MealPlan, 
  UserPreferences, 
  NutritionData,
  DatabaseOperation 
} from '../types/index';

const DB_NAME = 'main-pro';
const DB_VERSION = 4;

/**
 * Main database class
 * Handles all IndexedDB operations for persistent storage
 */
class PantryDB {
  db: IDBDatabase | null = null;
  ready: Promise<void>;

  constructor() {
    this.db = null;
    this.ready = this.init();
  }

  /**
   * Initialize the IndexedDB database and create object stores
   * @returns Promise that resolves when database is ready
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('recipes')) {
          const recipeStore = db.createObjectStore('recipes', {
            keyPath: 'id',
          });
          recipeStore.createIndex('by_rating', 'rating', { unique: false });
          recipeStore.createIndex('by_time', 'minutes', { unique: false });
          recipeStore.createIndex('by_calories', 'nutrition.calories', {
            unique: false,
          });
          recipeStore.createIndex('by_cuisine', 'cuisine', { unique: false });
          recipeStore.createIndex('by_vegetarian', 'dietary_flags.vegetarian', {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains('pantry')) {
          const pantryStore = db.createObjectStore('pantry', {
            keyPath: 'id',
            autoIncrement: true,
          });
          pantryStore.createIndex('by_date', 'purchaseDate', { unique: false });
          pantryStore.createIndex('by_name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('mealPlan')) {
          db.createObjectStore('mealPlan', { keyPath: 'date' });
        }

        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('nutritionLog')) {
          const logStore = db.createObjectStore('nutritionLog', {
            keyPath: 'id',
            autoIncrement: true,
          });
          logStore.createIndex('by_date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('searchIndex')) {
          db.createObjectStore('searchIndex');
        }

        if (!db.objectStoreNames.contains('queuedMutations')) {
          const mutationStore = db.createObjectStore('queuedMutations', {
            keyPath: 'id',
          });
          mutationStore.createIndex('status', 'status', { unique: false });
          mutationStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
        }
      };
    });
  }

  /**
   * Load recipe dataset from external file and store in IndexedDB
   * @param progressCallback - Callback for progress updates (progress, count)
   * @returns Promise that resolves to number of recipes loaded
   */
  async loadRecipes(progressCallback?: (progress: number, count: number) => void): Promise<number> {
    await this.ready;

    const existing = await this.count('recipes');
    if (existing > 0) {
      console.log(`[DB] ${existing} recipes already loaded, skipping import`);
      return existing;
    }

    try {
      const response = await fetch('/data/recipes_enhanced.json.gz');
      if (!response.ok) {
        throw new Error(`Failed to fetch recipes: ${response.statusText}`);
      }

      const compressedData = await response.arrayBuffer();
      const decompressed = new Response(compressedData).arrayBuffer();
      const decoder = new TextDecoder();
      const jsonText = decoder.decode(await decompressed);
      const recipes: Recipe[] = JSON.parse(jsonText);

      if (!Array.isArray(recipes)) {
        throw new Error('Invalid recipe data format');
      }

      console.log(`[DB] Loading ${recipes.length} recipes into IndexedDB`);

      const transaction = this.db!.transaction('recipes', 'readwrite');
      const store = transaction.objectStore('recipes');

      let loaded = 0;
      const batchSize = 100;

      for (let i = 0; i < recipes.length; i += batchSize) {
        const batch = recipes.slice(i, i + batchSize);
        
        for (const recipe of batch) {
          store.put(recipe);
          loaded++;

          if (progressCallback && loaded % 100 === 0) {
            progressCallback(loaded / recipes.length, loaded);
          }
        }

        // Allow event loop to process
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      await this.transactionDone(transaction);
      
      if (progressCallback) {
        progressCallback(1, loaded);
      }

      console.log(`[DB] Successfully loaded ${loaded} recipes`);
      return loaded;

    } catch (error) {
      console.error('[DB] Failed to load recipes:', error);
      throw error;
    }
  }

  /**
   * Generic get operation
   * @param store - Object store name
   * @param key - Record key
   * @returns Promise that resolves to the record
   */
  async get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
    await this.ready;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readonly');
      const request = transaction.objectStore(store).get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic put operation
   * @param store - Object store name
   * @param data - Data to store
   * @returns Promise that resolves when operation is complete
   */
  async put<T>(store: string, data: T): Promise<void> {
    await this.ready;
    const transaction = this.db!.transaction(store, 'readwrite');
    transaction.objectStore(store).put(data);
    return this.transactionDone(transaction);
  }

  /**
   * Generic add operation (alias for put)
   * @param store - Object store name
   * @param data - Data to add
   * @returns Promise that resolves when operation is complete
   */
  async add<T>(store: string, data: T): Promise<void> {
    await this.ready;
    const transaction = this.db!.transaction(store, 'readwrite');
    transaction.objectStore(store).add(data);
    return this.transactionDone(transaction);
  }

  /**
   * Generic delete operation
   * @param store - Object store name
   * @param key - Record key
   * @returns Promise that resolves when operation is complete
   */
  async delete(store: string, key: IDBValidKey): Promise<void> {
    await this.ready;
    const transaction = this.db!.transaction(store, 'readwrite');
    transaction.objectStore(store).delete(key);
    return this.transactionDone(transaction);
  }

  /**
   * Count records in a store
   * @param store - Object store name
   * @returns Promise that resolves to record count
   */
  async count(store: string): Promise<number> {
    await this.ready;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readonly');
      const request = transaction.objectStore(store).count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all records from a store
   * @param store - Object store name
   * @returns Promise that resolves to array of records
   */
  async getAll<T>(store: string): Promise<T[]> {
    await this.ready;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readonly');
      const request = transaction.objectStore(store).getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all records from a store
   * @param store - Object store name
   * @returns Promise that resolves when operation is complete
   */
  async clear(store: string): Promise<void> {
    await this.ready;
    const transaction = this.db!.transaction(store, 'readwrite');
    transaction.objectStore(store).clear();
    return this.transactionDone(transaction);
  }

  /**
   * Wait for transaction to complete
   * @param transaction - IDB transaction
   * @returns Promise that resolves when transaction is complete
   */
  private transactionDone(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
  }

  // ============================================================================
  // Specific Operations
  // ============================================================================

  /**
   * Get pantry items
   * @returns Promise that resolves to pantry items array
   */
  async getPantry(): Promise<PantryItem[]> {
    return this.getAll<PantryItem>('pantry');
  }

  /**
   * Set pantry items
   * @param pantry - Pantry items array
   * @returns Promise that resolves when operation is complete
   */
  async setPantry(pantry: PantryItem[]): Promise<void> {
    await this.clear('pantry');
    const transaction = this.db!.transaction('pantry', 'readwrite');
    const store = transaction.objectStore('pantry');
    
    for (const item of pantry) {
      store.put(item);
    }
    
    return this.transactionDone(transaction);
  }

  /**
   * Add mutation to mutation queue
   * @param mutation - Mutation object to add
   * @returns Promise that resolves when operation is complete
   */
  async addMutation(mutation: any): Promise<void> {
    await this.ready;
    const transaction = this.db!.transaction('mutations', 'readwrite');
    const store = transaction.objectStore('mutations');
    store.add(mutation);
    return this.transactionDone(transaction);
  }

  
  /**
   * Get meal plan
   * @returns Promise that resolves to meal plan object
   */
  async getMealPlan(): Promise<MealPlan> {
    const plans = await this.getAll<any>('mealPlan');
    const mealPlan: MealPlan = {};
    
    for (const plan of plans) {
      mealPlan[plan.date] = plan.entries || [];
    }
    
    return mealPlan;
  }

  /**
   * Set meal plan
   * @param mealPlan - Meal plan object
   * @returns Promise that resolves when operation is complete
   */
  async setMealPlan(mealPlan: MealPlan): Promise<void> {
    await this.clear('mealPlan');
    const transaction = this.db!.transaction('mealPlan', 'readwrite');
    const store = transaction.objectStore('mealPlan');
    
    for (const [date, entries] of Object.entries(mealPlan)) {
      store.put({ date, entries });
    }
    
    return this.transactionDone(transaction);
  }

  /**
   * Get user preferences
   * @returns Promise that resolves to user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const prefs = await this.get<UserPreferences>('preferences', 'user');
    return prefs || {
      people: 1,
      diet: 'none',
      diets: [],
      allergy: 'none',
      cuisine: 'all',
      maxTime: 60,
      difficulty: 'any',
    };
  }

  /**
   * Set user preferences
   * @param preferences - User preferences object
   * @returns Promise that resolves when operation is complete
   */
  async setPreferences(preferences: UserPreferences): Promise<void> {
    return this.put('preferences', { ...preferences, key: 'user' });
  }

  /**
   * Queue a mutation for sync
   * @param mutation - Mutation operation
   * @returns Promise that resolves when operation is complete
   */
  async queueMutation(mutation: DatabaseOperation<any>): Promise<void> {
    return this.put('queuedMutations', {
      ...mutation,
      id: `${mutation.type}-${mutation.timestamp}-${Math.random()}`,
      status: 'pending',
    });
  }

  /**
   * Get pending mutations
   * @returns Promise that resolves to pending mutations array
   */
  async getPendingMutations(): Promise<DatabaseOperation<any>[]> {
    const mutations = await this.getAll<any>('queuedMutations');
    return mutations.filter(m => m.status === 'pending');
  }

  /**
   * Mark mutation as synced
   * @param mutationId - Mutation ID
   * @returns Promise that resolves when operation is complete
   */
  async markMutationSynced(mutationId: string): Promise<void> {
    const transaction = this.db!.transaction('queuedMutations', 'readwrite');
    const store = transaction.objectStore('queuedMutations');
    const request = store.get(mutationId);
    
    request.onsuccess = () => {
      const mutation = request.result;
      if (mutation) {
        mutation.status = 'synced';
        store.put(mutation);
      }
    };
    
    return this.transactionDone(transaction);
  }

  // ============================================================================
  // Test Helper Methods
  // ============================================================================

  /**
   * Add a single pantry item
   * @param item - Pantry item to add
   * @returns Promise that resolves when operation is complete
   */
  async addPantryItem(item: PantryItem): Promise<void> {
    return this.put('pantry', item);
  }

  /**
   * Log a nutrition entry
   * @param date - Date of entry
   * @param recipeId - Recipe ID
   * @param servings - Number of servings
   * @returns Promise that resolves to the logged entry
   */
  async logNutrition(date: string, recipeId: number, servings: number): Promise<any> {
    const recipe = await this.get<Recipe>('recipes', recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    const entry = {
      date,
      recipeId,
      recipeName: recipe.name,
      servings,
      nutrition: {
        calories: (recipe.nutrition?.calories || 0) * servings,
        protein: (recipe.nutrition?.protein || 0) * servings,
        fat: (recipe.nutrition?.fat || 0) * servings,
        carbs: (recipe.nutrition?.carbs || 0) * servings,
      },
    };

    await this.put('nutritionLog', entry);
    return entry;
  }

  /**
   * Get daily nutrition totals
   * @param date - Date to get nutrition for
   * @returns Promise that resolves to daily nutrition data
   */
  async getDailyNutrition(date: string): Promise<any> {
    const allEntries = await this.getAll<any>('nutritionLog');
    const dayEntries = allEntries.filter((entry: any) => entry.date === date);

    const totals = {
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    };

    for (const entry of dayEntries) {
      totals.calories += entry.nutrition?.calories || 0;
      totals.protein += entry.nutrition?.protein || 0;
      totals.fat += entry.nutrition?.fat || 0;
      totals.carbs += entry.nutrition?.carbs || 0;
    }

    return {
      date,
      meals: dayEntries,
      totals,
    };
  }

  /**
   * Build a search index for recipes
   * @param recipes - Array of recipes to index
   * @returns Promise that resolves when index is built
   */
  async buildSearchIndex(recipes: Recipe[]): Promise<void> {
    // Clear existing index
    await this.clear('searchIndex');

    const transaction = this.db!.transaction('searchIndex', 'readwrite');
    const store = transaction.objectStore('searchIndex');

    const termMap: Record<string, number[]> = {};

    for (const recipe of recipes) {
      const searchTerms = [
        (recipe.name || '').toLowerCase(),
        ...((recipe as any).ingredients_clean || []).map((i: string) => i.toLowerCase()),
        (recipe.cuisine || '').toLowerCase(),
      ];

      for (const term of searchTerms) {
        if (term && term.trim()) {
          if (!termMap[term]) {
            termMap[term] = [];
          }
          if (!termMap[term].includes(recipe.id as unknown as number)) {
            termMap[term].push(recipe.id as unknown as number);
          }
        }
      }
    }

    // Store each unique term with its recipe IDs
    let index = 0;
    for (const [term, ids] of Object.entries(termMap)) {
      store.put({ _term: term, ids }, index++);
    }

    return this.transactionDone(transaction);
  }

  /**
   * Search recipes using the search index
   * @param query - Search query
   * @returns Promise that resolves to matching recipe IDs
   */
  async searchRecipes(query: string): Promise<Recipe[]> {
    const queryLower = query.toLowerCase();
    const matchingIds = new Set<number>();

    // Get all entries from searchIndex
    const allEntries = await this.getAll<any>('searchIndex');
    
    for (const entry of allEntries) {
      if (Array.isArray(entry.ids) && entry._term && entry._term.includes(queryLower)) {
        entry.ids.forEach((id: number) => matchingIds.add(id));
      }
    }

    const results: Recipe[] = [];
    for (const id of matchingIds) {
      const recipe = await this.get<Recipe>('recipes', id);
      if (recipe) {
        results.push(recipe);
      }
    }

    return results;
  }
}

// Export singleton instance
const db = new PantryDB();
export default db;
