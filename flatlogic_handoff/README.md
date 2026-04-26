# Flatlogic Recipe Data Handoff Package

## What's Included

| File | Description | Size |
|------|-------------|------|
| `RECIPE_SCHEMA.md` | Complete schema documentation with examples | 4.7KB |
| `APP_CODE_REFERENCE.md` | How the app loads and uses recipe data | 3.7KB |
| `validate_recipes.py` | Python script to check data quality | 6.6KB |
| `recipes_sample.json` | 100 sample recipes (uncompressed for review) | 291KB |
| `recipes_current_full.json.gz` | Current 188,435 recipes (for reference) | 50MB |
| `DATA_SUMMARY.txt` | Statistics about current dataset | 301B |

## Quick Start for Flatlogic

### 1. Understand the Requirements

**Target Dataset:**
- **15,000-20,000 recipes** (current has too many - 188k causes crashes)
- **File size:** Under 8MB compressed (gzip)
- **Quality:** 85%+ should pass validation

### 2. Use the Validation Script

```bash
# Run this on your generated data before delivery
python3 validate_recipes.py recipes_flatlogic.json.gz
```

Expected output:
```
Quality Score: 90.0%
✅ EXCELLENT - Ready for delivery
```

### 3. Key Validation Rules

**CRITICAL - Title-Ingredient Matching:**
- "Chicken Alfredo" MUST have "chicken" in ingredients
- "Butternut Squash Soup" MUST have "butternut squash" in ingredients
- "Peanut Butter Cookies" MUST have "peanut butter" in ingredients

The script checks this automatically.

### 4. Deliverables

Submit to client:
1. `recipes_flatlogic.json.gz` - Your compressed dataset
2. `recipes_sample.json` - First 100 recipes uncompressed
3. `validation_report.txt` - Output of validate_recipes.py

## Current Dataset Problems (For Reference)

The included `recipes_current_full.json.gz` (188,435 recipes) has these issues:
- ❌ Too large - 52MB compressed / 162MB uncompressed
- ❌ Causes app crashes on mobile devices
- ❌ Out-of-memory errors on Android WebView
- ❌ 10,000 recipe limit being applied (old fallback data)

**Why this happened:**
We merged Food.com Kaggle dataset (231k recipes) with existing data, filtered to 188k validated recipes, but mobile WebView can't handle files >10-15MB.

## Recipe Format Example

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
  "difficulty": "easy"
}
```

## Size Guidelines

| Recipe Count | Compressed Size | Mobile Performance |
|-------------|-----------------|-------------------|
| 10,000 | 3-4 MB | ✅ Fast loading |
| 20,000 | 6-8 MB | ✅ Good loading |
| 50,000 | 15-20 MB | ⚠️ Slow loading |
| 188,000 | 52 MB | ❌ Crashes app |

## Recommended Data Sources

1. **Food.com / Genius Kitchen** (preferred)
2. **AllRecipes**
3. **BBC Good Food**
4. **NYT Cooking**

Focus on highly-rated recipes (4+ stars) with complete instructions.

## Questions?

Contact the development team with:
- Validation script output
- Sample recipes for review
- Any schema clarifications needed

## Timeline

Target delivery: [Set with client]
Quality threshold: 85%+ valid recipes
File size limit: 8MB compressed
