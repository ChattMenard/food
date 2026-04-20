import { GEMINI_API_KEY } from '../utils/config.js';
import { RecipeEngine } from '../logic/recipeEngine.js';
import { IngredientVectors } from '../logic/ingredientVectors.js';
import { aiCache } from '../utils/cacheManager.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

export class GeminiAI {
    constructor({ getPantry, getPreferences, getRecipes, announce }) {
        this.getPantry = getPantry;
        this.getPreferences = getPreferences;
        this.getRecipes = getRecipes;
        this.announce = announce;
        this.isLoading = false;

        // Response cache (uses shared CacheManager with TTL + LRU eviction)
        this.cache = aiCache;

        // Rate limiting
        this.requestTimestamps = [];
        this.checkRateLimit();

        // Offline fallback
        this.recipeEngine = null;
        this.ingredientVectors = null;
    }

    /**
     * Validate AI response structure
     * @param {Object} data - Response data to validate
     * @param {string} expectedType - Expected response type
     * @returns {boolean} True if valid
     */
    validateResponse(data, expectedType) {
        if (!data || typeof data !== 'object') {
            console.warn('[AI] Invalid response: not an object');
            return false;
        }

        if (expectedType === 'suggestions') {
            if (!Array.isArray(data.suggestions)) {
                console.warn('[AI] Invalid suggestions: not an array');
                return false;
            }
            // Validate each suggestion has required fields
            return data.suggestions.every(s => 
                s.name && 
                typeof s.name === 'string' &&
                (s.pantryIngredients || Array.isArray(s.pantryIngredients)) &&
                (s.neededIngredients || Array.isArray(s.neededIngredients))
            );
        }

        if (expectedType === 'mealplan') {
            if (!data.mealPlan || typeof data.mealPlan !== 'object') {
                console.warn('[AI] Invalid meal plan: missing mealPlan object');
                return false;
            }
            // Validate meal plan has required days
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            return days.every(day => data.mealPlan[day] && typeof data.mealPlan[day] === 'string');
        }

        if (expectedType === 'chat') {
            // Chat responses should be strings
            return typeof data === 'string' && data.length > 0;
        }

        return true;
    }

    /**
     * Check and enforce rate limit
     */
    checkRateLimit() {
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    }

    /**
     * Check if rate limited
     */
    isRateLimited() {
        this.checkRateLimit();
        return this.requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW;
    }

    /**
     * Record API request for rate limiting
     */
    recordRequest() {
        this.requestTimestamps.push(Date.now());
    }

    /**
     * Initialize offline fallback engines
     */
    initOfflineFallback() {
        if (!this.recipeEngine) {
            const recipes = this.getRecipes();
            if (recipes.length > 0) {
                this.ingredientVectors = new IngredientVectors(recipes);
                this.recipeEngine = new RecipeEngine({
                    getRecipes: () => recipes,
                    getRecipeRatings: () => ({}),
                    persistRecipeRatings: () => {},
                    announce: () => {}
                });
                this.recipeEngine.ingredientVectors = this.ingredientVectors;
            }
        }
    }

    /**
     * Get offline fallback suggestions using recipe engine
     */
    getOfflineSuggestions(pantry) {
        this.initOfflineFallback();
        if (!this.recipeEngine) return null;

        const pantryNames = pantry.map(i => i.name);
        const recipes = this.getRecipes();

        // Find recipes with most matching ingredients
        const scored = recipes.map(recipe => {
            const matched = recipe.ingredients.filter(ing => 
                pantryNames.some(p => ing.includes(p) || p.includes(ing))
            ).length;
            return { recipe, matched, ratio: matched / recipe.ingredients.length };
        })
        .filter(s => s.matched > 0)
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 3);

        return scored.map(s => ({
            name: s.recipe.name,
            description: `Uses ${s.matched} of ${s.recipe.ingredients.length} ingredients from your pantry`,
            pantryIngredients: s.recipe.ingredients.filter(ing => 
                pantryNames.some(p => ing.includes(p) || p.includes(ing))
            ),
            neededIngredients: s.recipe.ingredients.filter(ing => 
                !pantryNames.some(p => ing.includes(p) || p.includes(ing))
            )
        }));
    }

    async generateAISuggestions() {
        if (this.isLoading) return null;
        
        const pantry = this.getPantry();
        if (pantry.length === 0) {
            this.announce('Add ingredients to your pantry first for AI suggestions');
            return null;
        }

        // Check rate limit
        if (this.isRateLimited()) {
            this.announce('Rate limit reached. Using offline suggestions.');
            return this.getOfflineSuggestions(pantry);
        }

        // Generate cache key
        const preferences = this.getPreferences();
        const cacheKey = `suggestions-${pantry.map(i => i.name).sort().join(',')}-${JSON.stringify(preferences)}`;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        this.isLoading = true;
        
        try {
            const pantryIngredients = pantry.map(i => i.name).join(', ');
            const dietInfo = preferences.diets && preferences.diets.length > 0 
                ? `Dietary restrictions: ${preferences.diets.join(', ')}` 
                : 'No dietary restrictions';
            const allergyInfo = preferences.allergy && preferences.allergy !== 'none'
                ? `Allergy: ${preferences.allergy}`
                : 'No allergies';
            const cuisineInfo = preferences.cuisine && preferences.cuisine !== 'all'
                ? `Preferred cuisine: ${preferences.cuisine}`
                : 'Any cuisine';
            const timeLimit = preferences.maxTime || 60;

            const prompt = `You are a helpful meal planning assistant. Based on the following pantry ingredients, suggest 3 creative meal ideas that:
- Use as many of these ingredients as possible: ${pantryIngredients}
- Respect these constraints: ${dietInfo}, ${allergyInfo}, ${cuisineInfo}
- Can be cooked in ${timeLimit} minutes or less
- Are practical and delicious

For each suggestion, provide:
1. Recipe name (creative and appetizing)
2. Brief description (1-2 sentences)
3. Key ingredients used from pantry
4. Any additional ingredients needed (minimal list)

Format your response as JSON with this structure:
{
  "suggestions": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "pantryIngredients": ["ingredient1", "ingredient2"],
      "neededIngredients": ["ingredient1", "ingredient2"]
    }
  ]
}

Return ONLY the JSON, no other text.`;

            // Check if offline
            if (!navigator.onLine) {
                console.log('[AI] Offline mode, using fallback');
                return this.getOfflineSuggestions(pantry);
            }

            this.recordRequest();
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to get AI suggestions');
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) {
                throw new Error('No response from AI');
            }

            // Extract JSON from response (sometimes AI wraps it in markdown)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid AI response format');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate response structure
            if (!this.validateResponse(parsed, 'suggestions')) {
                throw new Error('Invalid AI response structure');
            }
            
            const suggestions = parsed.suggestions || [];
            
            // Cache the response
            this.cache.set(cacheKey, suggestions);
            
            return suggestions;

        } catch (error) {
            console.error('AI suggestion error:', error);
            this.announce(`AI suggestion failed: ${error.message}. Using offline suggestions.`);
            // Fallback to offline suggestions
            return this.getOfflineSuggestions(pantry);
        } finally {
            this.isLoading = false;
        }
    }

    async getSmartMealPlan() {
        if (this.isLoading) return null;
        
        const pantry = this.getPantry();
        if (pantry.length === 0) {
            this.announce('Add ingredients to your pantry first for AI meal planning');
            return null;
        }

        // Check rate limit
        if (this.isRateLimited()) {
            this.announce('Rate limit reached. Please try again later.');
            return null;
        }

        // Generate cache key
        const preferences = this.getPreferences();
        const people = preferences.people || 1;
        const cacheKey = `mealplan-${pantry.map(i => i.name).sort().join(',')}-${people}-${JSON.stringify(preferences)}`;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        this.isLoading = true;
        
        try {
            const pantryIngredients = pantry.map(i => i.name).join(', ');
            const dietInfo = preferences.diets && preferences.diets.length > 0 
                ? `Dietary restrictions: ${preferences.diets.join(', ')}` 
                : 'No dietary restrictions';
            const allergyInfo = preferences.allergy && preferences.allergy !== 'none'
                ? `Allergy: ${preferences.allergy}`
                : 'No allergies';

            const prompt = `You are a meal planning expert. Create a 7-day meal plan (Monday through Sunday) for ${people} person(s) using these pantry ingredients: ${pantryIngredients}

Constraints:
- ${dietInfo}
- ${allergyInfo}
- Minimize additional grocery shopping needed
- Include variety across the week (different proteins, cooking methods, flavors)
- Consider meal prep efficiency (cook once, eat twice)

Format your response as JSON:
{
  "mealPlan": {
    "Monday": "Meal Name",
    "Tuesday": "Meal Name",
    "Wednesday": "Meal Name",
    "Thursday": "Meal Name",
    "Friday": "Meal Name",
    "Saturday": "Meal Name",
    "Sunday": "Meal Name"
  },
  "shoppingList": ["item1", "item2", "item3"]
}

Return ONLY the JSON, no other text.`;

            // Check if offline
            if (!navigator.onLine) {
                console.log('[AI] Offline mode, cannot generate meal plan');
                throw new Error('Offline - meal planning requires internet connection');
            }

            this.recordRequest();
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.8,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to generate meal plan');
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) {
                throw new Error('No response from AI');
            }

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid AI response format');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate response structure
            if (!this.validateResponse(parsed, 'mealplan')) {
                throw new Error('Invalid AI response structure');
            }
            
            // Cache the response
            this.cache.set(cacheKey, parsed);
            
            return parsed;

        } catch (error) {
            console.error('AI meal plan error:', error);
            this.announce(`AI meal planning failed: ${error.message}`);
            return null;
        } finally {
            this.isLoading = false;
        }
    }

    async askAI(userMessage) {
        if (this.isLoading || !userMessage.trim()) return null;

        // Check rate limit
        if (this.isRateLimited()) {
            this.announce('Rate limit reached. Please try again later.');
            return null;
        }

        // Generate cache key
        const cacheKey = `chat-${userMessage.trim()}`;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        this.isLoading = true;

        try {
            const pantry = this.getPantry();
            const pantryContext = pantry.length > 0
                ? `The user's pantry contains: ${pantry.map(i => i.name).join(', ')}.`
                : 'The user has no ingredients in their pantry yet.';
            const preferences = this.getPreferences();
            const prefContext = [
                preferences.diets?.length ? `Diet: ${preferences.diets.join(', ')}` : null,
                preferences.allergy && preferences.allergy !== 'none' ? `Allergy: ${preferences.allergy}` : null,
                preferences.cuisine && preferences.cuisine !== 'all' ? `Cuisine preference: ${preferences.cuisine}` : null,
            ].filter(Boolean).join('. ');

            const systemContext = `You are a helpful cooking and meal planning assistant. ${pantryContext}${prefContext ? ' ' + prefContext + '.' : ''} Answer the user's question concisely and helpfully.`;

            // Check if offline
            if (!navigator.onLine) {
                console.log('[AI] Offline mode, cannot answer questions');
                throw new Error('Offline - AI chat requires internet connection');
            }

            this.recordRequest();
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemContext}\n\nUser: ${userMessage}` }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Request failed');
            }

            const data = await response.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
            
            // Validate response
            if (!this.validateResponse(responseText, 'chat')) {
                throw new Error('Invalid AI response structure');
            }
            
            // Cache the response
            this.cache.set(cacheKey, responseText);
            
            return responseText;

        } catch (error) {
            console.error('AI chat error:', error);
            this.announce(`AI error: ${error.message}`);
            return null;
        } finally {
            this.isLoading = false;
        }
    }
}
