# Critical Bugs & Their Fixes

## Bug #1: Large Recipe Dataset Crashes App

### Problem
- 188,435 recipes (52MB gzipped / 162MB uncompressed)
- Mobile WebView can't handle files >10-15MB via fetch()
- App crashes with out-of-memory error
- Falls back to 10,000 recipe dataset

### Symptoms
Console shows:
```
[DataManager] Recipe source unavailable: data/recipes_enhanced.json.gz (404)
[DataManager] Loaded 10000 recipes from data/recipes.json
```

### Root Cause
Mobile WebView fetch() has size limits. Large files must be read via native Filesystem API.

### Fix
Implement Filesystem-based loading in `dataManager.js`:

```javascript
// 1. Install dependency
npm install @capacitor/filesystem --legacy-peer-deps

// 2. Add dynamic import at top of dataManager.js
let Filesystem = null;
async function getFilesystem() {
  if (!Filesystem && typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
    const module = await import('@capacitor/filesystem');
    Filesystem = module.Filesystem;
  }
  return Filesystem;
}

// 3. Modify fetchGzipJson()
async fetchGzipJson(path) {
  // For native platforms, use Filesystem API
  const fs = await getFilesystem();
  if (fs) {
    try {
      const nativePath = path.replace('data/', 'public/data/');
      // Read as base64
      const { data } = await fs.readFile({
        path: nativePath,
        directory: 'Assets',
        encoding: 'base64'
      });
      // Convert and decompress
      const binary = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const blob = new Blob([binary]);
      const decompressed = blob
        .stream()
        .pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(decompressed).text();
      return JSON.parse(text);
    } catch (fsError) {
      console.warn('Filesystem read failed:', fsError);
    }
  }
  // Fallback to fetch for web
  const response = await fetch(path);
  // ... decompress and return
}
```

### Alternative Solution (Recommended)
Filter dataset to 15,000-20,000 high-quality recipes:
- Select highest-rated (4+ stars)
- Remove recipes with >20 ingredients (too complex)
- Remove recipes with <3 ingredients (incomplete)
- Target: 6-8MB compressed file

---

## Bug #2: Ingredient Matching False Positives

### Problem
- "butter" matches "peanut butter" (incorrect)
- "chicken" matches "chicken broth" (sometimes incorrect)
- Users see recipes they can't actually make

### Expected Behavior
- "squash" should match "butternut squash" ✓
- "butter" should NOT match "peanut butter" ✗

### Fix
Use word boundary regex in `mealPlanner.js`:

```javascript
// In rankedMeals()
const matched = r.ingredients.filter(ing => {
  const ingLower = ing.toLowerCase();
  return pantryNames.some(p => {
    const pantryLower = p.toLowerCase();
    const pantryWords = pantryLower.split(/\s+/);
    
    // Check if pantry ingredient is contained in recipe ingredient
    if (ingLower.includes(pantryLower)) {
      // Prevent false matches like "butter" matching "peanut butter"
      // Only match if pantry word is a separate word in ingredient
      const pantryWord = pantryWords[0];
      const wordPattern = new RegExp(`\\b${pantryWord}\\b`, 'i');
      return wordPattern.test(ingLower);
    }
    
    // Check if recipe ingredient is contained in pantry ingredient
    if (pantryLower.includes(ingLower)) {
      const ingWord = ingLower.split(/\s+/)[0];
      const wordPattern = new RegExp(`\\b${ingWord}\\b`, 'i');
      return wordPattern.test(pantryLower);
    }
    
    return false;
  });
}).length;
```

---

## Bug #3: Recipe Title-Ingredient Mismatch

### Problem
- "Butternut Squash Soup" has no butternut squash in ingredients
- "Peanut Butter Cookies" missing peanut butter
- Data quality issue from Kaggle dataset

### Fix
Add validation in data processing scripts:

```python
# validate_recipes.py
FOOD_KEYWORDS = {
    'chicken', 'beef', 'pork', 'fish', 'salmon',
    'butternut squash', 'acorn squash', 'spaghetti squash',
    'peanut butter', 'almond butter', 'apple butter',
    # ... more keywords
}

def check_ingredients_match_title(recipe):
    title_lower = recipe['name'].lower()
    ingredients_str = ' '.join(recipe.get('ingredients', [])).lower()
    
    for keyword in FOOD_KEYWORDS:
        if keyword in title_lower and keyword not in ingredients_str:
            return False, f"Missing: {keyword}"
    return True, None
```

---

## Bug #4: Speech Recognition Not Working on Android

### Problem
- Works on web but fails on Android device
- No microphone permission handling
- Wrong API being used

### Fix

```javascript
// pantryManager.js

async startSpeechRecognition() {
  try {
    // Check if running on Android
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'android') {
      const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
      
      // Check availability
      const { available } = await SpeechRecognition.available();
      if (!available) {
        throw new Error('Speech recognition not available');
      }
      
      // Request permissions
      const { permissionState } = await SpeechRecognition.requestPermissions();
      if (permissionState !== 'granted') {
        throw new Error('Microphone permission denied');
      }
      
      // Start listening
      await SpeechRecognition.start({
        language: 'en-US',
        maxResults: 5,
        prompt: 'Say an ingredient name',
        partialResults: true,
        popup: true
      });
      
      // Listen for results
      this._capacitorListener = SpeechRecognition.addListener('result', (data) => {
        const transcript = data.matches?.[0]?.toLowerCase().trim() || '';
        this.handleSpeechResult(transcript);
      });
      
    } else {
      // Web fallback
      this.startWebSpeechRecognition();
    }
  } catch (error) {
    console.error('Speech recognition failed:', error);
    // Show error to user
  }
}
```

**Dependencies:**
```bash
npm install @capacitor-community/speech-recognition --legacy-peer-deps
```

---

## Bug #5: Recipe Cards Don't Open

### Problem
- Tapping recipe card does nothing
- Modal doesn't appear
- JavaScript error in console

### Common Causes

#### 1. Event Delegation Missing
```javascript
// mealPlanner.js - renderMeals()
list.innerHTML = recipes.map(r => this.renderRecipeCard(r)).join('');

// Add click handler after rendering
list.querySelectorAll('.recipe-card').forEach(card => {
  card.addEventListener('click', () => {
    const recipeId = card.dataset.recipeId;
    this.openRecipeModal(recipeId);
  });
});
```

#### 2. Missing Modal Show Method
```javascript
// mealModal.js
show(recipe) {
  const modal = document.getElementById('recipe-modal');
  if (!modal) {
    console.error('Modal element not found');
    return;
  }
  
  // Populate modal content
  modal.querySelector('.recipe-name').textContent = recipe.name;
  modal.querySelector('.recipe-ingredients').innerHTML = 
    recipe.ingredients.map(i => `<li>${i}</li>`).join('');
  modal.querySelector('.recipe-steps').innerHTML = 
    recipe.steps.map((s, i) => `<li>${i+1}. ${s}</li>`).join('');
  
  // Show modal
  modal.classList.remove('hidden');
}
```

#### 3. Recipe Data Missing
Check `mealModal.show()` receives valid recipe:
```javascript
async openRecipeModal(recipeId) {
  const recipes = this.dataManager.getRecipes();
  const recipe = recipes.find(r => r.id === recipeId);
  
  if (!recipe) {
    console.error('Recipe not found:', recipeId);
    return;
  }
  
  if (!recipe.steps || recipe.steps.length === 0) {
    console.error('Recipe has no instructions:', recipe);
    // Show error to user
    return;
  }
  
  this.mealModal.show(recipe);
}
```

---

## Bug #6: Meal Prep Calculation Errors

### Problem
```
TypeError: Cannot read properties of undefined (reading 'servings')
    at mealPrep.js:43
```

### Root Cause
Recipe objects missing `servings` field.

### Fix

#### 1. Add Default Servings
```javascript
// mealPrep.js
calculatePrepSchedule() {
  const recipes = this.getPlannedRecipes();
  
  return recipes.map(r => {
    const servings = r.servings || 4;  // Default to 4
    // ... rest of calculation
  });
}
```

#### 2. Validate Recipe Data on Load
```javascript
// dataManager.js - sanitizeRecipe()
sanitizeRecipe(recipe) {
  if (!recipe || !recipe.name || !Array.isArray(recipe.ingredients)) {
    return null;
  }
  
  // Ensure defaults
  return {
    ...recipe,
    servings: recipe.servings || 4,
    minutes: recipe.minutes || 30,
    rating: recipe.rating || 0,
    steps: recipe.steps || []
  };
}
```

---

## Bug #7: Git LFS Issues with Large Files

### Problem
- Can't push recipe data files to GitLab
- Git LFS quota exceeded
- Large files cause merge conflicts

### Solution

#### 1. Add to .gitignore
```
# Large data files
www/data/*.json.gz
www/data/recipes_enhanced*.json
scripts/*.csv
scripts/*.json
clean_*.json
existing_*.json

# Keep only small files
!www/data/recipes.json
!www/data/ingredients.json
!www/data/search_index.json
```

#### 2. Remove from Git History (if needed)
```bash
# Remove large files from git index
git rm --cached www/data/recipes_enhanced.json.gz
git rm --cached scripts/raw_recipes.csv

# Commit .gitignore changes
git add .gitignore
git commit -m "Exclude large data files from git"
```

#### 3. Store Data Externally
- Keep large datasets in cloud storage
- Provide download scripts
- Include only code in git repo

---

## Bug #8: Duplicate Android Assets

### Problem
```
ERROR: [public/data/recipes_enhanced.json] Duplicate resources
```

### Cause
Both `.json` and `.json.gz` versions in assets directory.

### Fix
```bash
# Remove uncompressed versions before sync
rm www/data/recipes_enhanced.json  # Keep only .gz
npm run sync
```

Or add to `capacitor.config.json`:
```json
{
  "server": {
    "androidScheme": "https"
  }
}
```

---

## Testing Checklist

After fixing bugs, verify:

- [ ] App loads with >15,000 recipes without crash
- [ ] Ingredient "squash" matches "butternut squash"
- [ ] Ingredient "butter" does NOT match "peanut butter"
- [ ] Recipe cards open and show full details
- [ ] Speech recognition works on Android
- [ ] Meal prep calculation shows no errors
- [ ] Git push succeeds (no LFS issues)
- [ ] Android build succeeds (no duplicate assets)
