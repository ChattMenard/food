# Complete App Build Guide for AI Developer

## Overview

This is a **Capacitor-based hybrid mobile app** (Android/iOS/Web) for recipe management and meal planning. It uses vanilla JavaScript with Tailwind CSS for the UI.

**Key Technologies:**
- Capacitor 7.x (mobile bridge)
- Vanilla JavaScript (ES6 modules)
- Tailwind CSS (styling)
- Webpack (bundling)
- npm (package management)

## Architecture

### Directory Structure

```
saas/
├── android/                    # Android native project
│   └── app/src/main/assets/   # Compiled web assets
├── ios/                        # iOS native project (if present)
├── www/                        # Web app source (compiled to android/assets)
│   ├── index.html             # Main entry point
│   ├── css/styles.css         # Tailwind-compiled styles
│   ├── js/
│   │   ├── app.js             # Main application entry
│   │   ├── core/              # Core utilities
│   │   │   ├── database.js    # IndexedDB wrapper
│   │   │   ├── storage.js     # LocalStorage wrapper
│   │   │   └── eventEmitter.js # Pub/sub event system
│   │   ├── data/              # Data management
│   │   │   ├── dataManager.js # Recipe loading, caching
│   │   │   └── seedRecipes.js # Fallback recipes
│   │   ├── features/          # Feature modules
│   │   │   ├── meals/         # Meal planning
│   │   │   │   ├── mealPlanner.js    # Core meal logic
│   │   │   │   └── mealModal.js      # Recipe detail modal
│   │   │   ├── pantry/        # Pantry management
│   │   │   │   └── pantryManager.js
│   │   │   ├── shopping/      # Shopping lists
│   │   │   │   └── shoppingList.js
│   │   │   └── meal-prep/     # Meal prep planning
│   │   │       └── mealPrep.js
│   │   ├── logic/             # Business logic
│   │   │   ├── searchIndex.js # Search functionality
│   │   │   └── recipeCache.js # Caching layer
│   │   ├── utils/             # Utilities
│   │   │   ├── dietFilters.js # Dietary preference filtering
│   │   │   └── shareSheet.js  # Native sharing
│   │   └── advanced/          # Advanced features
│   │       ├── recipeImages.js # Image loading
│   │       └── barcodeScanner.js
│   └── data/                  # Static data files
│       ├── recipes_enhanced.json.gz  # Main recipe dataset
│       ├── recipes.json       # Fallback recipes
│       └── ingredients.json   # Ingredient list
├── scripts/                   # Python data processing scripts
├── package.json              # Node dependencies
├── capacitor.config.json     # Capacitor configuration
└── webpack.config.js         # Build configuration
```

### Data Flow

```
User Action
    ↓
Feature Module (mealPlanner.js, pantryManager.js)
    ↓
DataManager (loads recipes, manages cache)
    ↓
Core Storage (database.js, storage.js)
    ↓
IndexedDB / LocalStorage / Recipe Files
```

### Key Classes & Responsibilities

#### 1. DataManager (`www/js/data/dataManager.js`)

**Purpose:** Load and cache recipe data

**Key Methods:**
```javascript
// Load recipes from gzipped JSON or fallback
async loadRecipesFromSources()

// Get recipe sources in priority order
getRecipeSources()

// Check if running on native mobile
isNativePlatform()

// Validate recipe structure
sanitizeRecipe(recipe)
```

**Recipe Loading Flow:**
1. Check if native platform (Android/iOS)
2. Try `recipes_enhanced.json.gz` first
3. If fails, fall back to `recipes.json`
4. Cache in IndexedDB
5. Notify UI to render

**Current Issue (IMPORTANT):**
The 52MB gzipped file causes crashes. Must use Filesystem API for native:
```javascript
async fetchGzipJson(path) {
  // For native: use Capacitor Filesystem
  // Read as base64, decompress with DecompressionStream
  // Fall back to fetch for web
}
```

#### 2. MealPlanner (`www/js/features/meals/mealPlanner.js`)

**Purpose:** Match pantry ingredients to recipes, rank results

**Key Methods:**
```javascript
// Main entry: rank recipes by pantry match
rankedMeals(sortBy, sortDir)

// Calculate match score
// Each recipe gets: matched count, missing count, ratio
// Sorted by: hasAll, ratio, matched count

// Render recipe cards
renderMeals(scoredRecipes)

// Ingredient matching (CRITICAL)
// "squash" matches "butternut squash" (good)
// "butter" does NOT match "peanut butter" (prevented)
```

**Algorithm:**
```javascript
for each recipe:
  matched = count of ingredients in pantry
  missing = total - matched
  ratio = matched / total
  hasAll = (matched === total)

sort by:
  1. hasAll (recipes you can make now first)
  2. ratio (highest match percentage)
  3. matched count (most ingredients matched)
```

#### 3. PantryManager (`www/js/features/pantry/pantryManager.js`)

**Purpose:** Manage user's available ingredients

**Key Methods:**
```javascript
// Add ingredient
addItem(item)

// Remove ingredient  
removeItem(id)

// Get all pantry items
getPantry()

// Speech-to-text input (CRITICAL FEATURE)
async startSpeechRecognition()
// Uses Capacitor SpeechRecognition plugin on Android
// Uses Web Speech API on web
```

**Storage:**
- Pantry items: `{id, name, quantity, unit, expiresAt}`
- Stored in IndexedDB via `database.js`

#### 4. Database (`www/js/core/database.js`)

**Purpose:** IndexedDB wrapper for structured data

**API:**
```javascript
const db = new Database()
await db.init()
await db.put('pantry', item)
const items = await db.getAll('pantry')
await db.delete('pantry', id)
```

**Object Stores:**
- `pantry` - User's ingredients
- `recipes` - Cached recipes
- `shopping` - Shopping lists
- `mealPlan` - Weekly meal plans

### Event System

Uses pub/sub pattern via `EventEmitter`:

```javascript
// Emit event
eventEmitter.emit('pantry:changed')

// Listen for event
eventEmitter.on('pantry:changed', () => {
  updateMeals()
})
```

**Key Events:**
- `app:ready` - App initialized
- `pantry:changed` - Pantry updated
- `recipes:loaded` - Recipes loaded
- `mealPlan:updated` - Meal plan changed

## Build Process

### 1. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Mobile Build

```bash
# Sync web assets to native projects
npm run sync

# Build Android APK
npm run android:build

# Install on device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Capacitor Commands

```bash
# Add platforms (if needed)
npx cap add android
npx cap add ios

# Sync web dir to native
npx cap sync

# Open Android Studio
npx cap open android
```

## Critical Implementation Details

### 1. Recipe Data Loading

The app MUST handle large files properly on mobile:

```javascript
// www/js/data/dataManager.js

async fetchGzipJson(path) {
  // 1. Check if native platform
  if (Capacitor.isNativePlatform()) {
    // 2. Use Capacitor Filesystem API
    // 3. Read as base64 (can't read binary directly)
    // 4. Convert to Uint8Array
    // 5. Decompress with DecompressionStream
    // 6. Parse JSON
  } else {
    // Web: use fetch + DecompressionStream
  }
}
```

**Dependencies needed:**
```bash
npm install @capacitor/filesystem --legacy-peer-deps
```

### 2. Ingredient Matching Algorithm

Must handle partial matches correctly:

```javascript
// pantryNames = ['squash', 'butter', 'chicken']

// Recipe ingredient: "butternut squash"
// Should match: YES ("squash" is in "butternut squash")

// Recipe ingredient: "peanut butter"  
// Should match: NO ("butter" alone shouldn't match)

// Implementation:
const matches = pantryNames.some(p => {
  const pantryWord = p.toLowerCase().split(/\s+/)[0]
  const ingLower = ingredient.toLowerCase()
  
  // Check if pantry word is in ingredient
  if (ingLower.includes(p.toLowerCase())) {
    // Verify it's a whole word match
    const pattern = new RegExp(`\\b${pantryWord}\\b`, 'i')
    return pattern.test(ingLower)
  }
  return false
})
```

### 3. Speech Recognition

Must handle both native and web:

```javascript
async startSpeechRecognition() {
  if (Capacitor.getPlatform() === 'android') {
    // Use @capacitor-community/speech-recognition
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
    await SpeechRecognition.requestPermissions()
    await SpeechRecognition.start({
      language: 'en-US',
      maxResults: 5
    })
  } else {
    // Use Web Speech API
    const recognition = new webkitSpeechRecognition()
    recognition.start()
  }
}
```

**Dependencies:**
```bash
npm install @capacitor-community/speech-recognition --legacy-peer-deps
```

### 4. Recipe Modal

When user taps a recipe card:

```javascript
// 1. Get recipe data
const recipe = await dataManager.getRecipe(id)

// 2. Show modal
mealModal.show(recipe)

// 3. Render:
// - Recipe image
// - Ingredient list (pantry items highlighted)
// - Instructions
// - "Add to Meal Plan" button
// - "Add Missing to Shopping List" button
```

### 5. Meal Planning

User adds recipe to weekly plan:

```javascript
// Add to meal plan
mealPlan.add({
  recipeId: recipe.id,
  day: 'monday',
  meal: 'dinner',  // breakfast, lunch, dinner
  servings: 4
})

// Auto-calculate prep schedule
mealPrep.calculatePrepSchedule()

// Update shopping list with missing ingredients
shoppingList.addMissing(recipe)
```

## Data Schema

### Recipe Object

```javascript
{
  id: 1,                          // Integer, unique
  name: "Recipe Name",            // String
  ingredients: ["item 1", ...],   // Array of strings
  steps: ["step 1", ...],         // Array of strings  
  minutes: 30,                    // Integer
  tags: ["dinner", "quick"],      // Array of strings
  rating: 4.5,                    // Number 0-5
  servings: 4,                    // Integer
  difficulty: "easy",             // String
  image: "https://...",           // String (optional)
  nutrition: {                     // Object (optional)
    calories: 350,
    protein: 25,
    carbs: 40,
    fat: 12
  }
}
```

### Pantry Item

```javascript
{
  id: "uuid",
  name: "chicken breast",
  quantity: 2,
  unit: "lbs",
  expiresAt: "2026-05-01",        // ISO date or null
  category: "protein"             // auto-detected
}
```

## Testing

### 1. Web Testing

```bash
npm run dev
# Open http://localhost:8080
```

### 2. Android Testing

```bash
# Build and install
npm run sync && npm run android:build
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Open Chrome DevTools for debugging
chrome://inspect#devices
```

### 3. Critical Test Cases

- Add ingredient via speech recognition
- Search recipes by ingredient
- Tap recipe card → modal opens
- Add recipe to meal plan
- Generate shopping list
- Recipe matching with partial ingredients ("squash" → "butternut squash")
- Recipe matching exclusion ("butter" should NOT match "peanut butter")
- Large dataset loading (15k+ recipes without crash)

## Common Issues & Solutions

### 1. Recipe Dataset Too Large

**Problem:** 188k recipes (52MB) crashes app
**Solution:** 
- Filter to 15k-20k best recipes
- Use Filesystem API for native platforms
- Compress with gzip

### 2. Ingredient Matching False Positives

**Problem:** "butter" matches "peanut butter"
**Solution:** Use word boundary regex:
```javascript
const pattern = new RegExp(`\\b${pantryWord}\\b`, 'i')
```

### 3. Speech Recognition Not Working

**Problem:** Works on web but not Android
**Solution:** 
- Install @capacitor-community/speech-recognition
- Check runtime platform with Capacitor.getPlatform()
- Request microphone permissions

### 4. Recipe Cards Not Opening

**Problem:** Modal doesn't show when tapping recipe
**Solution:**
- Check event delegation on recipe cards
- Verify mealModal.show() is called
- Check for JavaScript errors in console

### 5. Meal Plan Not Saving

**Problem:** Added meals disappear on app restart
**Solution:**
- Verify IndexedDB is being used (not just memory)
- Check database.js put() calls
- Ensure db.init() completes before operations

## Package Scripts

From `package.json`:

```json
{
  "scripts": {
    "dev": "webpack serve --mode development",
    "build": "webpack --mode production",
    "sync": "npm run build && npx cap sync",
    "android:build": "cd android && ./gradlew assembleDebug",
    "ios:build": "cd ios && xcodebuild ...",
    "test": "jest"
  }
}
```

## Environment Setup

### Prerequisites

```bash
# Node.js 18+
npm install

# Android SDK
export ANDROID_SDK_ROOT=~/Android/Sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools

# Java 17
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

### First Build

```bash
# 1. Install deps
npm install --legacy-peer-deps

# 2. Build web
npm run build

# 3. Sync to Android
npx cap sync

# 4. Build APK
cd android && ./gradlew assembleDebug

# 5. Install
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Next Steps for AI Developer

1. **Review the handoff package** (`flatlogic_handoff.zip`) for data requirements
2. **Set up environment** with Android SDK
3. **Build the app** following steps above
4. **Test on device** with Chrome DevTools
5. **Fix recipe data loading** to use Filesystem API properly
6. **Verify ingredient matching** works with edge cases
7. **Test speech recognition** on Android
8. **Deploy and validate** all features work

## Questions?

Refer to:
- `RECIPE_SCHEMA.md` - Data format requirements
- `APP_CODE_REFERENCE.md` - How app uses data
- Source code in `www/js/` - Implementation details
- Capacitor docs: https://capacitorjs.com/docs
