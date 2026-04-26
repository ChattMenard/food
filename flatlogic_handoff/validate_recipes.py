#!/usr/bin/env python3
"""
Recipe Validation Script for Flatlogic
Run this on your recipe dataset before delivery
"""

import json
import gzip
import re
from pathlib import Path

# Keywords that should appear in ingredients if in title
FOOD_KEYWORDS = {
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp',
    'pasta', 'spaghetti', 'rice', 'quinoa', 'potato', 'potatoes', 'sweet potato',
    'tomato', 'tomatoes', 'onion', 'onions', 'garlic', 'carrot', 'carrots',
    'broccoli', 'spinach', 'mushroom', 'mushrooms', 'pepper', 'peppers',
    'zucchini', 'squash', 'butternut squash', 'eggplant', 'cheese', 'cheddar',
    'mozzarella', 'parmesan', 'milk', 'butter', 'cream', 'egg', 'eggs',
    'bread', 'tortilla', 'pita', 'peanut butter', 'jam', 'jelly', 'chocolate',
    'apple', 'apples', 'banana', 'bananas', 'orange', 'lemon', 'lime',
    'strawberry', 'blueberry', 'bacon', 'sausage', 'ham', 'bean', 'beans',
    'chickpea', 'chickpeas', 'lentil', 'lentils', 'corn', 'peas', 'avocado',
    'tofu', 'nuts', 'almond', 'almonds', 'walnut', 'walnuts', 'coconut',
    'pineapple', 'mango', 'oil', 'olive oil', 'vinegar', 'soy sauce',
    'flour', 'sugar', 'honey', 'maple syrup', 'salt', 'pepper'
}

# Recipe types to exclude from matching (the end product, not an ingredient)
EXCLUDE_RECIPE_TYPES = {
    'bread', 'cake', 'pie', 'cookies', 'muffins', 'brownies', 'bars',
    'soup', 'stew', 'chili', 'sauce', 'gravy', 'dip', 'spread',
    'salad', 'slaw', 'casserole', 'lasagna', 'pizza', 'smoothie',
    'shake', 'cocktail', 'drink', 'burger', 'sandwich', 'wrap', 'taco', 'burrito'
}

def extract_food_keywords_from_title(title):
    """Extract food keywords that should be in ingredients"""
    title_lower = title.lower()
    
    # Clean title
    title_lower = re.sub(r"'s\s+", ' ', title_lower)
    title_lower = re.sub(r'\b(best|easy|quick|simple|homemade|perfect|delicious|amazing|ultimate|fried|baked|grilled|roasted|sauteed|steamed|boiled|poached)\b', '', title_lower)
    title_lower = re.sub(r'\b(with|and|or|in|on)\b', ' ', title_lower)
    
    found_keywords = []
    for keyword in FOOD_KEYWORDS:
        if keyword in EXCLUDE_RECIPE_TYPES:
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
        if keyword not in ingredients_str:
            missing.append(keyword)
    
    return len(missing) == 0, missing

def validate_recipe(recipe, idx):
    """Validate a single recipe"""
    errors = []
    
    # Required fields
    if not recipe.get('name'):
        errors.append("Missing name")
    
    if not recipe.get('ingredients') or len(recipe['ingredients']) == 0:
        errors.append("No ingredients")
    elif len(recipe['ingredients']) < 2:
        errors.append("Too few ingredients (minimum 2)")
    
    if not recipe.get('steps') or len(recipe['steps']) == 0:
        errors.append("No instructions")
    elif len(recipe['steps']) < 2:
        errors.append("Too few steps (minimum 2)")
    
    # Check time
    minutes = recipe.get('minutes')
    if minutes is None:
        errors.append("Missing time")
    elif minutes < 1 or minutes > 1440:  # More than 24 hours
        errors.append(f"Invalid time: {minutes} minutes")
    
    # Check title-ingredient match
    matches, missing = check_ingredients_match_title(recipe)
    if not matches:
        errors.append(f"Title ingredients missing: {', '.join(missing)}")
    
    return errors

def load_recipes(filepath):
    """Load recipes from JSON or gzipped JSON"""
    path = Path(filepath)
    
    if path.suffix == '.gz':
        with gzip.open(path, 'rt') as f:
            return json.load(f)
    else:
        with open(path) as f:
            return json.load(f)

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python3 validate_recipes.py <recipes.json|recipes.json.gz>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    print(f"Loading recipes from {filepath}...")
    
    try:
        recipes = load_recipes(filepath)
    except Exception as e:
        print(f"Error loading file: {e}")
        sys.exit(1)
    
    print(f"\nTotal recipes: {len(recipes)}")
    print("\nValidating...")
    
    valid_count = 0
    invalid_count = 0
    errors_by_type = {}
    sample_errors = []
    
    for i, recipe in enumerate(recipes):
        if i % 1000 == 0:
            print(f"  Processed {i}/{len(recipes)}...")
        
        errors = validate_recipe(recipe, i)
        
        if errors:
            invalid_count += 1
            for error in errors:
                errors_by_type[error] = errors_by_type.get(error, 0) + 1
            
            if len(sample_errors) < 5:
                sample_errors.append({
                    'name': recipe.get('name', 'Unknown'),
                    'errors': errors
                })
        else:
            valid_count += 1
    
    # Report
    print(f"\n{'='*60}")
    print("VALIDATION RESULTS")
    print(f"{'='*60}")
    print(f"Total recipes: {len(recipes)}")
    print(f"Valid recipes: {valid_count} ({valid_count/len(recipes)*100:.1f}%)")
    print(f"Invalid recipes: {invalid_count} ({invalid_count/len(recipes)*100:.1f}%)")
    
    print(f"\nError breakdown:")
    for error, count in sorted(errors_by_type.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {error}: {count} recipes")
    
    if sample_errors:
        print(f"\nSample errors:")
        for item in sample_errors:
            print(f"  - {item['name']}: {', '.join(item['errors'])}")
    
    # Quality score
    quality_score = valid_count / len(recipes) * 100
    print(f"\nQuality Score: {quality_score:.1f}%")
    
    if quality_score >= 95:
        print("✅ EXCELLENT - Ready for delivery")
    elif quality_score >= 85:
        print("⚠️  GOOD - Minor issues, acceptable for delivery")
    elif quality_score >= 70:
        print("❌ NEEDS WORK - Fix major issues before delivery")
    else:
        print("❌ REJECT - Significant data quality issues")
    
    return quality_score

if __name__ == '__main__':
    score = main()
    sys.exit(0 if score >= 85 else 1)
