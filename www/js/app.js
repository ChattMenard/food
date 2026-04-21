console.log('=== MODULE START ===');
import { loadState, savePantryState, saveMealPlanState, savePreferencesState, saveRecipeRatingsState, signInUser, signOutUser } from './core/appState.js';
import { PantryManager } from './features/pantry/pantryManager.js';
import { MealPlanner } from './features/meals/mealPlanner.js';
import { RecipeEngine } from './logic/recipeEngine.js';
import { DataManager } from './data/dataManager.js';
import { UIManager } from './ui/uiManager.js';
import { PreferencesManager } from './features/preferencesManager.js';
import { getSeasonalIngredientSuggestion } from './features/pantry/seasonalIngredients.js';
import { MealPlanSharing } from './features/plan/mealPlanSharing.js';
import { MealPlanTemplates } from './features/plan/mealPlanTemplates.js';
import { LeftoverTracker } from './features/pantry/leftoverTracker.js';
import { MealPrep } from './features/mealPrep.js';
import syncProcessor from './data/syncProcessor.js';
import { registerAllHandlers } from './data/mutationHandlers.js';
import db from './data/db.js';

// Lazy-loaded modules
let geminiAI = null;
let nutritionGoalsManager = null;
let mealHistoryAnalytics = null;
let budgetMealPlanner = null;
let mealPrepPlanner = null;
let groceryDelivery = null;
let deviceSyncManager = null;
let pushNotifications = null;

// Data
let pantry = [];
let mealPlan = {};
let preferences = { people: 1, diet: 'none', diets: [], allergy: 'none', cuisine: 'all', maxTime: 60, difficulty: 'any' };
let editingIndex = null;
let recipes = [];
let recipeRatings = {};
let autocompleteIngredients = [];

// Core managers
const uiManager = new UIManager({
    updateMeals: () => updateMeals(),
    updateShoppingList: () => updateShoppingList()
});

// Override showTab for bottom-nav bar
uiManager.showTab = function(tab) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('tab-' + tab);
    if (el) el.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
    if (tab === 'meals') updateMeals();
    if (tab === 'shop') updateShoppingList();
    if (tab === 'nutrition') updateNutritionScreen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const pantryManager = new PantryManager({
    getPantry: () => pantry,
    persistPantry: async () => { await savePantryState(pantry); updatePantryCount(); },
    announce: message => uiManager.announceToScreenReader(message),
    getAutocompleteIngredients: () => autocompleteIngredients,
    getEditingIndex: () => editingIndex,
    setEditingIndex: value => { editingIndex = value; },
    onPantryChange: () => { renderSeasonalSuggestions(); renderLeftovers(); updatePantryCount(); }
});

const recipeEngine = new RecipeEngine({
    getRecipes: () => recipes,
    getRecipeRatings: () => recipeRatings,
    persistRecipeRatings: async () => { await saveRecipeRatingsState(recipeRatings); },
    announce: message => uiManager.announceToScreenReader(message)
});

const dataManager = new DataManager({
    setRecipes: v => { recipes = v; },
    setAutocompleteIngredients: v => { autocompleteIngredients = v; },
    updateMeals: () => { updateMeals(); window._recipesLoaded = true; }
});

registerAllHandlers(syncProcessor);

// Kick off lazy-loaded managers in background (parallel for faster startup)
(async () => {
    await Promise.all([
        (async () => { try { const mgr = await getNutritionGoalsManager(); await mgr.loadGoals(); } catch(e){} })(),
        (async () => { try { const mgr = await getBudgetMealPlanner(); await mgr.loadTier(); } catch(e){} })(),
        (async () => { try { const mgr = await getMealPrepPlanner(); await mgr.loadSettings(); } catch(e){} })(),
        (async () => { try { const mgr = await getGroceryDelivery(); await mgr.loadPreferences(); } catch(e){} })(),
        (async () => { try { const mgr = await getDeviceSyncManager(); await mgr.init(); } catch(e){} })(),
        (async () => { try { const mgr = await getPushNotifications(); await mgr.init(); mgr.scheduleAllEnabled(); } catch(e){} })()
    ]);
})();

const preferencesManager = new PreferencesManager({
    getPreferences: () => preferences,
    savePreferencesState: async prefs => { await savePreferencesState(prefs); },
    updateMeals: () => updateMeals()
});

const mealPlanSharing = new MealPlanSharing({
    getMealPlan: () => mealPlan,
    setMealPlan: v => { mealPlan = v; },
    persistMealPlan: async () => { await saveMealPlanState(mealPlan); },
    announce: m => uiManager.announceToScreenReader(m)
});

const mealPlanTemplates = new MealPlanTemplates({
    getMealPlan: () => mealPlan,
    setMealPlan: v => { mealPlan = v; },
    persistMealPlan: async () => { await saveMealPlanState(mealPlan); },
    getRecipes: () => recipes,
    announce: m => uiManager.announceToScreenReader(m)
});

const leftoverTracker = new LeftoverTracker({
    getPantry: () => pantry,
    setPantry: v => { pantry = v; },
    persistPantry: async () => { await savePantryState(pantry); },
    announce: m => uiManager.announceToScreenReader(m)
});

const mealPrep = new MealPrep({
    getMealPlan: () => mealPlan,
    getRecipes: () => recipes,
    getPreferences: () => preferences,
    announce: m => uiManager.announceToScreenReader(m)
});

// Lazy loading functions for heavy modules
async function getGeminiAI() {
    if (!geminiAI) {
        const { GeminiAI } = await import('./ai/geminiAI.js');
        geminiAI = new GeminiAI({
            getPantry: () => pantry,
            getPreferences: () => preferences,
            getRecipes: () => recipes,
            announce: m => uiManager.announceToScreenReader(m)
        });
    }
    return geminiAI;
}

async function getNutritionGoalsManager() {
    if (!nutritionGoalsManager) {
        nutritionGoalsManager = (await import('./features/nutrition/nutritionGoals.js')).default;
    }
    return nutritionGoalsManager;
}

async function getMealHistoryAnalytics() {
    if (!mealHistoryAnalytics) {
        mealHistoryAnalytics = (await import('./features/nutrition/mealHistoryAnalytics.js')).default;
    }
    return mealHistoryAnalytics;
}

async function getBudgetMealPlanner() {
    if (!budgetMealPlanner) {
        budgetMealPlanner = (await import('./features/plan/budgetMealPlanner.js')).default;
    }
    return budgetMealPlanner;
}

async function getMealPrepPlanner() {
    if (!mealPrepPlanner) {
        mealPrepPlanner = (await import('./features/plan/mealPrepPlanner.js')).default;
    }
    return mealPrepPlanner;
}

async function getGroceryDelivery() {
    if (!groceryDelivery) {
        groceryDelivery = (await import('./features/grocery/groceryDelivery.js')).default;
    }
    return groceryDelivery;
}

async function getDeviceSyncManager() {
    if (!deviceSyncManager) {
        deviceSyncManager = (await import('./data/deviceSyncManager.js')).default;
    }
    return deviceSyncManager;
}

async function getPushNotifications() {
    if (!pushNotifications) {
        pushNotifications = (await import('./utils/pushNotifications.js')).default;
    }
    return pushNotifications;
}

const mealPlanner = new MealPlanner({
    getPantry: () => pantry,
    getMealPlan: () => mealPlan,
    getPreferences: () => preferences,
    getRecipes: () => recipes,
    persistMealPlan: () => saveMealPlanState(mealPlan)
});

// ---- Window wiring ----
Object.assign(window, {
    showTab: uiManager.showTab.bind(uiManager),
    showSuggestions: pantryManager.showSuggestions.bind(pantryManager),
    hideSuggestions: pantryManager.hideSuggestions.bind(pantryManager),
    selectSuggestion: pantryManager.selectSuggestion.bind(pantryManager),
    handleIngredientKey: pantryManager.handleIngredientKey.bind(pantryManager),
    addIngredient: pantryManager.addIngredient.bind(pantryManager),
    editIngredient: pantryManager.editIngredient.bind(pantryManager),
    saveEditedIngredient: pantryManager.saveEditedIngredient.bind(pantryManager),
    removeIngredient: pantryManager.removeIngredient.bind(pantryManager),
    startSpeechRecognition: pantryManager.startSpeechRecognition.bind(pantryManager),
    stopSpeechRecognition: pantryManager.stopSpeechRecognition.bind(pantryManager),
    openRecipeModal: recipeEngine.openRecipeModal.bind(recipeEngine),
    rateRecipe: recipeEngine.rateRecipe.bind(recipeEngine),
    updatePreferences: preferencesManager.updatePreferences.bind(preferencesManager),
    exportMealPlan: mealPlanSharing.exportMealPlan.bind(mealPlanSharing),
    exportToICal: mealPlanSharing.exportToICal.bind(mealPlanSharing),
    importMealPlanFromFile: (event) => {
        const file = event.target.files[0];
        if (file) mealPlanSharing.importMealPlan(file).then(() => renderMealPlan()).catch(console.error);
        event.target.value = '';
    },
    applyTemplate: (name) => {
        if (name) { mealPlanTemplates.applyTemplate(name); renderMealPlan(); document.getElementById('template-select').value = ''; }
    },
    markAsLeftover: (name) => {
        const idx = pantry.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
        if (idx !== -1) { leftoverTracker.markAsLeftover(idx); renderLeftovers(); }
    },
    addShopItem: (name) => {
        document.getElementById('new-ingredient').value = name;
        pantryManager.addIngredient();
    },
    sortMeals: (mode) => {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        event.target.classList.add('active');
        mealPlanner.sortMeals(mode);
    },
    addToPlanByName: mealPlanner.addToPlanByName.bind(mealPlanner),
    copyShoppingList: mealPlanner.copyShoppingList.bind(mealPlanner),
    updateMeals: () => { mealPlanner.updateMeals(); recipeEngine.buildIngredientVectors(); },
    updateShoppingList: () => mealPlanner.updateShoppingList(),
    renderMealPlan: () => { mealPlanner.renderMealPlan(); renderMealPrepTips(); },
    closeRecipeModal: (e) => {
        if (e && e.target !== e.currentTarget && !e.currentTarget.classList.contains('modal-backdrop')) return;
        document.getElementById('recipe-modal').classList.remove('active');
    },
    openSettings: () => document.getElementById('settings-modal').classList.add('active'),
    closeSettings: (e) => {
        if (e && e.target && e.target !== e.currentTarget && !e.currentTarget.classList?.contains('modal-backdrop')) return;
        document.getElementById('settings-modal').classList.remove('active');
    },
    sendToDelivery: async (service) => {
        try {
            const items = mealPlanner.getShoppingListItems?.() || [];
            const delivery = await getGroceryDelivery();
            delivery.sendToService(service, items);
        } catch(e) { alert('Please add meals to your plan first.'); }
    },
    signInAction: async () => {
        try { await signInUser(); alert('Signed in!'); }
        catch(e) { alert('Sign-in unavailable in this environment.'); }
    },
    getAISuggestions: async () => {
        const container = document.getElementById('ai-suggestions-container');
        const btn = document.getElementById('ai-suggestions-btn');
        const ai = await getGeminiAI();
        if (ai.isLoading) return;
        container.innerHTML = '<p style="color:#6b21a8; font-size:13px; text-align:center; padding:10px;">🤖 Thinking…</p>';
        btn.disabled = true;
        const suggestions = await ai.generateAISuggestions();
        btn.disabled = false;
        if (Array.isArray(suggestions) && suggestions.length) {
            container.innerHTML = suggestions.map(s => `<div class="list-item"><div class="list-item-body"><div class="list-item-title">${s.name || s}</div><div class="list-item-sub">${s.description || ''}</div></div></div>`).join('');
        } else {
            container.innerHTML = '<p style="color:#6b7280; font-size:13px; text-align:center; padding:10px;">No suggestions right now.</p>';
        }
    },
    routeInput: async () => {
        const input = document.getElementById('new-ingredient');
        const text = input.value.trim();
        if (!text) return;
        if (window.isAIQuery && window.isAIQuery(text)) {
            const responseBox = document.getElementById('pantry-ai-response');
            const responseText = document.getElementById('pantry-ai-response-text');
            responseText.textContent = '🤖 Thinking…';
            responseBox.classList.remove('hidden');
            try {
                const ai = await getGeminiAI();
                const answer = await ai.answerQuestion(text);
                responseText.textContent = answer || 'No answer.';
            } catch(e) { responseText.textContent = 'AI unavailable.'; }
            input.value = '';
        } else {
            pantryManager.addIngredient();
        }
    },
    applyNutritionPreset: async (preset) => {
        if (!preset) return;
        const mgr = await getNutritionGoalsManager();
        const goals = mgr.getPresets?.()?.[preset];
        if (goals) { mgr.setGoals(goals); renderNutritionGoals(); updateNutritionScreen(); }
    },
    isAIQuery: (text) => /\?$|^(how|what|why|can|should|is|are|does|do|tell|explain|suggest|recommend|give me)\b/i.test(text),
    generateRandomMealPlan: () => {
        const source = document.getElementById('randomizer-source')?.value || 'pantry';
        const numIngredients = parseInt(document.getElementById('randomizer-ingredients')?.value) || 5;
        const maxCalories = parseInt(document.getElementById('randomizer-calories')?.value) || null;
        const minProtein = parseInt(document.getElementById('randomizer-protein')?.value) || null;
        const maxCarbs = parseInt(document.getElementById('randomizer-carbs')?.value) || null;
        const maxFat = parseInt(document.getElementById('randomizer-fat')?.value) || null;
        const maxTime = parseInt(document.getElementById('randomizer-time')?.value) || null;
        const difficulty = document.getElementById('randomizer-difficulty')?.value || null;

        // Get ingredients based on source selector
        let ingredients;
        if (source === 'random') {
            // Pick random ingredients from autocomplete list
            const shuffled = [...autocompleteIngredients].sort(() => 0.5 - Math.random());
            ingredients = shuffled.slice(0, Math.min(numIngredients, shuffled.length)).map(i => i.toLowerCase());
        } else {
            // Use pantry ingredients
            ingredients = pantry.map(i => i.name.toLowerCase());
            if (ingredients.length < numIngredients) {
                // If pantry doesn't have enough, supplement with autocomplete
                const extraIngredients = autocompleteIngredients
                    .filter(i => !ingredients.includes(i.toLowerCase()))
                    .slice(0, numIngredients - ingredients.length);
                ingredients = [...ingredients, ...extraIngredients];
            }
            ingredients = ingredients.slice(0, numIngredients);
        }

        // Filter recipes by nutrition criteria
        let filteredRecipes = recipes.filter(recipe => {
            const nutr = recipe.nutrition || {};
            if (maxCalories && nutr.calories > maxCalories) return false;
            if (minProtein && (nutr.protein || 0) < minProtein) return false;
            if (maxCarbs && (nutr.carbs || 0) > maxCarbs) return false;
            if (maxFat && (nutr.fat || 0) > maxFat) return false;
            if (maxTime && (recipe.minutes || 0) > maxTime) return false;
            if (difficulty && recipe.difficulty !== difficulty) return false;
            return true;
        });

        // Find recipes that use the selected ingredients
        const recipesWithIngredients = filteredRecipes.map(recipe => {
            const recipeIngredients = (recipe.ingredients || []).map(i => i.toLowerCase());
            const matchCount = ingredients.filter(ing => 
                recipeIngredients.some(ri => ri.includes(ing) || ing.includes(ri))
            ).length;
            return { recipe, matchCount };
        }).filter(r => r.matchCount > 0);

        // Sort by match count (recipes with more shared ingredients first)
        recipesWithIngredients.sort((a, b) => b.matchCount - a.matchCount);

        // Select 7 meals for the week (avoiding duplicates)
        const selectedRecipes = [];
        const usedIds = new Set();
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        for (let i = 0; i < 7 && i < recipesWithIngredients.length; i++) {
            const candidate = recipesWithIngredients[i];
            if (!usedIds.has(candidate.recipe.id)) {
                selectedRecipes.push(candidate.recipe);
                usedIds.add(candidate.recipe.id);
            }
        }

        // If we don't have enough, add more from filtered recipes
        if (selectedRecipes.length < 7) {
            for (const recipe of filteredRecipes) {
                if (selectedRecipes.length >= 7) break;
                if (!usedIds.has(recipe.id)) {
                    selectedRecipes.push(recipe);
                    usedIds.add(recipe.id);
                }
            }
        }

        // Clear existing meal plan and add new meals
        mealPlan = {};
        selectedRecipes.forEach((recipe, index) => {
            const date = days[index];
            const key = `${date}-dinner`;
            mealPlan[key] = { date, type: 'dinner', recipeId: recipe.id, servings: preferences.people };
        });

        saveMealPlanState(mealPlan);
        window.renderMealPlan();
        renderMealPrepTips();
        alert(`Generated ${selectedRecipes.length} meals using ${ingredients.length} ingredients!`);
    }
});

// Diet chip click handling (toggle hidden checkboxes)
document.querySelectorAll('.diet-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const cb = chip.querySelector('input');
        if (!cb) return;
        cb.checked = !cb.checked;
        chip.classList.toggle('active', cb.checked);
        preferencesManager.updatePreferences();
    });
});

// ---- Rendering helpers ----
function updatePantryCount() {
    const el = document.getElementById('pantry-count');
    if (el) el.textContent = `${pantry.length} item${pantry.length === 1 ? '' : 's'}`;
}

function renderSeasonalSuggestions() {
    const suggestions = getSeasonalIngredientSuggestion(pantry);
    const container = document.getElementById('seasonal-suggestions');
    if (!container) return;
    if (!suggestions.length) {
        container.innerHTML = '<p style="color:#6b7280; font-size:13px; padding:6px;">All seasonal ingredients are in your pantry!</p>';
        return;
    }
    container.innerHTML = suggestions.map(ing => `
        <button class="list-item" style="width:100%; cursor:pointer; border:1px solid #bbf7d0;" onclick="addShopItem('${ing}')">
            <div class="list-item-body">
                <div class="list-item-title">+ ${ing}</div>
                <div class="list-item-sub">Tap to add</div>
            </div>
        </button>
    `).join('');
}

function renderLeftovers() {
    const leftovers = leftoverTracker.getLeftovers();
    const container = document.getElementById('leftovers-list');
    if (!container) return;
    if (!leftovers.length) {
        container.innerHTML = '<p style="color:#6b7280; font-size:13px; padding:6px;">No leftovers tracked yet.</p>';
        return;
    }
    container.innerHTML = leftovers.map(item => `
        <div class="list-item">
            <div class="list-item-body">
                <div class="list-item-title">${item.name}</div>
                <div class="list-item-sub">${item.quantity} ${item.unit} · Since ${item.leftoverDate}</div>
            </div>
            <button class="list-item-action" onclick="markAsLeftover('${item.name}')" title="Clear">✕</button>
        </div>
    `).join('');
}

function renderMealPrepTips() {
    const opps = mealPrep.calculatePrepSchedule?.() || [];
    const day = mealPrep.suggestPrepDay?.() || '';
    const el = document.getElementById('meal-prep-tips');
    if (!el) return;
    if (!opps.length) {
        el.innerHTML = `<p style="font-size:12px; color:#92400e;">Add meals to your plan. ${day ? `Suggested prep day: <b>${day}</b>` : ''}</p>`;
        return;
    }
    el.innerHTML = `<p style="font-size:12px; color:#92400e; margin-bottom:8px;">💡 Suggested prep day: <b>${day}</b></p>` +
        opps.slice(0,3).map(({ recipe, count }) => `
            <div class="list-item"><div class="list-item-body">
                <div class="list-item-title">${recipe.name}</div>
                <div class="list-item-sub">Used ${count}× · batch-friendly</div>
            </div></div>
        `).join('');
}

async function renderNutritionGoals() {
    const goalsMgr = await getNutritionGoalsManager();
    const goals = goalsMgr.getCurrentGoals?.();
    const display = document.getElementById('nutrition-goals-display');
    if (!display) return;
    if (goals) {
        display.innerHTML = `
            <div style="background:white; padding:10px; border-radius:10px; display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:13px;">
                <span>🔥 ${goals.calories} kcal</span>
                <span>💪 ${goals.protein}g protein</span>
                <span>🍞 ${goals.carbs}g carbs</span>
                <span>🥑 ${goals.fat}g fat</span>
            </div>`;
    } else {
        display.innerHTML = '';
    }
}

async function updateNutritionScreen() {
    const dateEl = document.getElementById('nutrition-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });

    const analytics = await getMealHistoryAnalytics();
    const goalsMgr = await getNutritionGoalsManager();
    const today = (analytics.getTodaySummary?.() || {}) ;
    const goals = goalsMgr.getCurrentGoals?.() || {};

    const cal = today.calories || 0, pro = today.protein || 0, car = today.carbs || 0, fat = today.fat || 0;
    const gCal = goals.calories, gPro = goals.protein, gCar = goals.carbs, gFat = goals.fat;

    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setText('tile-calories', cal);
    setText('tile-protein', pro + 'g');
    setText('tile-carbs', car + 'g');
    setText('tile-fat', fat + 'g');
    setText('tile-calories-goal', `of ${gCal || '--'}`);
    setText('tile-protein-goal', `of ${gPro || '--'}g`);
    setText('tile-carbs-goal', `of ${gCar || '--'}g`);
    setText('tile-fat-goal', `of ${gFat || '--'}g`);

    setText('today-calories', `${cal} / ${gCal || '--'}`);
    setText('today-protein', `${pro}g / ${gPro || '--'}g`);
    setText('today-carbs', `${car}g / ${gCar || '--'}g`);
    setText('today-fat', `${fat}g / ${gFat || '--'}g`);

    const pct = (v, g) => g ? Math.min(100, Math.round(v/g*100)) : 0;
    document.getElementById('bar-calories').style.width = pct(cal, gCal) + '%';
    document.getElementById('bar-protein').style.width = pct(pro, gPro) + '%';
    document.getElementById('bar-carbs').style.width = pct(car, gCar) + '%';
    document.getElementById('bar-fat').style.width = pct(fat, gFat) + '%';

    renderNutritionGoals();

    const history = analytics.getHistory?.() || [];
    const hist = document.getElementById('meal-history-container');
    if (hist) {
        if (!history.length) {
            hist.innerHTML = '<p style="color:#6b7280; font-size:13px; padding:6px;">Log meals to build analytics.</p>';
        } else {
            hist.innerHTML = history.slice(-5).reverse().map(h => `
                <div class="list-item"><div class="list-item-body">
                    <div class="list-item-title">${h.name || h.recipeName || 'Meal'}</div>
                    <div class="list-item-sub">${h.date || ''} · ${h.calories || 0} kcal</div>
                </div></div>
            `).join('');
        }
    }
}
window.updateTodayNutrition = updateNutritionScreen;
window.renderNutritionGoals = renderNutritionGoals;

// ---- DOM Element Cache ----
const domCache = {
    peopleCount: null,
    dietChips: {},
    allergy: null,
    cuisine: null,
    maxTime: null,
    difficulty: null
};

function getDomElement(id) {
    if (!domCache[id]) {
        domCache[id] = document.getElementById(id);
    }
    return domCache[id];
}

// ---- Init ----
async function init() {
    const loaded = await loadState();
    pantry = loaded.pantry; mealPlan = loaded.mealPlan;
    preferences = loaded.preferences; recipeRatings = loaded.recipeRatings;

    await db.migrateFromLocalStorage();

    preferences.people = preferences.people || 1;
    getDomElement('people-count').value = preferences.people;
    const diets = preferences.diets || (preferences.diet && preferences.diet !== 'none' ? [preferences.diet] : []);
    const map = {
        'diet-vegetarian': 'vegetarian',
        'diet-vegan': 'vegan',
        'diet-keto': 'keto',
        'diet-glutenfree': 'gluten-free',
        'diet-diabetic': 'diabetic',
        'diet-lowcarb': 'lowcarb',
        'diet-lowsodium': 'lowsodium',
        'diet-heart': 'heart'
    };
    for (const [id, v] of Object.entries(map)) {
        const el = getDomElement(id);
        if (el) {
            el.checked = diets.includes(v);
            el.parentElement.classList.toggle('active', el.checked);
        }
    }
    getDomElement('allergy').value = preferences.allergy || 'none';
    getDomElement('cuisine').value = preferences.cuisine || 'all';
    getDomElement('max-time').value = preferences.maxTime || 60;
    getDomElement('difficulty').value = preferences.difficulty || 'any';

    pantryManager.renderPantry();
    updatePantryCount();
    window.renderMealPlan();
    pantryManager.resetIngredientForm();
    renderSeasonalSuggestions();
    renderLeftovers();

    try { await dataManager.loadData(); } catch(e) { console.error('Dataset load failed', e); }

    window.updateMeals();
    await updateNutritionScreen();
}
init();
