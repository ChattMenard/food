# AI Developer Handoff Package - Main Recipe & Meal Planning App

## Quick Summary

This is a **Capacitor-based hybrid mobile app** for recipe management and meal planning. It runs on Android, iOS, and web.

**Current Status:** Functional but has critical bugs that need fixing.

## What's in This Package

| Document | Purpose |
|----------|---------|
| **BUILD_GUIDE.md** | Complete architecture and build instructions |
| **DEPENDENCY_MANIFEST.md** | All npm/android dependencies and setup |
| **CRITICAL_BUGS.md** | Detailed bug fixes with code examples |
| **../flatlogic_handoff/** | Recipe data requirements for Flatlogic |

## Immediate Priorities

### 1. Fix Recipe Loading (CRITICAL)
**Problem:** 188k recipe dataset crashes app
**Solution:** Either implement Filesystem API loading OR reduce dataset to 15k-20k recipes

### 2. Fix Ingredient Matching
**Problem:** "butter" matches "peanut butter"
**Solution:** Word boundary regex matching

### 3. Fix Speech Recognition
**Problem:** Not working on Android
**Solution:** Install @capacitor-community/speech-recognition plugin

### 4. Fix Recipe Card Modal
**Problem:** Tapping recipe does nothing
**Solution:** Check event delegation and modal show method

## Build Commands

```bash
# Setup
npm install --legacy-peer-deps

# Development
npm run dev

# Mobile Build
npm run sync && npm run android:build

# Install on Device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Debug with Chrome
cd android && ./gradlew assembleDebug
# Then: chrome://inspect#devices
```

## Key Files to Understand

### Core Application
- `www/js/app.js` - Main entry point
- `www/index.html` - App shell

### Data Management
- `www/js/data/dataManager.js` - Recipe loading (BUGGY - needs fix)
- `www/js/core/database.js` - IndexedDB wrapper

### Feature Modules
- `www/js/features/meals/mealPlanner.js` - Recipe matching (BUGGY - needs fix)
- `www/js/features/meals/mealModal.js` - Recipe detail view (BUGGY - needs fix)
- `www/js/features/pantry/pantryManager.js` - Pantry + speech (BUGGY - needs fix)
- `www/js/features/meal-prep/mealPrep.js` - Meal planning

### Configuration
- `capacitor.config.json` - Capacitor settings
- `package.json` - Dependencies
- `webpack.config.js` - Build config

## Testing Requirements

Before considering the app "working":

- [ ] Loads 15,000+ recipes without crash
- [ ] Ingredient matching works correctly (test: "squash" vs "butter")
- [ ] Recipe cards open and show full details
- [ ] Speech recognition adds ingredients on Android
- [ ] Can add recipes to meal plan
- [ ] Shopping list generates from meal plan
- [ ] No console errors during normal use

## Data Flow Summary

```
User adds ingredient → PantryManager
                              ↓
                    Saves to IndexedDB
                              ↓
                    Event: pantry:changed
                              ↓
                    MealPlanner.rankedMeals()
                              ↓
                    Matches against recipes
                              ↓
                    Renders recipe cards
                              ↓
                    User taps card
                              ↓
                    MealModal.show(recipe)
```

## Common Issues Quick Reference

| Issue | Location | Fix |
|-------|----------|-----|
| App crashes on load | dataManager.js | Use Filesystem API for large files |
| Wrong recipe matches | mealPlanner.js | Add word boundary regex |
| Recipe cards don't open | mealModal.js | Check event listeners |
| Speech not working | pantryManager.js | Install speech plugin |
| Git push fails | .gitignore | Exclude *.json.gz files |
| Android build fails | android/ | Remove duplicate assets |

## Code Style

- ES6 modules with import/export
- Async/await for async operations
- Class-based architecture
- Event-driven with EventEmitter
- Tailwind CSS for styling
- Console logging for debugging (prefix with [ModuleName])

## Next Steps

1. **Read BUILD_GUIDE.md** - Understand the architecture
2. **Review CRITICAL_BUGS.md** - See detailed fixes needed
3. **Check DEPENDENCY_MANIFEST.md** - Verify environment setup
4. **Fix Bug #1 (recipe loading)** - Most critical for functionality
5. **Test on Android device** - Use Chrome DevTools for debugging
6. **Iterate on other bugs** - Use the detailed fixes in CRITICAL_BUGS.md

## Resources

- Capacitor Docs: https://capacitorjs.com/docs
- Source Code: `www/js/` directory
- Sample Data: `flatlogic_handoff/recipes_sample.json`

## Contact

For questions about this handoff package, refer to the specific bug documentation or the build guide sections.
