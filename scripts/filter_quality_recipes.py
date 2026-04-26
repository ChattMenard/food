#!/usr/bin/env python3
"""
Filter out low-quality recipes from the dataset
- Recipes with < 3 ingredients
- Recipes where title ingredient is missing from ingredients list
- Recipes with no steps/instructions
"""

import json
import re
from pathlib import Path

def extract_main_ingredient(title):
    """Extract potential main ingredient from title"""
    # Common patterns: "Bev's Sauteed Yellow Squash" -> "yellow squash"
    # "Fried Peanut Butter" -> "peanut butter"
    title_lower = title.lower()
    
    # Remove possessives and common prefixes
    title_lower = re.sub(r"'s\s+", ' ', title_lower)
    title_lower = re.sub(r'^(bev|mom|grandma|aunt|uncle|dad)s?\s+', '', title_lower)
    title_lower = re.sub(r'^(best|easy|quick|simple|homemade|perfect)\s+', '', title_lower)
    title_lower = re.sub(r'^(fried|baked|grilled|roasted|sauteed|steamed)\s+', '', title_lower)
    
    return title_lower.strip()

def is_quality_recipe(recipe):
    """Check if recipe meets quality standards"""
    # Must have at least 3 ingredients
    if len(recipe.get('ingredients', [])) < 3:
        return False
    
    # Must have steps/instructions
    if not recipe.get('steps') or len(recipe.get('steps', [])) == 0:
        return False
    
    # Check if main ingredient from title is in ingredients
    title = recipe.get('name', '')
    ingredients_str = ' '.join(recipe.get('ingredients', [])).lower()
    
    # Extract potential main ingredient from title
    main_ing = extract_main_ingredient(title)
    
    # Skip if title suggests a specific ingredient that's not in the list
    # e.g., "Yellow Squash" should be in ingredients
    key_ingredients = ['squash', 'chicken', 'beef', 'pork', 'fish', 'salmon', 
                      'shrimp', 'pasta', 'rice', 'potato', 'carrot', 'broccoli',
                      'spinach', 'tomato', 'cheese', 'egg', 'mushroom', 'pepper',
                      'zucchini', 'eggplant', 'cauliflower', 'asparagus']
    
    for key_ing in key_ingredients:
        if key_ing in main_ing and key_ing not in ingredients_str:
            # Main ingredient from title is missing
            return False
    
    return True

def main():
    input_file = Path('www/data/recipes_enhanced.json')
    output_file = Path('www/data/recipes_enhanced_filtered.json')
    
    print(f"Loading recipes from {input_file}...")
    with open(input_file) as f:
        recipes = json.load(f)
    
    print(f"Total recipes: {len(recipes)}")
    
    # Filter recipes
    quality_recipes = [r for r in recipes if is_quality_recipe(r)]
    
    print(f"Quality recipes: {len(quality_recipes)}")
    print(f"Filtered out: {len(recipes) - len(quality_recipes)}")
    
    # Save filtered recipes
    with open(output_file, 'w') as f:
        json.dump(quality_recipes, f, separators=(',', ':'))
    
    print(f"Saved to {output_file}")
    
    # Show some examples of filtered recipes
    print("\nExamples of filtered recipes:")
    filtered = [r for r in recipes if not is_quality_recipe(r)]
    for recipe in filtered[:5]:
        print(f"  - {recipe['name']}: {len(recipe.get('ingredients', []))} ingredients")
        print(f"    Ingredients: {recipe.get('ingredients', [])}")

if __name__ == '__main__':
    main()
