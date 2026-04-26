#!/usr/bin/env python3
"""
Validate and fix recipe data quality issues
- Check if title ingredients are in the ingredients list
- Ensure recipes have proper instructions
- Remove completely broken recipes
"""

import json
import re
from pathlib import Path

# Common food items that should be in ingredients if in title
FOOD_KEYWORDS = {
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'duck', 'fish', 'salmon', 'tuna', 'shrimp', 'crab',
    'pasta', 'spaghetti', 'linguine', 'fettuccine', 'penne', 'macaroni', 'noodles',
    'rice', 'quinoa', 'couscous', 'barley',
    'potato', 'potatoes', 'sweet potato',
    'tomato', 'tomatoes', 'onion', 'onions', 'garlic', 'ginger',
    'carrot', 'carrots', 'celery', 'broccoli', 'cauliflower', 'spinach', 'kale', 'lettuce',
    'mushroom', 'mushrooms', 'pepper', 'peppers', 'zucchini', 'squash', 'eggplant',
    'cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'goat cheese', 'cream cheese',
    'milk', 'cream', 'butter', 'yogurt', 'sour cream',
    'egg', 'eggs',
    'bread', 'baguette', 'bun', 'roll', 'tortilla', 'pita',
    'peanut butter', 'almond butter', 'nutella',
    'jam', 'jelly', 'marmalade', 'preserves',
    'chocolate', 'cocoa', 'vanilla',
    'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'lemon', 'lemons', 'lime', 'limes',
    'strawberry', 'strawberries', 'blueberry', 'blueberries', 'raspberry', 'raspberries',
    'bacon', 'sausage', 'ham', 'pepperoni',
    'bean', 'beans', 'chickpea', 'chickpeas', 'lentil', 'lentils',
    'corn', 'peas', 'green beans',
    'avocado', 'guacamole', 'salsa',
    'tofu', 'tempeh', 'seitan',
    'wine', 'beer', 'vodka', 'rum', 'whiskey', 'bourbon',
    'honey', 'maple syrup', 'agave',
    'nuts', 'almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans', 'cashew', 'cashews',
    'coconut', 'pineapple', 'mango',
    'soup', 'stew', 'chili', 'curry', 'sauce', 'gravy',
    'oil', 'olive oil', 'vegetable oil', 'coconut oil',
    'vinegar', 'balsamic', 'soy sauce', 'worcestershire',
    'flour', 'sugar', 'brown sugar', 'powdered sugar',
    'baking powder', 'baking soda', 'yeast',
    'cinnamon', 'nutmeg', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'rosemary',
    'salt', 'pepper', 'chili powder', 'cayenne',
    'popcorn', 'chips', 'crackers',
    'hummus', 'tahini', 'pesto',
    'pickle', 'pickles', 'relish', 'mustard', 'ketchup', 'mayo', 'mayonnaise'
}

def extract_food_keywords_from_title(title):
    """Extract food keywords from recipe title"""
    title_lower = title.lower()
    
    # Remove possessives and common prefixes
    title_lower = re.sub(r"'s\s+", ' ', title_lower)
    title_lower = re.sub(r'\b(best|easy|quick|simple|homemade|perfect|delicious|amazing|ultimate)\b', '', title_lower)
    title_lower = re.sub(r'\b(fried|baked|grilled|roasted|sauteed|steamed|boiled|poached)\b', '', title_lower)
    title_lower = re.sub(r'\b(with|and|or|in|on)\b', ' ', title_lower)
    
    # Exclude recipe types that are the END PRODUCT (you're making them, not using them as ingredients)
    EXCLUDE_KEYWORDS = {
        'bread', 'cake', 'pie', 'cookies', 'muffins', 'brownies', 'bars',
        'soup', 'stew', 'chili', 'sauce', 'gravy', 'dip', 'spread',
        'salad', 'slaw', 'casserole', 'lasagna', 'pizza',
        'smoothie', 'shake', 'cocktail', 'drink',
        'burger', 'sandwich', 'wrap', 'taco', 'burrito'
    }
    
    found_keywords = []
    for keyword in FOOD_KEYWORDS:
        if keyword in EXCLUDE_KEYWORDS:
            continue
        # Check for whole word matches
        pattern = r'\b' + re.escape(keyword) + r'\b'
        if re.search(pattern, title_lower):
            found_keywords.append(keyword)
    
    return found_keywords

def check_ingredients_match_title(recipe):
    """Check if title keywords are in ingredients"""
    title_keywords = extract_food_keywords_from_title(recipe['name'])
    if not title_keywords:
        return True, []  # No specific food keywords in title
    
    ingredients_str = ' '.join(recipe.get('ingredients', [])).lower()
    
    missing = []
    for keyword in title_keywords:
        # Check if keyword or close variant is in ingredients
        if keyword not in ingredients_str:
            # Check for close variants (e.g., "chicken" matches "chicken breast")
            keyword_words = keyword.split()
            if not any(word in ingredients_str for word in keyword_words):
                missing.append(keyword)
    
    return len(missing) == 0, missing

def validate_recipe(recipe):
    """Check if recipe is valid"""
    # Must have name
    if not recipe.get('name'):
        return False, "No name"
    
    # Must have ingredients
    if not recipe.get('ingredients') or len(recipe['ingredients']) == 0:
        return False, "No ingredients"
    
    # Must have steps/instructions
    if not recipe.get('steps') or len(recipe['steps']) == 0:
        return False, "No instructions"
    
    # Check if title ingredients match
    matches, missing = check_ingredients_match_title(recipe)
    if not matches:
        return False, f"Missing ingredients from title: {', '.join(missing)}"
    
    return True, "OK"

def main():
    input_file = Path('www/data/recipes_enhanced.json')
    output_file = Path('www/data/recipes_enhanced_validated.json')
    rejected_file = Path('www/data/recipes_rejected.json')
    
    print(f"Loading recipes from {input_file}...")
    with open(input_file) as f:
        recipes = json.load(f)
    
    print(f"Total recipes: {len(recipes)}")
    
    valid_recipes = []
    rejected_recipes = []
    
    for recipe in recipes:
        is_valid, reason = validate_recipe(recipe)
        if is_valid:
            valid_recipes.append(recipe)
        else:
            rejected_recipes.append({
                'name': recipe['name'],
                'reason': reason,
                'ingredients': recipe.get('ingredients', []),
                'steps': recipe.get('steps', [])
            })
    
    print(f"\nValid recipes: {len(valid_recipes)}")
    print(f"Rejected recipes: {len(rejected_recipes)}")
    
    # Save valid recipes
    with open(output_file, 'w') as f:
        json.dump(valid_recipes, f, separators=(',', ':'))
    
    # Save rejected recipes for review
    with open(rejected_file, 'w') as f:
        json.dump(rejected_recipes, f, indent=2)
    
    print(f"\nSaved valid recipes to {output_file}")
    print(f"Saved rejected recipes to {rejected_file}")
    
    # Show some examples
    print("\nExamples of rejected recipes:")
    for recipe in rejected_recipes[:10]:
        print(f"  - {recipe['name']}: {recipe['reason']}")

if __name__ == '__main__':
    main()
