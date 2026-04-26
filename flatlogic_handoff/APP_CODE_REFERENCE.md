# App Code Reference for Flatlogic

## How the App Loads Recipes

The app uses the `DataManager` class to load recipe data. Key points:

### 1. Recipe Sources (Priority Order)

```javascript
getRecipeSources() {
  if (this.isNativePlatform()) {
    return [
      'data/recipes_enhanced.json.gz',  // Preferred
      'data/recipes.json',               // Fallback
    ];
  }
  return [
    'data/recipes_enhanced.json.gz',
    'data/recipes.json',
  ];
}
```

The app tries sources in order until one succeeds.

### 2. File Loading Methods

**For regular JSON:**
```javascript
async fetchJson(path) {
  const response = await fetch(path);
  return response.json();
}
```

**For gzipped JSON:**
```javascript
async fetchGzipJson(path) {
  // On native platforms, uses Capacitor Filesystem API
  // Then decompresses with DecompressionStream
  // Falls back to fetch on web
}
```

### 3. File Size Constraints

Mobile WebView limitations:
- **Max file size to load via fetch():** ~10-15MB
- **Memory for decompressed data:** ~50-100MB
- **Recommended recipe count:** 15,000-25,000 recipes

**What happens with large files:**
- 52MB gzip file → 162MB uncompressed → Crash on mobile
- 4MB gzip file → 12MB uncompressed → Works fine

### 4. Recipe Matching Logic

Recipes are matched against user's pantry ingredients:

```javascript
// Ingredient matching in mealPlanner.js
const matched = r.ingredients.filter(ing => {
    const ingLower = ing.toLowerCase();
    return pantryNames.some(p => {
        const pantryLower = p.toLowerCase();
        // "squash" matches "butternut squash" (good)
        // "butter" doesn't match "peanut butter" (prevented by word boundary check)
        if (ingLower.includes(pantryLower)) {
            const wordPattern = new RegExp(`\\b${pantryWords[0]}\\b`, 'i');
            return wordPattern.test(ingLower);
        }
        return false;
    });
}).length;
```

### 5. Required Dependencies

In `package.json`:
```json
{
  "dependencies": {
    "@capacitor/filesystem": "^1.1.0"
  }
}
```

After adding recipes, run:
```bash
npm install
npm run sync  # Syncs to Android/iOS
npm run android:build
```

### 6. File Location

After `npm run sync`, files are copied to:
- Android: `android/app/src/main/assets/public/data/`
- iOS: `ios/App/App/public/data/`

### 7. Performance Considerations

**Bad (Current broken approach):**
- 188,435 recipes
- 52MB gzipped / 162MB uncompressed
- App crashes on mobile or takes 2+ minutes to load

**Good (Target):**
- 15,000-20,000 recipes
- 4-6MB gzipped / 12-18MB uncompressed
- Loads in <5 seconds on mobile

**How to achieve this:**
1. Filter to highest-rated recipes (4+ stars)
2. Remove recipes with >20 ingredients (too complex)
3. Remove recipes with <3 ingredients (incomplete)
4. Remove recipes missing images or incomplete data
5. Deduplicate by name

### 8. Testing on Device

After building:
```bash
npm run android:build
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Check console logs for:
```
[DataManager] Loaded XXXXX recipes from data/recipes.json.gz
[MealPlanner] Total recipes: XXXXX
```

### 9. Current Data Files

In the handoff package:
- `recipes_sample.json` - 100 sample recipes (uncompressed)
- `recipes_enhanced.json.gz` - Full 188k recipe dataset (52MB, too large)
- `DATA_SUMMARY.txt` - Statistics about current data

### 10. What Flatlogic Should Deliver

1. `recipes_flatlogic.json.gz` - 15,000-20,000 recipes
2. `recipes_sample.json` - First 100 uncompressed (for review)
3. `validation_report.txt` - Results of running validate_recipes.py
4. Total size: Under 8MB compressed

## Questions?

If you need the full app source code, it's available at:
[Git repository URL]
