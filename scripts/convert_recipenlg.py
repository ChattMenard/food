import csv
import json
import gzip
import re

# Load existing recipes
with open('www/data/recipes_enhanced_gzip.json.gz', 'rb') as f:
    existing_recipes = json.loads(gzip.decompress(f.read()))

print(f'Loaded {len(existing_recipes)} existing recipes')

# Parse CSV and convert to recipe schema
new_recipes = []
existing_names = {r['name'].lower() for r in existing_recipes}

with open('www/data/RecipeNLG_dataset.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if len(new_recipes) >= 90000:  # Only need 90k more
            break
        
        title = row.get('title', '')
        if not title or title.lower() in existing_names:
            continue
        
        # Parse ingredients (format: JSON array string)
        ingredients_str = row.get('ingredients', '')
        if not ingredients_str:
            continue
        
        try:
            ingredients = eval(ingredients_str)
        except:
            continue
        
        if not ingredients or not isinstance(ingredients, list):
            continue
        
        # Parse directions (format: JSON array string)
        directions_str = row.get('directions', '')
        try:
            steps = eval(directions_str)
        except:
            steps = []
        
        # Parse NER ingredients (cleaner format)
        ner_str = row.get('NER', '')
        try:
            ner_ingredients = eval(ner_str)
            if ner_ingredients and isinstance(ner_ingredients, list):
                ingredients = ner_ingredients
        except:
            pass
        
        # Generate a simple ID
        recipe_id = f'rnlg_{i}'
        
        # Default values for missing fields
        minutes = 30  # Default cooking time
        rating = 0
        review_count = 0
        servings = 4
        image_url = ''
        nutrition = None
        
        recipe = {
            'id': recipe_id,
            'name': title,
            'description': '',
            'minutes': minutes,
            'ingredients': ingredients,
            'ingredients_clean': ingredients,
            'steps': steps,
            'rating': rating,
            'review_count': review_count,
            'nutrition': nutrition,
            'dietary_flags': [],
            'tags': [],
            'cuisine': '',
            'difficulty': '',
            'ingredient_vector': [],
            'servings': servings,
            'image_url': image_url
        }
        
        new_recipes.append(recipe)
        existing_names.add(title.lower())
        
        if (i + 1) % 10000 == 0:
            print(f'Processed {i + 1} rows, added {len(new_recipes)} recipes')

print(f'Converted {len(new_recipes)} new recipes')

# Combine recipes
all_recipes = existing_recipes + new_recipes
print(f'Total recipes after merge: {len(all_recipes)}')

# Save as JSON
with open('www/data/recipes_combined.json', 'w', encoding='utf-8') as f:
    json.dump(all_recipes, f, ensure_ascii=False)

print('Saved to recipes_combined.json')

# Compress
with open('www/data/recipes_combined.json', 'rb') as f:
    with gzip.open('www/data/recipes_enhanced_gzip.json.gz', 'wb') as gz:
        gz.write(f.read())

print('Compressed to recipes_enhanced_gzip.json.gz')
