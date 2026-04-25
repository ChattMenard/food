import { passesDiet, passesAllergy, passesCuisine } from '../../utils/dietFilters.js';

const INITIAL_RENDER_COUNT = 20;
const LOAD_BATCH_SIZE = 10;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export class MealPlanner {
    constructor({ getPantry, getMealPlan, getPreferences, getRecipes, persistMealPlan }) {
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

    getDomElement(id) {
        if (!this.domCache[id]) {
            this.domCache[id] = document.getElementById(id);
        }
        return this.domCache[id];
    }

    getPantryHash() {
        const pantry = this.getPantry();
        return pantry.map(i => `${i.name}-${i.quantity}-${i.unit}`).join('|');
    }

    buildPreferenceKey(preferences) {
        const { diets = [], allergy, cuisine, maxTime, difficulty } = preferences;
        return JSON.stringify({ diets, allergy, cuisine, maxTime, difficulty });
    }

    rankedMeals(sortBy = 'fewest', sortDir = 'asc') {
        const pantry = this.getPantry();
        const preferences = this.getPreferences();
        const recipes = this.getRecipes();
        const pantryNames = pantry.map(i => i.name.toLowerCase());
        if (recipes.length === 0) return [];

        const currentHash = this.getPantryHash();
        const prefKey = this.buildPreferenceKey(preferences);
        const cacheKey = `${currentHash}-${prefKey}-${sortBy}-${sortDir}`;

        if (this.lastPantryHash === currentHash && this.mealCache.has(cacheKey)) {
            return this.mealCache.get(cacheKey);
        }

        const scored = [];
        for (const r of recipes) {
            const selectedDiets = preferences.diets || [];
            if (selectedDiets.length > 0 && !passesDiet(r, selectedDiets)) continue;
            if (!passesAllergy(r, preferences.allergy)) continue;
            if (!passesCuisine(r, preferences.cuisine)) continue;
            if (r.minutes > (preferences.maxTime || 9999)) continue;

            const difficulty = preferences.difficulty || 'any';
            if (difficulty !== 'any') {
                if (difficulty === 'easy' && r.minutes > 30) continue;
                if (difficulty === 'medium' && (r.minutes < 15 || r.minutes > 60)) continue;
                if (difficulty === 'hard' && r.minutes < 45) continue;
            }

            const matched = r.ingredients.filter(ing => pantryNames.some(p => ing.includes(p) || p.includes(ing))).length;
            const ratio = matched / r.ingredients.length;
            const hasAll = matched === r.ingredients.length;
            scored.push({ r, matched, missing: r.ingredients.length - matched, ratio, hasAll, ingredientCount: r.ingredients.length });
        }

        this.sortScored(scored, sortBy, sortDir);

        this.mealCache.set(cacheKey, scored);
        this.lastPantryHash = currentHash;
        if (this.mealCache.size > 10) {
            this.mealCache.clear();
        }
        return scored;
    }

    sortScored(scored, sortBy, sortDir) {
        const dir = sortDir === 'desc' ? -1 : 1;
        switch (sortBy) {
            case 'fewest':
                // Prioritize recipes with all ingredients available, then by missing count, then by ratio
                scored.sort((a, b) => dir * ((b.hasAll - a.hasAll) || (a.missing - b.missing) || (b.ratio - a.ratio)));
                break;
            case 'best':
                scored.sort((a, b) => dir * ((b.hasAll - a.hasAll) || (b.ratio - a.ratio) || (a.missing - b.missing)));
                break;
            case 'fastest':
                scored.sort((a, b) => dir * ((b.hasAll - a.hasAll) || (a.r.minutes - b.r.minutes)));
                break;
            case 'difficulty':
                const diffOrder = { easy: 1, medium: 2, hard: 3 };
                scored.sort((a, b) => dir * ((b.hasAll - a.hasAll) || ((diffOrder[a.r.difficulty] || 2) - (diffOrder[b.r.difficulty] || 2))));
                break;
            case 'ingredients':
                scored.sort((a, b) => dir * ((b.hasAll - a.hasAll) || (a.ingredientCount - b.ingredientCount)));
                break;
            case 'rating':
                scored.sort((a, b) => dir * ((b.hasAll - a.hasAll) || ((a.r.rating || 0) - (b.r.rating || 0))));
                break;
            case 'name':
                scored.sort((a, b) => dir * ((b.hasAll - a.hasAll) || a.r.name.localeCompare(b.r.name)));
                break;
            default:
                scored.sort((a, b) => dir * ((b.hasAll - a.hasAll) || (a.missing - b.missing)));
        }
    }

    updateMeals(sortBy = 'fewest', sortDir = 'asc') {
        const ranked = this.rankedMeals(sortBy, sortDir);
        this.renderMeals(ranked);
    }

    sortMeals(sortBy, sortDir) {
        this.updateMeals(sortBy, sortDir || 'asc');
    }

    renderMeals(scored) {
        const list = this.getDomElement('meals-list');
        const pantryNames = this.getPantry().map(i => i.name.toLowerCase());
        const badge = document.getElementById('meals-badge');
        if (badge) badge.textContent = scored.length;

        if (scored.length === 0) {
            list.innerHTML = '<p class="text-gray-400 col-span-2 text-center py-8">Add ingredients to your pantry to see recipe matches!</p>';
            return;
        }

        const initialRecipes = scored.slice(0, INITIAL_RENDER_COUNT);
        const remainingRecipes = scored.slice(INITIAL_RENDER_COUNT);

        list.innerHTML = initialRecipes.map(({ r, matched, missing, hasAll }, i) => this.renderRecipeCard(r, matched, missing, hasAll, pantryNames, i)).join('');
        list.dataset.remainingRecipes = JSON.stringify(remainingRecipes);
        list.dataset.renderedCount = INITIAL_RENDER_COUNT;

        list.onscroll = () => {
            if (list.scrollTop + list.clientHeight >= list.scrollHeight - 100) {
                this.loadMoreRecipes();
            }
        };
    }

    renderRecipeCard(recipe, matched, missing, hasAll, pantryNames, index) {
        const missingIndicator = !hasAll ? '<span class="inline-block w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5 flex-shrink-0" title="Missing ingredients"></span>' : '<span class="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full mr-1.5 flex-shrink-0" title="All ingredients available"></span>';
        const cardBorder = !hasAll ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30';
        return `
            <div class="border ${cardBorder} rounded-xl p-4 hover:shadow-md transition" data-recipe-index="${index}">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold cursor-pointer hover:text-orange-600 flex items-center" onclick="openRecipeModal('${recipe.name.replace(/'/g, "\\'")}')">${missingIndicator}${recipe.name}</h3>
                    <span class="text-sm text-orange-600">★${recipe.rating || '-'}</span>
                </div>
                ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" class="w-full h-32 object-cover rounded-lg mb-2" loading="lazy">` : ''}
                <p class="text-sm text-gray-500 mb-2">${recipe.minutes} min${recipe.servings ? ' · ' + recipe.servings + ' servings' : ''}${recipe.difficulty ? ' · ' + recipe.difficulty : ''}</p>
                <div class="flex flex-wrap gap-1">
                    ${recipe.ingredients.map(ing => `
                        <span class="text-xs px-2 py-1 rounded-full ${pantryNames.some(p => ing.includes(p) || p.includes(ing)) ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-600'}">
                            ${ing}
                        </span>
                    `).join('')}
                </div>
                <div class="mt-3 flex justify-between items-center">
                    <span class="text-xs ${!hasAll ? 'text-red-500 font-medium' : 'text-gray-400'}">${matched}/${recipe.ingredients.length} in pantry · ${missing} to buy</span>
                    <button onclick="addToPlanByName('${recipe.name.replace(/'/g, "\\'")}')" class="text-sm bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600">Add</button>
                </div>
            </div>
        `;
    }

    loadMoreRecipes() {
        if (this.isLoadingMore) return;
        const list = this.getDomElement('meals-list');
        const remainingRecipes = JSON.parse(list.dataset.remainingRecipes || '[]');
        const renderedCount = parseInt(list.dataset.renderedCount || '0', 10);
        if (remainingRecipes.length === 0) return;

        this.isLoadingMore = true;
        const pantryNames = this.getPantry().map(i => i.name.toLowerCase());
        const nextBatch = remainingRecipes.slice(0, LOAD_BATCH_SIZE);
        const newRemaining = remainingRecipes.slice(LOAD_BATCH_SIZE);

        const newContent = nextBatch.map(({ r, matched, missing, hasAll }, i) => this.renderRecipeCard(r, matched, missing, hasAll, pantryNames, renderedCount + i)).join('');
        list.insertAdjacentHTML('beforeend', newContent);
        list.dataset.remainingRecipes = JSON.stringify(newRemaining);
        list.dataset.renderedCount = renderedCount + nextBatch.length;
        this.isLoadingMore = false;
    }

    addToPlanByName(name) {
        const recipes = this.getRecipes();
        const mealPlan = this.getMealPlan();
        const recipe = recipes.find(r => r.name === name);
        if (!recipe) return;
        const dayKeys = Object.keys(mealPlan);
        const day = dayKeys.length < 7 ? DAYS[dayKeys.length] : DAYS[Math.floor(Math.random() * 7)];
        mealPlan[day] = recipe.name;
        this.persistMealPlan();
        this.renderMealPlan();
    }

    renderMealPlan() {
        const plan = this.getDomElement('week-plan');
        const mealPlan = this.getMealPlan();
        const recipes = this.getRecipes();

        plan.innerHTML = DAYS.map(day => `
            <div class="text-center p-3 bg-orange-100 rounded-lg cursor-move hover:bg-orange-200 transition" draggable="true" data-day="${day}">
                <div class="text-xs text-gray-500 mb-1">${day}</div>
                <div class="text-sm font-medium">${mealPlan[day] || '---'}</div>
            </div>
        `).join('');

        // Add drag and drop event listeners
        const dayCards = plan.querySelectorAll('[data-day]');
        dayCards.forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragover', this.handleDragOver.bind(this));
            card.addEventListener('drop', this.handleDrop.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        const totalMin = Object.values(mealPlan).reduce((sum, name) => {
            const recipe = recipes.find(r => r.name === name);
            return sum + (recipe ? recipe.time : 0);
        }, 0);

        this.getDomElement('plan-stats').textContent = `${Object.keys(mealPlan).length} meals · ~${totalMin} min total`;
    }

    handleDragStart(e) {
        this.draggedDay = e.target.dataset.day;
        e.target.classList.add('opacity-50');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e) {
        e.preventDefault();
        const targetDay = e.target.closest('[data-day]')?.dataset.day;
        
        if (targetDay && this.draggedDay && targetDay !== this.draggedDay) {
            const mealPlan = this.getMealPlan();
            const temp = mealPlan[this.draggedDay];
            mealPlan[this.draggedDay] = mealPlan[targetDay];
            mealPlan[targetDay] = temp;
            this.persistMealPlan();
            this.renderMealPlan();
        }
    }

    handleDragEnd(e) {
        e.target.classList.remove('opacity-50');
        this.draggedDay = null;
    }

    updateShoppingList() {
        const list = this.getDomElement('shopping-list');
        const tips = this.getDomElement('budget-tips');
        const pantry = this.getPantry();
        const mealPlan = this.getMealPlan();
        const recipes = this.getRecipes();
        const pantryNames = pantry.map(i => i.name.toLowerCase());

        const needed = {};
        Object.values(mealPlan).forEach(mealName => {
            const recipe = recipes.find(r => r.name === mealName);
            if (recipe) {
                recipe.ingredients.forEach(ing => {
                    const inPantry = pantryNames.some(p => ing.includes(p) || p.includes(ing));
                    if (!inPantry) {
                        needed[ing] = (needed[ing] || 0) + 1;
                    }
                });
            }
        });

        if (Object.keys(needed).length === 0) {
            list.innerHTML = '<p class="text-gray-400 text-sm">Add meals to your plan first!</p>';
            tips.innerHTML = '<p class="text-gray-400 text-sm">Add meals to see cost-saving tips.</p>';
            return;
        }

        list.innerHTML = Object.entries(needed).map(([item, qty]) => `
            <div class="flex justify-between items-center p-3 bg-orange-100 rounded-lg">
                <span class="capitalize">${item}</span>
                <span class="text-sm text-gray-500">${qty}</span>
            </div>
        `).join('');

        const tipTexts = [];
        if (pantryNames.includes('potatoes')) tipTexts.push('Potatoes can stretch 5+ meals - hash, soup, wedges, salad, fried rice');
        if (pantryNames.includes('rice') && pantryNames.includes('beans')) tipTexts.push('Rice + beans = complete protein, feeds family cheap');
        if (pantryNames.includes('eggs')) tipTexts.push('Eggs are versatile: breakfast, baking, protein boost in any meal');
        if (Object.keys(needed).length > 5) tipTexts.push('Tip: Prioritize meals using more pantry items to reduce shopping');

        tips.innerHTML = tipTexts.map(t => `
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                ${t}
            </div>
        `).join('') || '<p class="text-gray-400 text-sm">Add more ingredients for tips.</p>';
    }

    copyShoppingList() {
        const pantry = this.getPantry();
        const mealPlan = this.getMealPlan();
        const recipes = this.getRecipes();
        const pantryNames = pantry.map(i => i.name.toLowerCase());
        const needed = {};
        Object.values(mealPlan).forEach(mealName => {
            const recipe = recipes.find(r => r.name === mealName);
            if (recipe) {
                recipe.ingredients.forEach(ing => {
                    const inPantry = pantryNames.some(p => ing.includes(p) || p.includes(ing));
                    if (!inPantry) {
                        needed[ing] = (needed[ing] || 0) + 1;
                    }
                });
            }
        });
        const text = Object.entries(needed).map(([item, qty]) => `${item} (${qty})`).join('\n');
        navigator.clipboard.writeText(text);
        alert('Shopping list copied!');
    }
}
