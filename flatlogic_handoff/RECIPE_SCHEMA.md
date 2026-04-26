# Recipe Data Schema for Flatlogic

## Required Fields

Each recipe must have the following fields:

```json
{
  "id": 1,                          // Integer, unique identifier
  "name": "Recipe Title",           // String, max 100 chars
  "ingredients": [                  // Array of strings, required
    "ingredient 1",
    "ingredient 2"
  ],
  "steps": [                        // Array of strings, required
    "Step 1 instruction",
    "Step 2 instruction"
  ],
  "minutes": 30,                    // Integer, prep time in minutes
  "tags": ["dinner", "chicken"],    // Array of strings
  "rating": 4.5,                    // Number 0-5, optional but preferred
  "servings": 4,                    // Integer, optional
  "difficulty": "easy",             // String: easy/medium/hard, optional
  "image": "https://...",           // String URL, optional
  "nutrition": {                    // Object, optional
    "calories": 350,
    "protein": 25,
    "carbs": 40,
    "fat": 12
  },
  "dietary": {                      // Object, all boolean, optional
    "vegan": false,
    "vegetarian": false,
    "glutenFree": false,
    "dairyFree": false,
    "keto": false
  }
}
```

## Data Quality Requirements

### 1. Title-Ingredient Matching (CRITICAL)
- If a recipe title contains a food item, that item MUST be in the ingredients list
- Examples:
  - ✅ "Butternut Squash Soup" must have "butternut squash" in ingredients
  - ❌ "Chicken Alfredo" missing "chicken" or "alfredo" is invalid
  - ❌ "Peanut Butter Cookies" missing "peanut butter" is invalid

### 2. Ingredient Completeness
- Each ingredient should be a specific food item
- Avoid generic terms like "spices" or "seasoning to taste"
- Include common pantry items (salt, pepper, oil) if used

### 3. Instructions Quality
- Each step must be a complete sentence
- Steps should be in logical cooking order
- Include temperatures, times, and visual cues ("golden brown")

### 4. Categorization
Include relevant tags from these categories:
- **Meal type**: breakfast, lunch, dinner, snack, dessert
- **Protein**: chicken, beef, pork, fish, seafood, tofu, eggs, beans
- **Cuisine**: italian, mexican, asian, indian, mediterranean, american
- **Method**: baked, grilled, fried, slow-cooked, no-cook
- **Dietary**: vegan, vegetarian, gluten-free, dairy-free, keto, low-carb

## Size Constraints

### For Mobile App Performance:
- **Maximum recipes**: 25,000 (to prevent memory issues)
- **Maximum file size**: 8MB compressed (gzip)
- **Target**: 15,000-20,000 high-quality recipes

### Recipe Distribution:
- 30% Quick meals (under 30 min)
- 25% Standard dinners (30-60 min)
- 20% Breakfast/brunch
- 15% Healthy/light options
- 10% Desserts/treats

## Data Sources to Use

Preferred sources (in order):
1. **Food.com / Genius Kitchen** - Well-structured, community rated
2. **AllRecipes** - Popular, tested recipes
3. **BBC Good Food** - Reliable, well-written
4. **NYT Cooking** - High quality
5. **Budget Bytes** - Simple, affordable

Avoid:
- Aggregator sites with stolen content
- Recipes without ratings/reviews
- AI-generated recipes without human testing

## File Format

Deliver as:
1. `recipes_flatlogic.json.gz` - Gzipped JSON array
2. `recipes_sample.json` - First 100 recipes uncompressed (for review)
3. `validation_report.txt` - Summary of data quality checks

## Validation Script

Use the provided `validate_recipes.py` script to check:
- Title-ingredient matching
- Complete data fields
- No duplicates
- Valid time ranges
- Proper categorization

Run: `python3 validate_recipes.py recipes_flatlogic.json`

## Examples

### Good Recipe:
```json
{
  "id": 1,
  "name": "Creamy Garlic Butter Chicken",
  "ingredients": [
    "chicken breasts",
    "butter",
    "garlic cloves",
    "heavy cream",
    "parmesan cheese",
    "spinach",
    "salt",
    "black pepper"
  ],
  "steps": [
    "Season chicken with salt and pepper.",
    "Melt butter in skillet over medium heat.",
    "Cook chicken 6-7 minutes per side until golden.",
    "Add minced garlic, cook 1 minute.",
    "Pour in cream and parmesan, simmer 3 minutes.",
    "Stir in spinach until wilted.",
    "Serve immediately."
  ],
  "minutes": 25,
  "tags": ["dinner", "chicken", "quick", "creamy"],
  "rating": 4.7,
  "servings": 4,
  "difficulty": "easy",
  "dietary": {
    "glutenFree": true,
    "keto": true
  }
}
```

### Bad Recipe (Don't Do This):
```json
{
  "name": "Peanut Butter & Jelly Sandwich",  // Missing peanut butter!
  "ingredients": ["bread", "jelly"],  // ❌ Missing peanut butter
  "steps": ["Make sandwich"],  // ❌ Too vague
  "minutes": 5
}
```

## Questions?

Contact: [Your contact info]
App: Main Recipe & Meal Planning App
Platform: Android/iOS/Web
