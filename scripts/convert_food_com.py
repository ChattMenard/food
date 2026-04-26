import csv
import json
import gzip
import re
from collections import Counter

# Load existing recipes
with open('www/data/recipes_enhanced_gzip.json.gz', 'rb') as f:
    existing_recipes = json.loads(gzip.decompress(f.read()))

print(f'Loaded {len(existing_recipes)} existing recipes')

# Parse CSV and convert to recipe schema
new_recipes = []
existing_names = {r['name'].lower() for r in existing_recipes}
skipped_count = 0

with open('www/data/food-com-recipes.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if len(new_recipes) >= 90000:  # Only need 90k more
            break
        
        name = row['Name']
        if not name:
            skipped_count += 1
            continue
        
        # Parse ingredients from RecipeIngredientParts (format: c("item1", "item2"))
        ingredients_str = row['RecipeIngredientParts']
        if not ingredients_str:
            skipped_count += 1
            continue
        
        # Parse the c("item1", "item2") format - more lenient parsing
        ingredients = []
        try:
            # Try to parse as R-style c() function
            ingredients_str = ingredients_str.replace('c(', '[').replace(')', ']')
            ingredients = eval(ingredients_str)
        except:
            # Fallback: try to split by comma and clean up
            try:
                ingredients = [i.strip().strip('"').strip("'") for i in ingredients_str.split(',')]
            except:
                skipped_count += 1
                continue
        
        if not ingredients or not isinstance(ingredients, list):
            skipped_count += 1
            continue
        
        # Parse instructions
        instructions_str = row['RecipeInstructions']
        try:
            steps = eval(instructions_str.replace('c(', '[').replace(')', ']'))
        except:
            steps = []
        
        # Parse time (format: PT24H45M or PT45M)
        total_time = row['TotalTime']
        minutes = 0
        if total_time:
            # Parse PT24H45M format
            h_match = re.search(r'(\d+)H', total_time)
            m_match = re.search(r'(\d+)M', total_time)
            if h_match:
                minutes += int(h_match.group(1)) * 60
            if m_match:
                minutes += int(m_match.group(1))
        
        # Parse rating
        try:
            rating = float(row['AggregatedRating']) if row['AggregatedRating'] else 0
        except:
            rating = 0
        
        # Parse review count
        try:
            review_count = int(row['ReviewCount']) if row['ReviewCount'] else 0
        except:
            review_count = 0
        
        # Parse servings
        try:
            servings = int(row['RecipeServings']) if row['RecipeServings'] else 4
        except:
            servings = 4
        
        # Parse nutrition
        nutrition = {}
        try:
            if row['Calories']:
                nutrition['calories'] = float(row['Calories'])
            if row['FatContent']:
                nutrition['fat'] = float(row['FatContent'])
            if row['CarbohydrateContent']:
                nutrition['carbs'] = float(row['CarbohydrateContent'])
            if row['ProteinContent']:
                nutrition['protein'] = float(row['ProteinContent'])
        except:
            pass
        
        # Parse image
        image_url = ''
        images_str = row['Images']
        if images_str:
            try:
                images = eval(images_str.replace('c(', '[').replace(')', ']'))
                if images and len(images) > 0:
                    image_url = images[0]
            except:
                pass
        
        # Parse category as cuisine
        cuisine = row['RecipeCategory'] or ''
        
        recipe = {
            'id': f'fc_{row["RecipeId"]}',
            'name': name,
            'description': row['Description'] or '',
            'minutes': minutes if minutes > 0 else 30,
            'ingredients': ingredients,
            'ingredients_clean': ingredients,
            'steps': steps,
            'rating': rating,
            'review_count': review_count,
            'nutrition': nutrition if nutrition else None,
            'dietary_flags': [],
            'tags': [],
            'cuisine': cuisine,
            'difficulty': '',
            'ingredient_vector': [],
            'servings': servings,
            'image_url': image_url
        }
        
        new_recipes.append(recipe)
        existing_names.add(name.lower())
        
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
