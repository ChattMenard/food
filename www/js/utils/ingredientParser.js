/**
 * Ingredient Parser Utility
 * Parses ingredient names from speech/text input
 */

const QUANTITY_PREFIX = /^(\d[\d/.]*)?\s*(a\s+|an\s+|some\s+|the\s+|few\s+|couple\s+of\s+)?(large\s+|small\s+|medium\s+)?(cloves?\s+of\s+|heads?\s+of\s+|bunches?\s+of\s+|cups?\s+of\s+|tablespoons?\s+of\s+|teaspoons?\s+of\s+|tbsp\s+of\s+|tsp\s+of\s+|pounds?\s+of\s+|lbs?\s+of\s+|ounces?\s+of\s+|oz\s+of\s+|pieces?\s+of\s+|cans?\s+of\s+|jars?\s+of\s+|bottles?\s+of\s+|bags?\s+of\s+|slices?\s+of\s+)?(a\s+|an\s+|some\s+)?/i;

/**
 * Parse ingredients from transcript/text input
 * @param {string} transcript - Text input to parse
 * @returns {Array<string>} Parsed ingredient names
 */
export function parseIngredients(transcript) {
    const parts = transcript.split(/\band\b|,/);
    const results = [];

    for (const part of parts) {
        const cleaned = part.replace(QUANTITY_PREFIX, '').trim();
        if (!cleaned) continue;
        const words = cleaned.split(/\s+/).filter(w => w.length > 1);
        if (words.length >= 3) {
            results.push(...words);
        } else {
            results.push(cleaned);
        }
    }

    return results.filter(r => r.length > 1);
}
