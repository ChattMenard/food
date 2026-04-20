import { GEMINI_API_KEY } from './config.js';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export class GeminiAI {
    constructor({ getPantry, getPreferences, getRecipes, announce }) {
        this.getPantry = getPantry;
        this.getPreferences = getPreferences;
        this.getRecipes = getRecipes;
        this.announce = announce;
        this.isLoading = false;
    }

    async generateAISuggestions() {
        if (this.isLoading) return null;
        
        const pantry = this.getPantry();
        if (pantry.length === 0) {
            this.announce('Add ingredients to your pantry first for AI suggestions');
            return null;
        }

        this.isLoading = true;
        
        try {
            const pantryIngredients = pantry.map(i => i.name).join(', ');
            const preferences = this.getPreferences();
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
            return parsed.suggestions || [];

        } catch (error) {
            console.error('AI suggestion error:', error);
            this.announce(`AI suggestion failed: ${error.message}`);
            return null;
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

        this.isLoading = true;
        
        try {
            const pantryIngredients = pantry.map(i => i.name).join(', ');
            const preferences = this.getPreferences();
            const people = preferences.people || 1;
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
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';

        } catch (error) {
            console.error('AI chat error:', error);
            this.announce(`AI error: ${error.message}`);
            return null;
        } finally {
            this.isLoading = false;
        }
    }
}
