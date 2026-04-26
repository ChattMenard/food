#!/usr/bin/env python3
"""
main PRO Dataset Builder

Builds enhanced recipe files from a Food.com parquet source with:
- enriched nutrition objects
- precomputed dietary/allergen flags
- ingredient similarity vectors
- compressed output + search and nutrition indexes

Run:
  python3 scripts/build_dataset.py
"""

import argparse
import gzip
import json
import re
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

NUTRITION_LOOKUP = {
    "chicken breast": {"calories": 165, "protein": 31, "fat": 3.6, "carbs": 0, "fiber": 0},
    "olive oil": {"calories": 119, "protein": 0, "fat": 13.5, "carbs": 0, "fiber": 0},
    "egg": {"calories": 72, "protein": 6.3, "fat": 4.8, "carbs": 0.4, "fiber": 0},
    "rice": {"calories": 205, "protein": 4.3, "fat": 0.4, "carbs": 45, "fiber": 0.6},
    "potato": {"calories": 161, "protein": 4.3, "fat": 0.2, "carbs": 37, "fiber": 3.8},
    "onion": {"calories": 44, "protein": 1.2, "fat": 0.1, "carbs": 10.3, "fiber": 1.9},
    "garlic": {"calories": 4, "protein": 0.2, "fat": 0, "carbs": 1, "fiber": 0.1},
    "milk": {"calories": 149, "protein": 7.7, "fat": 8, "carbs": 12, "fiber": 0},
    "butter": {"calories": 102, "protein": 0.1, "fat": 11.5, "carbs": 0, "fiber": 0},
    "flour": {"calories": 455, "protein": 13, "fat": 1.2, "carbs": 95, "fiber": 3.4},
    "sugar": {"calories": 774, "protein": 0, "fat": 0, "carbs": 200, "fiber": 0},
    "tomato": {"calories": 22, "protein": 1.1, "fat": 0.2, "carbs": 4.8, "fiber": 1.5},
    "cheese": {"calories": 113, "protein": 7, "fat": 9.3, "carbs": 0.4, "fiber": 0},
    "beans": {"calories": 227, "protein": 15, "fat": 1, "carbs": 41, "fiber": 15},
}

DIETARY_FLAGS = {
    "vegetarian": ["meat", "chicken", "beef", "pork", "fish", "seafood", "gelatin"],
    "vegan": [
        "meat",
        "chicken",
        "beef",
        "pork",
        "fish",
        "seafood",
        "egg",
        "milk",
        "cheese",
        "butter",
        "honey",
        "gelatin",
    ],
    "gluten_free": ["wheat", "barley", "rye", "flour", "pasta", "bread", "soy sauce"],
    "dairy_free": ["milk", "cheese", "butter", "yogurt", "cream", "whey"],
    "nut_free": ["almond", "walnut", "pecan", "cashew", "peanut", "hazelnut", "pine nut"],
    "keto": ["sugar", "honey", "maple", "rice", "pasta", "bread", "potato"],
    "paleo": ["grain", "legume", "dairy", "processed", "sugar"],
    "low_fodmap": ["onion", "garlic", "wheat", "beans", "milk", "apple", "pear"],
}

ALLERGEN_MAP = {
    "milk": "dairy",
    "egg": "eggs",
    "peanut": "peanuts",
    "tree nuts": "nuts",
    "fish": "fish",
    "shellfish": "shellfish",
    "wheat": "gluten",
    "soy": "soy",
    "sesame": "sesame",
}

ISO_DUR = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")


def iso_to_minutes(value):
    if not isinstance(value, str):
        return None
    match = ISO_DUR.fullmatch(value)
    if not match:
        return None
    hours, minutes, seconds = (int(part) if part else 0 for part in match.groups())
    return hours * 60 + minutes + (1 if seconds and not (hours or minutes) else 0)


def ensure_list(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple, np.ndarray, pd.Series)):
        return [str(v) for v in value if str(v).strip()]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        if text.startswith("[") and text.endswith("]"):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    return [str(v) for v in parsed if str(v).strip()]
            except json.JSONDecodeError:
                pass
        return [part.strip() for part in text.split(",") if part.strip()]
    return []


def safe_number(value, default=0):
    try:
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


TITLE_INGREDIENT_KEYWORDS = {
    "chicken", "beef", "pork", "salmon", "shrimp", "turkey", "lamb",
    "butternut squash", "acorn squash", "spaghetti squash",
    "peanut butter", "almond butter", "apple butter",
    "chocolate", "banana", "blueberry", "strawberry", "raspberry",
    "avocado", "mango", "pineapple", "coconut", "lemon", "lime",
}


def check_title_ingredients(recipe):
    """Flag recipes where the title mentions a key ingredient not found in the ingredients list."""
    title = recipe.get("name", "").lower()
    ingredients_str = " ".join(recipe.get("ingredients_clean", recipe.get("ingredients", []))).lower()

    for keyword in TITLE_INGREDIENT_KEYWORDS:
        if keyword in title and keyword not in ingredients_str:
            return False, keyword
    return True, None


def validate_dataset(recipes, strict=False):
    """Basic validation of built recipe dataset."""
    assert len(recipes) > 0, "Dataset is empty"
    required_keys = {"id", "name", "ingredients", "minutes"}
    mismatch_count = 0
    for i, recipe in enumerate(recipes[:100]):
        missing = required_keys - set(recipe.keys())
        if missing:
            msg = f"Recipe {i} missing keys: {missing}"
            if strict:
                raise ValueError(msg)
            print(f"  WARNING: {msg}")

    for recipe in recipes:
        ok, keyword = check_title_ingredients(recipe)
        if not ok:
            mismatch_count += 1

    if mismatch_count:
        print(f"  WARNING: {mismatch_count:,} recipes have title-ingredient mismatches")
    print(f"  Validation passed: {len(recipes):,} recipes")


class MainDataBuilder:
    def __init__(self, input_parquet=None):
        self.input_parquet = self.resolve_input_path(input_parquet)
        self.df = pd.read_parquet(self.input_parquet)

    def resolve_input_path(self, explicit_path):
        if explicit_path:
            candidate = Path(explicit_path)
            if candidate.exists():
                return candidate
            raise FileNotFoundError(f"Input parquet not found: {candidate}")

        project_root = Path(__file__).resolve().parent.parent
        candidates = [
            project_root / "data" / "recipes.parquet",
            Path("/home/x99/.cache/kagglehub/datasets/irkaal/foodcom-recipes-and-reviews/versions/2/recipes.parquet"),
        ]
        for candidate in candidates:
            if candidate.exists():
                return candidate

        raise FileNotFoundError(
            "No parquet input found. Expected one of: data/recipes.parquet or local kaggle cache path."
        )

    def clean_ingredient(self, text):
        text = str(text).lower().strip()
        text = re.sub(r"^\d+[\d\/\.\s]*(cup|tbsp|tsp|oz|lb|g|kg|ml|l)?\s*", "", text)
        text = re.sub(r"\b(fresh|frozen|canned|dried|minced|chopped|diced|sliced|grated)\b", "", text)
        text = re.sub(r"\([^)]*\)", "", text)
        return re.sub(r"\s+", " ", text).strip()

    def detect_meal_type(self, text):
        breakfast_keywords = ["egg", "pancake", "waffle", "cereal", "oatmeal", "smoothie", "toast", "bacon"]
        lunch_keywords = ["sandwich", "salad", "wrap", "soup", "burger", "taco"]
        dinner_keywords = ["roast", "steak", "casserole", "stew", "curry", "pasta", "lasagna"]
        dessert_keywords = ["cake", "cookie", "pie", "ice cream", "pudding", "brownie"]

        if any(keyword in text for keyword in breakfast_keywords):
            return "breakfast"
        if any(keyword in text for keyword in dessert_keywords):
            return "dessert"
        if any(keyword in text for keyword in dinner_keywords):
            return "dinner"
        if any(keyword in text for keyword in lunch_keywords):
            return "lunch"
        return "any"

    def compute_dietary_flags(self, ingredients_text):
        text = " ".join(ingredients_text).lower()
        flags = {}

        for diet, forbidden in DIETARY_FLAGS.items():
            flags[diet] = not any(word in text for word in forbidden)

        allergens = []
        for allergen, category in ALLERGEN_MAP.items():
            if allergen in text:
                allergens.append(category)
        flags["allergens"] = sorted(list(set(allergens)))
        flags["complexity"] = round(min(5, len(ingredients_text) / 3), 1)
        flags["meal_type"] = self.detect_meal_type(text)
        return flags

    def calculate_ingredient_similarity_vector(self, ingredients):
        vector = defaultdict(float)
        for ingredient in ingredients:
            cleaned = self.clean_ingredient(ingredient)
            words = cleaned.split()
            if not words:
                continue
            for word in words:
                if len(word) > 2:
                    vector[word] += 1.0 / len(words)
        return dict(vector)

    def pick(self, row, keys, default=None):
        for key in keys:
            if key in row and row[key] is not None:
                value = row[key]
                if not (isinstance(value, float) and np.isnan(value)):
                    return value
        return default

    def extract_base_nutrition(self, row):
        nutrition = {
            "calories": safe_number(self.pick(row, ["calories", "Calories"], 0)),
            "fat": safe_number(self.pick(row, ["fat", "FatContent"], 0)),
            "protein": safe_number(self.pick(row, ["protein", "ProteinContent"], 0)),
            "carbs": safe_number(self.pick(row, ["carbohydrates", "carbs", "CarbohydrateContent"], 0)),
            "fiber": safe_number(self.pick(row, ["fiber", "FiberContent"], 0)),
            "sugar": safe_number(self.pick(row, ["sugar", "SugarContent"], 0)),
            "sodium": safe_number(self.pick(row, ["sodium", "SodiumContent"], 0)),
            "cholesterol": safe_number(self.pick(row, ["cholesterol", "CholesterolContent"], 0)),
            "sat_fat": safe_number(self.pick(row, ["saturated_fat", "SaturatedFatContent"], 0)),
            "trans_fat": safe_number(self.pick(row, ["trans_fat"], 0)),
        }

        nutrition_arr = self.pick(row, ["Nutrition"], None)
        if nutrition_arr is not None and sum(nutrition.values()) == 0:
            vals = ensure_list(nutrition_arr)
            parsed = []
            for value in vals:
                try:
                    parsed.append(float(value))
                except ValueError:
                    continue
            if len(parsed) >= 7:
                nutrition["calories"] = parsed[0]
                nutrition["fat"] = parsed[1]
                nutrition["sugar"] = parsed[2]
                nutrition["sodium"] = parsed[3]
                nutrition["protein"] = parsed[4]
                nutrition["sat_fat"] = parsed[5]
                nutrition["carbs"] = parsed[6]

        return nutrition

    def extract_nutrition(self, row, ingredients):
        nutrition = self.extract_base_nutrition(row)
        if nutrition["calories"] > 0:
            return nutrition

        for ingredient in ingredients:
            cleaned = self.clean_ingredient(ingredient)
            for key, values in NUTRITION_LOOKUP.items():
                if key in cleaned:
                    for nutrient, value in values.items():
                        nutrition[nutrient] += value * 0.5
                    break

        return nutrition

    def detect_cuisine(self, tags, recipe_name=""):
        cuisine_keywords = {
            "italian": ["italian", "pasta", "pizza"],
            "mexican": ["mexican", "taco", "burrito"],
            "asian": ["asian", "chinese", "japanese", "thai", "vietnamese", "korean"],
            "indian": ["indian", "curry"],
            "mediterranean": ["mediterranean", "greek", "lebanese"],
            "american": ["american", "burger", "bbq"],
        }

        tags_lower = [str(tag).lower() for tag in tags]
        search = " ".join(tags_lower + [recipe_name.lower()])
        for cuisine, keywords in cuisine_keywords.items():
            if any(keyword in search for keyword in keywords):
                return cuisine
        return "fusion"

    def calculate_difficulty(self, ingredients_count, minutes, steps_count):
        score = 1
        if ingredients_count > 10:
            score += 1
        if ingredients_count > 15:
            score += 1
        if minutes > 60:
            score += 1
        if steps_count > 8:
            score += 1
        return min(5, score)

    def build_search_index(self, recipes):
        index = defaultdict(set)

        for recipe in recipes:
            recipe_id = recipe["id"]
            for word in recipe["name"].lower().split():
                index[word].add(recipe_id)

            for ingredient in recipe["ingredients_clean"]:
                for word in ingredient.split():
                    index[word].add(recipe_id)

            for tag in recipe["tags"]:
                index[str(tag).lower()].add(recipe_id)

        return {key: sorted(list(value)) for key, value in index.items()}

    def get_ingredients(self, row):
        return ensure_list(self.pick(row, ["ingredients", "RecipeIngredientParts"], []))

    def get_steps(self, row):
        return ensure_list(self.pick(row, ["steps", "RecipeInstructions"], []))

    def get_tags(self, row):
        return ensure_list(self.pick(row, ["tags", "Keywords"], []))

    def get_minutes(self, row):
        raw = self.pick(row, ["minutes", "Minutes"], None)
        if raw is not None:
            minutes = int(safe_number(raw, 0))
            if minutes > 0:
                return minutes

        total_time = self.pick(row, ["TotalTime"], None)
        parsed = iso_to_minutes(total_time)
        if parsed:
            return parsed
        return 0

    def build_enhanced_dataset(self, output_dir="www/data", min_rating=4.0, max_recipes=10000, min_reviews=5):
        print(f"Processing {len(self.df):,} recipes from {self.input_parquet}")

        candidates = []
        for idx, (_, raw_row) in enumerate(self.df.iterrows()):
            row = raw_row.to_dict()
            ingredients = self.get_ingredients(row)
            if not (2 <= len(ingredients) <= 25):
                continue

            minutes = self.get_minutes(row)
            if not (5 <= minutes <= 240):
                continue

            rating = safe_number(self.pick(row, ["rating", "AggregatedRating"], 0))
            review_count = int(safe_number(self.pick(row, ["review_count", "ReviewCount", "reviews"], 0), 0))
            if rating < min_rating or review_count < min_reviews:
                continue

            score = float(rating * np.log1p(review_count))
            candidates.append((score, idx, row, ingredients, minutes, rating, review_count))

        candidates.sort(key=lambda item: item[0], reverse=True)
        selected = candidates[:max_recipes]

        print(f"Filtered to {len(selected):,} quality recipes")

        enhanced_recipes = []
        ingredient_vocab = defaultdict(int)

        for position, (_, idx, row, ingredients, minutes, rating, review_count) in enumerate(selected, start=1):
            cleaned_ingredients = [self.clean_ingredient(ing) for ing in ingredients if self.clean_ingredient(ing)]
            steps = self.get_steps(row)
            tags = self.get_tags(row)
            nutrition = self.extract_nutrition(row, cleaned_ingredients)

            for ingredient in cleaned_ingredients:
                ingredient_vocab[ingredient] += 1

            recipe_id = int(safe_number(self.pick(row, ["id", "RecipeId"], idx), idx))
            servings_raw = int(safe_number(self.pick(row, ["servings", "RecipeServings"], 4), 4))
            servings = servings_raw if servings_raw > 0 else 4

            recipe = {
                "id": recipe_id,
                "name": str(self.pick(row, ["name", "Name"], f"Recipe {recipe_id}")),
                "description": str(self.pick(row, ["description", "Description"], "") or ""),
                "minutes": int(minutes),
                "ingredients": ingredients,
                "ingredients_clean": cleaned_ingredients,
                "steps": steps,
                "rating": float(rating),
                "review_count": review_count,
                "nutrition": nutrition,
                "dietary_flags": self.compute_dietary_flags(cleaned_ingredients),
                "tags": tags,
                "cuisine": self.detect_cuisine(tags, str(self.pick(row, ["name", "Name"], ""))),
                "difficulty": self.calculate_difficulty(len(cleaned_ingredients), minutes, len(steps)),
                "ingredient_vector": self.calculate_ingredient_similarity_vector(cleaned_ingredients),
                "servings": servings,
                "image_url": f"https://img.food.com/img/recipes/{recipe_id}/large.jpg",
            }

            for key in recipe["nutrition"]:
                recipe["nutrition"][key] = round(recipe["nutrition"][key] / servings, 1)

            enhanced_recipes.append(recipe)

            if position % 1000 == 0:
                print(f"  processed {position:,} recipes")

        common_ingredients = {
            ingredient: count
            for ingredient, count in ingredient_vocab.items()
            if count >= 3 and len(ingredient) > 1
        }

        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)

        with gzip.open(output / "recipes_enhanced_gzip.json.gz", "wt", encoding="utf-8") as handle:
            json.dump(enhanced_recipes, handle, separators=(",", ":"))

        with (output / "recipes_enhanced.json").open("w", encoding="utf-8") as handle:
            json.dump(enhanced_recipes, handle)

        legacy_conflict_file = output / "recipes_enhanced.json.gz"
        if legacy_conflict_file.exists():
            legacy_conflict_file.unlink()

        with (output / "ingredients_enhanced.json").open("w", encoding="utf-8") as handle:
            json.dump(sorted(common_ingredients.keys()), handle)

        nutrition_index = {recipe["id"]: recipe["nutrition"] for recipe in enhanced_recipes}
        with (output / "nutrition_index.json").open("w", encoding="utf-8") as handle:
            json.dump(nutrition_index, handle)

        search_index = self.build_search_index(enhanced_recipes)
        with (output / "search_index.json").open("w", encoding="utf-8") as handle:
            json.dump(search_index, handle)

        # Mobile-friendly recipes.json: cap at 20K highest-rated recipes to
        # avoid crashing WebView on Android/iOS (full dataset is in the gzip).
        MOBILE_CAP = 20000
        top_recipes = sorted(enhanced_recipes, key=lambda r: (r["rating"], r["review_count"]), reverse=True)[:MOBILE_CAP]
        legacy_recipes = [
            {
                "id": recipe["id"],
                "name": recipe["name"],
                "ingredients": recipe["ingredients_clean"],
                "time": recipe["minutes"],
                "servings": recipe["servings"],
                "category": recipe["cuisine"],
                "rating": round(recipe["rating"], 1),
            }
            for recipe in top_recipes
        ]
        with (output / "recipes.json").open("w", encoding="utf-8") as handle:
            json.dump(legacy_recipes, handle)
        print(f"  recipes.json: {len(legacy_recipes):,} recipes (mobile-friendly subset)")

        with (output / "ingredients.json").open("w", encoding="utf-8") as handle:
            json.dump(sorted(common_ingredients.keys()), handle)

        print("Dataset build complete")
        print(f"  {output / 'recipes_enhanced_gzip.json.gz'}")
        print(f"  {output / 'recipes_enhanced.json'}")
        print(f"  {output / 'ingredients_enhanced.json'}")
        print(f"  {output / 'nutrition_index.json'}")
        print(f"  {output / 'search_index.json'}")
        
        # Validate the built dataset
        validate_dataset(enhanced_recipes, strict=True)
        
        return enhanced_recipes


def main():
    parser = argparse.ArgumentParser(description="Build main enhanced recipe dataset")
    parser.add_argument("--input", default=None, help="Path to input parquet file")
    parser.add_argument("--output-dir", default="www/data", help="Output folder for built data files")
    parser.add_argument("--min-rating", type=float, default=4.0, help="Minimum rating filter")
    parser.add_argument("--max-recipes", type=int, default=10000, help="Maximum recipes to include")
    parser.add_argument("--min-reviews", type=int, default=5, help="Minimum review count filter")
    args = parser.parse_args()

    builder = MainDataBuilder(args.input)
    builder.build_enhanced_dataset(
        output_dir=args.output_dir,
        min_rating=args.min_rating,
        max_recipes=args.max_recipes,
        min_reviews=args.min_reviews,
    )


if __name__ == "__main__":
    main()
