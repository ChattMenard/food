import { parseIngredients } from '../../utils/ingredientParser.js';

const INGREDIENT_CATEGORIES = {
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

function getIngredientCategory(ingredient) {
    const name = ingredient.toLowerCase();
    for (const [category, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
        if (keywords.some(k => name.includes(k))) return category;
    }
    return 'Other';
}

export class PantryManager {
    constructor({ getPantry, persistPantry, announce, getAutocompleteIngredients, getEditingIndex, setEditingIndex, onPantryChange }) {
        this.getPantry = getPantry;
        this.persistPantry = persistPantry;
        this.announce = announce;
        this.getAutocompleteIngredients = getAutocompleteIngredients;
        this.getEditingIndex = getEditingIndex;
        this.setEditingIndex = setEditingIndex;
        this.onPantryChange = onPantryChange || (() => {});
    }

    showSuggestions() {
        const input = document.getElementById('new-ingredient');
        const box = document.getElementById('ingredient-suggestions');
        const query = input.value.trim().toLowerCase();
        const allIngredients = this.getAutocompleteIngredients();
        
        // Update dropdown
        if (!query) { box.classList.add('hidden'); }
        else {
            const matches = allIngredients.filter(i => i.includes(query)).slice(0, 10);
            if (matches.length === 0) { box.classList.add('hidden'); }
            else {
                box.innerHTML = matches.map(m => `<div onclick="selectSuggestion('${m}')" class="px-4 py-2 hover:bg-purple-200 cursor-pointer capitalize">${m}</div>`).join('');
                box.classList.remove('hidden');
            }
        }
    }

    hideSuggestions() {
        document.getElementById('ingredient-suggestions').classList.add('hidden');
    }

    selectSuggestion(value) {
        document.getElementById('new-ingredient').value = value;
        this.hideSuggestions();
        document.getElementById('add-button').focus();
    }

    handleIngredientKey(e) {
        if (e.key === 'Enter') {
            this.hideSuggestions();
            if (window.routeInput) { window.routeInput(); return; }
            this.addIngredient();
        } else if (e.key === 'Escape') {
            this.hideSuggestions();
        }
    }

    resetIngredientForm() {
        document.getElementById('new-ingredient').value = '';
        this.setEditingIndex(null);
        const button = document.getElementById('add-button');
        button.textContent = 'Add';
        button.classList.remove('bg-amber-700');
        button.classList.add('bg-orange-500');
        button.onclick = () => this.addIngredient();
    }

    addIngredient() {
        const input = document.getElementById('new-ingredient');
        const name = input.value.trim().toLowerCase();
        if (!name) return;

        const pantry = this.getPantry();
        const editingIndex = this.getEditingIndex();
        if (editingIndex !== null && typeof editingIndex !== 'undefined') {
            pantry[editingIndex] = { name };
            this.announce(`Updated ${name} in pantry`);
        } else if (!pantry.find(i => i.name === name)) {
            pantry.push({ name });
            this.announce(`Added ${name} to pantry`);
        }

        this.savePantry();
        this.renderPantry();
        this.resetIngredientForm();
        this.onPantryChange();
    }

    editIngredient(index) {
        const pantry = this.getPantry();
        const item = pantry[index];
        this.setEditingIndex(index);
        document.getElementById('new-ingredient').value = item.name;
        const button = document.getElementById('add-button');
        button.textContent = 'Save';
        button.classList.remove('bg-orange-500');
        button.classList.add('bg-amber-700');
        button.onclick = () => this.saveEditedIngredient();
    }

    saveEditedIngredient() {
        this.addIngredient();
        this.resetIngredientForm();
    }

    removeIngredient(index) {
        const pantry = this.getPantry();
        const item = pantry[index];
        const ok = confirm(`Remove ${item.name}?`);
        if (!ok) return;
        pantry.splice(index, 1);
        this.savePantry();
        this.renderPantry();
        this.announce(`Removed ${item.name} from pantry`);
        this.onPantryChange();
    }

    savePantry() {
        this.persistPantry();
    }

    renderPantry() {
        const list = document.getElementById('pantry-list');
        const pantry = this.getPantry();
        if (pantry.length === 0) {
            list.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">No ingredients yet. Add some above!</p>';
            return;
        }
        list.innerHTML = pantry.map((item, i) => {
            const category = getIngredientCategory(item.name);
            return `
                <div class="flex justify-between items-center p-3 bg-orange-100 rounded-lg">
                    <div class="flex-1">
                        <span class="capitalize font-medium">${item.name}</span>
                        <span class="text-xs px-2 py-0.5 ml-2 bg-amber-200 text-amber-800 rounded-full">${category}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editIngredient(${i})" class="text-orange-500 hover:text-orange-700 text-sm">Edit</button>
                        <button onclick="removeIngredient(${i})" class="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    _parseIngredients(transcript) {
        // Use shared ingredient parser utility
        return parseIngredients(transcript);
    }

    startSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }
        const modal = document.getElementById('speech-modal');
        const status = document.getElementById('speech-status');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        status.textContent = 'Listening…';

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        this._recognition = recognition;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();

            if (window.isAIQuery && window.isAIQuery(transcript)) {
                document.getElementById('new-ingredient').value = transcript;
                status.textContent = 'Asking AI…';
                setTimeout(() => {
                    this.stopSpeechRecognition();
                    window.routeInput && window.routeInput();
                }, 400);
                return;
            }

            const ingredients = this._parseIngredients(transcript);
            if (ingredients.length > 1) {
                for (const name of ingredients) {
                    document.getElementById('new-ingredient').value = name;
                    this.addIngredient();
                }
                status.textContent = `Added ${ingredients.length} ingredients`;
            } else {
                document.getElementById('new-ingredient').value = ingredients[0] || transcript;
                status.textContent = `"${ingredients[0] || transcript}"`;
            }
            setTimeout(() => this.stopSpeechRecognition(), 900);
        };

        recognition.onerror = (event) => {
            status.textContent = `Error: ${event.error}`;
            setTimeout(() => this.stopSpeechRecognition(), 1500);
        };

        recognition.onend = () => this.stopSpeechRecognition();

        recognition.start();
    }

    stopSpeechRecognition() {
        if (this._recognition) {
            try { this._recognition.stop(); } catch (e) {}
            this._recognition = null;
        }
        const modal = document.getElementById('speech-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
