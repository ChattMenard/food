#!/usr/bin/env python3
"""
Merge validated Kaggle recipes with existing app recipes
"""

import json
from pathlib import Path

def main():
    existing_file = Path('../www/data/recipes_enhanced.json')
    kaggle_file = Path('clean_100k_validated_filtered.json')
    output_file = Path('../www/data/recipes_enhanced.json')
    
    print(f"Loading existing recipes from {existing_file}...")
    with open(existing_file) as f:
        existing_recipes = json.load(f)
    
    print(f"Loading Kaggle recipes from {kaggle_file}...")
    with open(kaggle_file) as f:
        kaggle_recipes = json.load(f)
    
    print(f"Existing recipes: {len(existing_recipes)}")
    print(f"Kaggle recipes (validated): {len(kaggle_recipes)}")
    
    # Reassign IDs to avoid conflicts
    existing_ids = {r['id'] for r in existing_recipes}
    next_id = max(existing_ids) + 1 if existing_ids else 1
    
    for recipe in kaggle_recipes:
        recipe['id'] = next_id
        next_id += 1
    
    # Merge
    merged_recipes = existing_recipes + kaggle_recipes
    
    print(f"\nMerged recipes: {len(merged_recipes)}")
    
    # Save merged recipes
    with open(output_file, 'w') as f:
        json.dump(merged_recipes, f, separators=(',', ':'))
    
    print(f"Saved to {output_file}")
    
    # Compress
    print("\nCompressing...")
    import gzip
    with gzip.open(output_file.with_suffix('.json.gz'), 'wb') as f:
        f.write(json.dumps(merged_recipes, separators=(',', ':')).encode('utf-8'))
    
    print(f"Compressed to {output_file.with_suffix('.json.gz')}")

if __name__ == '__main__':
    main()
