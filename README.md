# PantryAI - Smart Meal Planner

A smart meal planning application that helps you manage your pantry, discover recipes based on available ingredients, and optimize your grocery shopping. Built as a Progressive Web App (PWA) with Capacitor for native mobile deployment.

## Features

### Pantry Management
- Add ingredients with smart unit suggestions
- Auto-suggested expiry dates based on ingredient type
- Ingredient categories (Produce, Dairy, Meat, etc.)
- Low stock alerts
- Bulk import from shopping lists
- Fuzzy ingredient matching for substitutions

### Meal Discovery
- Recipe suggestions based on pantry inventory
- Filter by diet (vegetarian, vegan, keto, gluten-free, etc.)
- Filter by allergies (dairy, gluten, nuts, etc.)
- Filter by cuisine (Italian, Mexican, Asian, etc.)
- Sort by fewest missing ingredients, best match, or fastest cook time
- Recipe detail modal with ingredients, instructions, and nutrition
- Recipe rating system with localStorage persistence
- Recipe images with lazy loading

### Meal Planning
- Weekly meal planner with drag-and-drop
- Automatic shopping list generation
- Budget optimizer with cost-saving tips
- Servings adjustment

### Accessibility & Performance
- WCAG AA compliant color contrasts
- Screen reader announcements
- Keyboard navigation (Enter to submit, Esc to close)
- Virtualized meal list rendering for large datasets
- Lazy-loaded recipe dataset for fast initial load
- Memoized meal scoring calculations
- Service worker for offline capability

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```bash
npm install
```

### 3. Build enhanced datasets
```bash
npm run build:data
```

### 4. Add native platforms (optional)
```bash
# For Android
npx cap add android

# For iOS (macOS only)
npx cap add ios
```

### 5. Open in IDE (optional)
```bash
# Open Android Studio
npx cap open android

# Open Xcode (macOS only)
npx cap open ios
```

### 6. Build
- **Android**: Run in Android Studio or `./gradlew assembleDebug`
- **iOS**: Click Play in Xcode

## Development Workflow

### Android Studio (Dialed Workflow)
```bash
# 1) Build enhanced datasets
npm run build:data

# 2) Sync web assets + open Android Studio (configured for this machine)
npm run android

# 3) Optional CLI debug build
npm run android:build
```

### Web Development
```bash
# Serve locally for testing
npx serve

# Or use any static file server
python -m http.server 8000
```

## Alternative: PWA Only
The app works as a PWA directly in any browser. To install:
1. Serve the files (e.g., `npx serve`)
2. Open on mobile browser
3. Add to Home Screen

## Project Structure
```
/saas
  index.html          # Main application (single-page app)
  manifest.json       # PWA manifest
  sw.js              # Service worker for offline caching
  capacitor.config.json
  package.json       # Dependencies and scripts
  data/              # Recipe and ingredient datasets
    ingredients.json  # Autocomplete ingredient vocabulary
    recipes.json      # Recipe database
  scripts/           # Build and data processing scripts
  android/           # Android native project (after cap add)
  ios/               # iOS native project (after cap add)
  www/               # Capacitor web assets (auto-synced)
```

## Data Schema

### Recipe Object
```javascript
{
  name: string,              // Recipe name
  ingredients: string[],     // Array of ingredients
  time: number,              // Cook time in minutes
  servings: number,          // Number of servings
  rating: number,            // Rating (1-5)
  category: string,          // Cuisine category
  nutrition: {               // Optional nutrition info
    calories: number,
    protein: string,
    carbs: string,
    fat: string
  },
  instructions: string,      // Cooking instructions
  verified_url: string,      // Verified recipe URL
  fallback_url: string,      // Fallback search URL
  image: string              // Recipe image URL (optional)
}
```

### Pantry Item Object
```javascript
{
  name: string,              // Ingredient name (lowercase)
  quantity: number,          // Quantity amount
  unit: string,              // Unit (cups, g, lbs, units, etc.)
  purchaseDate: string       // YYYY-MM-DD format
}
```

## Browser Support
- Chrome/Edge (latest)
- Safari (latest)
- Firefox (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## TypeScript Migration Consideration

The codebase is currently written in JavaScript. A TypeScript migration would provide:
- Type safety and better IDE support
- Improved code documentation
- Easier refactoring
- Better catch of runtime errors at compile time

**Migration Approach:**
1. Add `tsconfig.json` with strict settings
2. Install `@types/*` for all dependencies
3. Migrate modules incrementally starting with core utilities
4. Use `// @ts-check` for gradual adoption
5. Enable strict mode after all modules are typed

**Estimated Effort:** 2-3 weeks for full migration

**Priority:** Low - Current JavaScript codebase is well-documented with JSDoc and functioning correctly.

## License
MIT
