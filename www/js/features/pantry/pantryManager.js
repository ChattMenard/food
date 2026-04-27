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

    async startSpeechRecognition() {
        const modal = document.getElementById('speech-modal');
        const status = document.getElementById('speech-status');
        modal.classList.add('active');
        status.textContent = 'Listening…';
        try {
            if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'android') {
                await this.startCapacitorSpeechRecognition();
            } else {
                await this.startWebSpeechRecognition();
            }
        } catch (error) {
            console.error('Speech recognition error:', error);
            status.textContent = 'Error: Speech recognition failed';
            setTimeout(() => this.stopSpeechRecognition(), 3500);
        }
    }

    async startCapacitorSpeechRecognition() {
        const status = document.getElementById('speech-status');
        try {
            const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
            const { available } = await SpeechRecognition.available();
            if (!available) {
                status.textContent = 'Speech recognition is not available on this device.';
                setTimeout(() => this.stopSpeechRecognition(), 1500);
                return;
            }

            const { permissionState } = await SpeechRecognition.requestPermissions();
            if (permissionState !== 'granted') {
                status.textContent = 'Microphone permission is required. Please allow access and try again.';
                setTimeout(() => this.stopSpeechRecognition(), 2500);
                return;
            }

            await SpeechRecognition.start({
                language: 'en-US',
                maxResults: 5,
                partialResults: true,
                prompt: 'Say an ingredient name',
                popup: true
            });

            this._capacitorListener = SpeechRecognition.addListener('result', (data) => {
                const transcript = data.matches?.[0]?.toLowerCase().trim() || '';
                this.handleSpeechResult(transcript, status);
            });

            this._capacitorErrorListener = SpeechRecognition.addListener('error', (data) => {
                status.textContent = this._friendlyMicError(data.error);
                setTimeout(() => this.stopSpeechRecognition(), 1500);
            });

            this._SpeechRecognition = SpeechRecognition;
        } catch (error) {
            console.error('[Speech] Capacitor speech recognition error:', error);
            status.textContent = this._friendlyMicError(error.code || error.message || 'speech-init-failed');
            setTimeout(() => this.stopSpeechRecognition(), 1500);
        }
    }

    _friendlyMicError(errorCode) {
        const messages = {
            'not-allowed': 'Microphone access denied. Please allow mic access in your browser settings and try again.',
            'no-speech': 'No speech detected. Please try again and speak clearly.',
            'audio-capture': 'No microphone found. Please connect a mic and try again.',
            'network': 'Network error. Check your connection and try again.',
            'aborted': 'Speech recognition was cancelled.',
            'service-not-allowed': 'Speech service not available. Try using Chrome or Edge.',
        };
        return messages[errorCode] || `Speech recognition error: ${errorCode}`;
    }

    async startWebSpeechRecognition() {
        const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const status = document.getElementById('speech-status');
        
        if (!WebSpeechRecognition) {
            status.textContent = 'Speech recognition is not supported in this browser. Try Chrome or Edge.';
            setTimeout(() => this.stopSpeechRecognition(), 3000);
            return;
        }

        // Pre-check microphone permission
        try {
            if (navigator.permissions) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                if (result.state === 'denied') {
                    status.textContent = 'Microphone access is blocked. Please enable it in browser settings (click the lock icon in the address bar).';
                    setTimeout(() => this.stopSpeechRecognition(), 4000);
                    return;
                }
            }
        } catch (_e) {
            // permissions API may not support 'microphone' query in all browsers
        }

        const recognition = new WebSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        this._recognition = recognition;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            this.handleSpeechResult(transcript, status);
        };

        recognition.onerror = (event) => {
            status.textContent = this._friendlyMicError(event.error);
            setTimeout(() => this.stopSpeechRecognition(), 3500);
        };

        try {
            recognition.start();
        } catch (error) {
            status.textContent = this._friendlyMicError(error.message || 'unknown');
            setTimeout(() => this.stopSpeechRecognition(), 3500);
        }
    }

    handleSpeechResult(transcript, status) {
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
    }

    async stopSpeechRecognition() {
        // Stop web speech recognition
        if (this._recognition) {
            try { this._recognition.stop(); } catch (_error) {}
            this._recognition = null;
        }

        // Stop Capacitor speech recognition
        if (this._capacitorListener) {
            await this._capacitorListener.remove();
            this._capacitorListener = null;
        }
        if (this._capacitorErrorListener) {
            await this._capacitorErrorListener.remove();
            this._capacitorErrorListener = null;
        }

        if (this._SpeechRecognition) {
            try {
                await this._SpeechRecognition.stop();
            } catch (_error) {}
            this._SpeechRecognition = null;
        }

        const modal = document.getElementById('speech-modal');
        modal.classList.remove('active');
    }
}
