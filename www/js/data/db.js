/**
 * Main IndexedDB Database Layer
 * Provides persistent storage for recipes, pantry items, meal plans, preferences, and nutrition logs
 */
const DB_NAME = 'main-pro';
const DB_VERSION = 4;

/**
 * Main database class
 * Handles all IndexedDB operations for persistent storage
 */
class PantryDB {
    constructor() {
        this.db = null;
        this.ready = this.init();
    }

    /**
     * Initialize the IndexedDB database and create object stores
     * @returns {Promise<void>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = event => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('recipes')) {
                    const recipeStore = db.createObjectStore('recipes', { keyPath: 'id' });
                    recipeStore.createIndex('by_rating', 'rating', { unique: false });
                    recipeStore.createIndex('by_time', 'minutes', { unique: false });
                    recipeStore.createIndex('by_calories', 'nutrition.calories', { unique: false });
                    recipeStore.createIndex('by_cuisine', 'cuisine', { unique: false });
                    recipeStore.createIndex('by_vegetarian', 'dietary_flags.vegetarian', { unique: false });
                }

                if (!db.objectStoreNames.contains('pantry')) {
                    const pantryStore = db.createObjectStore('pantry', {
                        keyPath: 'id',
                        autoIncrement: true
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
                        autoIncrement: true
                    });
                    logStore.createIndex('by_date', 'date', { unique: false });
                }

                if (!db.objectStoreNames.contains('searchIndex')) {
                    db.createObjectStore('searchIndex');
                }

                if (!db.objectStoreNames.contains('queuedMutations')) {
                    const mutationStore = db.createObjectStore('queuedMutations', { keyPath: 'id' });
                    mutationStore.createIndex('status', 'status', { unique: false });
                    mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Load recipe dataset from external file and store in IndexedDB
     * @param {Function} [progressCallback] - Callback for progress updates (progress, count)
     * @returns {Promise<number>} Number of recipes loaded
     */
    async loadRecipes(progressCallback) {
        await this.ready;

        const existing = await this.count('recipes');
        if (existing > 0) {
            if (progressCallback) progressCallback(1, existing);
            return existing;
        }

        const recipes = await this.fetchRecipeDataset();
        const normalized = recipes.map(recipe => this.normalizeRecipe(recipe));

        const chunkSize = 200;
        for (let i = 0; i < normalized.length; i += chunkSize) {
            const chunk = normalized.slice(i, i + chunkSize);
            const transaction = this.db.transaction('recipes', 'readwrite');
            const store = transaction.objectStore('recipes');

            chunk.forEach(recipe => {
                const { ingredient_vector, ...storable } = recipe;
                store.put(storable);
            });

            await this.transactionDone(transaction);

            if (progressCallback) {
                progressCallback((i + chunk.length) / normalized.length, i + chunk.length);
            }
        }

        await this.buildSearchIndex(normalized);
        return normalized.length;
    }

    /**
     * Fetch recipe dataset from gzip file or fallback to regular JSON
     * @returns {Promise<Array>} Array of recipe objects
     */
    async fetchRecipeDataset() {
        try {
            const res = await fetch('data/recipes_enhanced_gzip.json.gz');
            if (res.ok && typeof DecompressionStream !== 'undefined') {
                const blob = await res.blob();
                const ds = new DecompressionStream('gzip');
                const decompressed = blob.stream().pipeThrough(ds);
                const text = await new Response(decompressed).text();
                return JSON.parse(text);
            }
        } catch (_) {
        }

        const fallback = await fetch('data/recipes.json');
        if (!fallback.ok) {
            throw new Error('Unable to load recipe dataset');
        }
        return fallback.json();
    }

    /**
     * Normalize recipe data to standard schema
     * @param {Object} recipe - Raw recipe object
     * @returns {Object} Normalized recipe object
     */
    normalizeRecipe(recipe) {
        const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
        const clean = Array.isArray(recipe.ingredients_clean) ? recipe.ingredients_clean : ingredients;

        return {
            id: Number(recipe.id) || Date.now() + Math.random(),
            name: recipe.name || 'Untitled recipe',
            description: recipe.description || '',
            minutes: Number(recipe.minutes ?? recipe.time ?? 30),
            ingredients,
            ingredients_clean: clean,
            steps: Array.isArray(recipe.steps) ? recipe.steps : [],
            rating: Number(recipe.rating || 0),
            review_count: Number(recipe.review_count ?? recipe.reviews ?? 0),
            nutrition: {
                calories: Number(recipe?.nutrition?.calories || 0),
                fat: Number(recipe?.nutrition?.fat || 0),
                protein: Number(recipe?.nutrition?.protein || 0),
                carbs: Number(recipe?.nutrition?.carbs || 0),
                fiber: Number(recipe?.nutrition?.fiber || 0),
                sugar: Number(recipe?.nutrition?.sugar || 0),
                sodium: Number(recipe?.nutrition?.sodium || 0)
            },
            dietary_flags: recipe.dietary_flags || {},
            tags: Array.isArray(recipe.tags) ? recipe.tags : [],
            cuisine: recipe.cuisine || 'fusion',
            servings: Number(recipe.servings || 4),
            image_url: recipe.image_url || ''
        };
    }

    /**
     * Build search index for fast recipe queries
     * @param {Array} recipes - Array of recipe objects
     * @returns {Promise<void>}
     */
    async buildSearchIndex(recipes) {
        const index = {};
        const stopWords = new Set(['the', 'and', 'with', 'for', 'you', 'that', 'this']);

        recipes.forEach(recipe => {
            const tokens = new Set();

            (recipe.name || '').toLowerCase().split(/\W+/).forEach(word => {
                if (word.length > 2 && !stopWords.has(word)) tokens.add(word);
            });

            (recipe.ingredients_clean || []).forEach(ing => {
                String(ing).toLowerCase().split(/\W+/).forEach(word => {
                    if (word.length > 2 && !stopWords.has(word)) tokens.add(word);
                });
            });

            tokens.forEach(token => {
                if (!index[token]) index[token] = [];
                index[token].push(recipe.id);
            });
        });

        Object.keys(index).forEach(key => {
            index[key] = [...new Set(index[key])];
        });

        const transaction = this.db.transaction('searchIndex', 'readwrite');
        transaction.objectStore('searchIndex').put(index, 'main');
        await this.transactionDone(transaction);
    }

    /**
     * Search recipes by query with optional filters
     * @param {string} query - Search query string
     * @param {Object} [filters] - Optional filters (maxTime, maxCalories, diet, cuisine)
     * @returns {Promise<Array>} Array of matching recipes
     */
    async searchRecipes(query, filters = {}) {
        await this.ready;

        const tokens = String(query).toLowerCase().split(/\W+/).filter(w => w.length > 2);
        if (tokens.length === 0) return [];

        const searchIndex = (await this.get('searchIndex', 'main')) || {};

        const matches = new Set();
        tokens.forEach(token => {
            const ids = searchIndex[token] || [];
            ids.forEach(id => matches.add(id));
        });

        const recipes = [];

        for (const id of matches) {
            const recipe = await this.get('recipes', id);
            if (!recipe) continue;

            if (filters.maxTime && recipe.minutes > filters.maxTime) continue;
            if (filters.maxCalories && recipe.nutrition.calories > filters.maxCalories) continue;
            if (filters.diet && !recipe.dietary_flags[filters.diet]) continue;
            if (filters.cuisine && recipe.cuisine !== filters.cuisine) continue;

            recipes.push(recipe);
        }

        recipes.sort((a, b) => this.calculateRelevanceScore(b, tokens) - this.calculateRelevanceScore(a, tokens));
        return recipes.slice(0, 50);
    }

    /**
     * Calculate relevance score for recipe based on search tokens
     * @param {Object} recipe - Recipe object
     * @param {Array} tokens - Search tokens
     * @returns {number} Relevance score
     */
    calculateRelevanceScore(recipe, tokens) {
        let score = 0;
        const text = `${recipe.name} ${(recipe.ingredients_clean || []).join(' ')}`.toLowerCase();

        tokens.forEach(token => {
            const regex = new RegExp(token, 'g');
            const matches = text.match(regex);
            if (matches) score += matches.length;
        });

        score += (recipe.rating || 0) / 5;
        return score;
    }

    /**
     * Get personalized recipe recommendations based on pantry items
     * @param {Array} pantryItems - Array of pantry items
     * @param {Object} [preferences] - User preferences (diet, cuisine, maxTime)
     * @returns {Promise<Array>} Array of recommended recipes
     */
    async getPersonalizedRecommendations(pantryItems, preferences = {}) {
        await this.ready;

        const pantryVector = this.createPantryVector(pantryItems);
        const recipes = await this.getAll('recipes');

        const scored = recipes.map(recipe => {
            let score = 0;
            let matchedIngredients = 0;

            (recipe.ingredients_clean || []).forEach(ingredient => {
                const match = this.findBestMatch(ingredient, pantryVector);
                if (match.score > 0.7) {
                    matchedIngredients += 1;
                    score += match.score;
                }
            });

            const ingredientCount = Math.max(1, (recipe.ingredients_clean || []).length);
            const coverage = matchedIngredients / ingredientCount;
            score = score * (1 + coverage);

            if (preferences.diet && recipe.dietary_flags?.[preferences.diet]) score *= 1.5;
            if (preferences.cuisine && preferences.cuisine === recipe.cuisine) score *= 1.3;

            if (preferences.maxTime) {
                const timeBonus = Math.max(0, 1 - (recipe.minutes - preferences.maxTime) / 120);
                score *= 1 + timeBonus;
            }

            return { recipe, score };
        });

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
            .map(item => item.recipe);
    }

    /**
     * Create vector representation of pantry items for matching
     * @param {Array} pantryItems - Array of pantry items or strings
     * @returns {Map} Vector map of words to counts
     */
    createPantryVector(pantryItems = []) {
        const vector = new Map();
        pantryItems.forEach(item => {
            const name = typeof item === 'string' ? item : item?.name;
            if (!name) return;
            String(name).toLowerCase().split(/\W+/).forEach(word => {
                if (word.length > 2) {
                    vector.set(word, (vector.get(word) || 0) + 1);
                }
            });
        });
        return vector;
    }

    /**
     * Find best matching pantry item for an ingredient
     * @param {string} ingredient - Ingredient name
     * @param {Map} pantryVector - Pantry vector
     * @returns {Object} Match result with score
     */
    findBestMatch(ingredient, pantryVector) {
        let bestScore = 0;
        const ingWords = String(ingredient).toLowerCase().split(/\W+/).filter(Boolean);

        for (const pantryWord of pantryVector.keys()) {
            for (const ingWord of ingWords) {
                const similarity = this.stringSimilarity(pantryWord, ingWord);
                if (similarity > bestScore) {
                    bestScore = similarity;
                }
            }
        }

        return { score: bestScore };
    }

    /**
     * Calculate string similarity using Levenshtein distance
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} Similarity score (0-1)
     */
    stringSimilarity(a, b) {
        if (!a || !b) return 0;
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.9;

        const matrix = [];
        for (let i = 0; i <= a.length; i += 1) matrix[i] = [i];
        for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

        for (let i = 1; i <= a.length; i += 1) {
            for (let j = 1; j <= b.length; j += 1) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        const distance = matrix[a.length][b.length];
        const maxLen = Math.max(a.length, b.length);
        return 1 - distance / maxLen;
    }

    /**
     * Log nutrition data for a meal
     * @param {Date|string} date - Date of meal
     * @param {number} recipeId - Recipe ID
     * @param {number} servings - Number of servings
     * @returns {Promise<Object>} Logged nutrition entry
     */
    async logNutrition(date, recipeId, servings) {
        const recipe = await this.get('recipes', recipeId);
        if (!recipe) throw new Error('Recipe not found');

        const safeDate = date instanceof Date ? date : new Date(date);
        const safeServings = Number(servings) || 1;

        const log = {
            date: safeDate.toISOString().split('T')[0],
            recipeId,
            recipeName: recipe.name,
            servings: safeServings,
            nutrition: {}
        };

        Object.keys(recipe.nutrition || {}).forEach(key => {
            log.nutrition[key] = (recipe.nutrition[key] || 0) * safeServings;
        });

        const tx = this.db.transaction('nutritionLog', 'readwrite');
        tx.objectStore('nutritionLog').add(log);
        await this.transactionDone(tx);

        return log;
    }

    /**
     * Get daily nutrition totals
     * @param {Date|string} date - Date to query
     * @returns {Promise<Object>} Daily nutrition data with totals and meals
     */
    async getDailyNutrition(date) {
        const safeDate = date instanceof Date ? date : new Date(date);
        const dateStr = safeDate.toISOString().split('T')[0];
        const logs = await this.getAll('nutritionLog');

        const dailyLogs = logs.filter(log => log.date === dateStr);

        const totals = {
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0
        };

        dailyLogs.forEach(log => {
            Object.keys(totals).forEach(key => {
                totals[key] += Number(log.nutrition?.[key] || 0);
            });
        });

        return {
            date: dateStr,
            totals,
            meals: dailyLogs
        };
    }

    /**
     * Get nutrition data for the past 7 days
     * @returns {Promise<Array>} Array of daily nutrition objects
     */
    async getWeeklyNutrition() {
        const week = [];
        const today = new Date();

        for (let i = 6; i >= 0; i -= 1) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            week.push(await this.getDailyNutrition(date));
        }

        return week;
    }

    /**
     * Promisify an IndexedDB transaction
     * @param {IDBTransaction} transaction - Transaction to promisify
     * @returns {Promise<void>}
     */
    transactionDone(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
        });
    }

    /**
     * Promisify an IndexedDB request
     * @param {IDBRequest} request - Request to promisify
     * @returns {Promise<any>} Request result
     */
    promisify(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a single item from an object store
     * @param {string} storeName - Name of object store
     * @param {*} key - Key to retrieve
     * @returns {Promise<any>} Retrieved item
     */
    async get(storeName, key) {
        await this.ready;
        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        return this.promisify(store.get(key));
    }

    /**
     * Get all items from an object store
     * @param {string} storeName - Name of object store
     * @returns {Promise<Array>} Array of all items
     */
    async getAll(storeName) {
        await this.ready;
        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        return this.promisify(store.getAll());
    }

    /**
     * Count items in an object store
     * @param {string} storeName - Name of object store
     * @returns {Promise<number>} Count of items
     */
    async count(storeName) {
        await this.ready;
        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        return this.promisify(store.count());
    }

    /**
     * Put an item into an object store
     * @param {string} storeName - Name of object store
     * @param {*} item - Item to store
     * @returns {Promise<any>} Stored item key
     */
    async put(storeName, item) {
        await this.ready;
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        return this.promisify(store.put(item));
    }

    /**
     * Delete an item from an object store
     * @param {string} storeName - Name of object store
     * @param {*} key - Key to delete
     * @returns {Promise<void>}
     */
    async delete(storeName, key) {
        await this.ready;
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        return this.promisify(store.delete(key));
    }

    // ===== PANTRY HELPERS =====
    /**
     * Get all pantry items
     * @returns {Promise<Array>} Array of pantry items
     */
    async getPantry() {
        return this.getAll('pantry');
    }

    /**
     * Set all pantry items (replaces existing)
     * @param {Array} items - Array of pantry items
     * @returns {Promise<void>}
     */
    async setPantry(items) {
        const tx = this.db.transaction('pantry', 'readwrite');
        const store = tx.objectStore('pantry');
        await this.promisify(store.clear());
        for (const item of items) {
            store.put(item);
        }
        return this.transactionDone(tx);
    }

    /**
     * Add a single pantry item
     * @param {Object} item - Pantry item to add
     * @returns {Promise<any>} Stored item key
     */
    async addPantryItem(item) {
        return this.put('pantry', item);
    }

    /**
     * Remove a pantry item by ID
     * @param {number} id - Item ID to remove
     * @returns {Promise<void>}
     */
    async removePantryItem(id) {
        return this.delete('pantry', id);
    }

    // ===== MEAL PLAN HELPERS =====
    /**
     * Get meal plan as object keyed by date
     * @returns {Promise<Object>} Meal plan object
     */
    async getMealPlan() {
        const items = await this.getAll('mealPlan');
        const plan = {};
        for (const item of items) {
            plan[item.date] = item;
        }
        return plan;
    }

    /**
     * Set meal plan (replaces existing)
     * @param {Object} plan - Meal plan object keyed by date
     * @returns {Promise<void>}
     */
    async setMealPlan(plan) {
        const tx = this.db.transaction('mealPlan', 'readwrite');
        const store = tx.objectStore('mealPlan');
        await this.promisify(store.clear());
        for (const [date, item] of Object.entries(plan)) {
            store.put({ ...item, date });
        }
        return this.transactionDone(tx);
    }

    /**
     * Add a meal to the plan for a specific date
     * @param {string} date - Date key
     * @param {Object} meal - Meal object
     * @returns {Promise<any>} Stored item key
     */
    async addMealToPlan(date, meal) {
        return this.put('mealPlan', { ...meal, date });
    }

    /**
     * Remove a meal from the plan for a specific date
     * @param {string} date - Date key
     * @returns {Promise<void>}
     */
    async removeMealFromPlan(date) {
        return this.delete('mealPlan', date);
    }

    // ===== PREFERENCES HELPERS =====
    /**
     * Get user preferences
     * @returns {Promise<Object>} Preferences object with defaults
     */
    async getPreferences() {
        const prefs = await this.get('preferences', 'main');
        return prefs || { people: 1, diet: 'none', allergy: 'none', cuisine: 'all' };
    }

    /**
     * Set user preferences
     * @param {Object} prefs - Preferences object
     * @returns {Promise<any>} Stored item key
     */
    async setPreferences(prefs) {
        return this.put('preferences', { ...prefs, key: 'main' });
    }

    // ===== MIGRATION =====
    /**
     * Migrate data from localStorage to IndexedDB
     * @returns {Promise<Object>} Migration status object
     */
    async migrateFromLocalStorage() {
        const migrated = { pantry: false, mealPlan: false, preferences: false };

        const legacyPantry = localStorage.getItem('pantry');
        if (legacyPantry) {
            try {
                const items = JSON.parse(legacyPantry);
                if (Array.isArray(items) && items.length > 0) {
                    const tx = this.db.transaction('pantry', 'readwrite');
                    const store = tx.objectStore('pantry');
                    for (const item of items) {
                        store.put(item);
                    }
                    await this.transactionDone(tx);
                    localStorage.removeItem('pantry');
                    migrated.pantry = true;
                }
            } catch (_) {}
        }

        const legacyMealPlan = localStorage.getItem('mealPlan');
        if (legacyMealPlan) {
            try {
                const plan = JSON.parse(legacyMealPlan);
                if (plan && typeof plan === 'object') {
                    await this.setMealPlan(plan);
                    localStorage.removeItem('mealPlan');
                    migrated.mealPlan = true;
                }
            } catch (_) {}
        }

        const legacyPrefs = localStorage.getItem('preferences');
        if (legacyPrefs) {
            try {
                const prefs = JSON.parse(legacyPrefs);
                if (prefs && typeof prefs === 'object') {
                    await this.setPreferences(prefs);
                    localStorage.removeItem('preferences');
                    migrated.preferences = true;
                }
            } catch (_) {}
        }

        return migrated;
    }

    /**
     * ============================================
     * MUTATION QUEUE METHODS (Offline Sync Support)
     * ============================================
     */

    /**
     * Add a mutation to the queue
     * @param {Object} mutation - Mutation object with id, type, payload, entityId, timestamp, retryCount, status
     * @returns {Promise<void>}
     */
    async addMutation(mutation) {
        await this.ready;
        await this.put('queuedMutations', mutation);
    }

    /**
     * Get all pending mutations
     * @returns {Promise<Array>} Array of pending mutation objects
     */
    async getPendingMutations() {
        await this.ready;
        return this.getAllFromIndex('queuedMutations', 'status', 'pending');
    }

    /**
     * Mark a mutation as synced
     * @param {string} id - Mutation ID
     * @returns {Promise<void>}
     */
    async markMutationSynced(id) {
        await this.ready;
        const mutation = await this.get('queuedMutations', id);
        if (mutation) {
            mutation.status = 'synced';
            mutation.syncedAt = Date.now();
            await this.put('queuedMutations', mutation);
        }
    }

    /**
     * Mark a mutation as failed
     * @param {string} id - Mutation ID
     * @param {string} error - Error message
     * @returns {Promise<void>}
     */
    async markMutationFailed(id, error) {
        await this.ready;
        const mutation = await this.get('queuedMutations', id);
        if (mutation) {
            mutation.status = 'failed';
            mutation.failedAt = Date.now();
            mutation.lastError = error;
            await this.put('queuedMutations', mutation);
        }
    }

    /**
     * Increment retry count for a mutation
     * @param {string} id - Mutation ID
     * @returns {Promise<number>} New retry count
     */
    async incrementMutationRetry(id) {
        await this.ready;
        const mutation = await this.get('queuedMutations', id);
        if (mutation) {
            mutation.retryCount = (mutation.retryCount || 0) + 1;
            mutation.lastRetryAt = Date.now();
            await this.put('queuedMutations', mutation);
            return mutation.retryCount;
        }
        return 0;
    }

    /**
     * Get all mutations by status
     * @param {string} status - Status filter ('pending', 'synced', 'failed')
     * @returns {Promise<Array>}
     */
    async getMutationsByStatus(status) {
        await this.ready;
        return this.getAllFromIndex('queuedMutations', 'status', status);
    }

    /**
     * Delete old synced mutations (cleanup)
     * @param {number} olderThanMs - Delete mutations synced before this many ms ago
     * @returns {Promise<number>} Number of deleted mutations
     */
    async cleanupSyncedMutations(olderThanMs = 24 * 60 * 60 * 1000) {
        await this.ready;
        const cutoff = Date.now() - olderThanMs;
        const allSynced = await this.getAllFromIndex('queuedMutations', 'status', 'synced');
        const toDelete = allSynced.filter(m => (m.syncedAt || 0) < cutoff);

        for (const mutation of toDelete) {
            await this.delete('queuedMutations', mutation.id);
        }

        return toDelete.length;
    }

    /**
     * Generic method to get all items from an index
     * @param {string} storeName - Object store name
     * @param {string} indexName - Index name
     * @param {any} value - Index value to match
     * @returns {Promise<Array>}
     */
    async getAllFromIndex(storeName, indexName, value) {
        await this.ready;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
}

/**
 * Global database instance
 * @type {PantryDB}
 */
const db = new PantryDB();
export default db;
