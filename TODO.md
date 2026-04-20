# PantryAI - Technical Debt & Feature Backlog

**Last Updated:** 2026-04-19

---

## 🔥 PRIORITY 1 - Critical Fixes (Blocking Basic Usage)

### Data Persistence Architecture
- [x] **P1-001** Fix IndexedDB/localStorage split - unify to single storage layer
- [x] **P1-002** Migrate existing localStorage users to IndexedDB
- [x] **P1-003** Wire up db.loadRecipes() instead of fetch in loadData()
- [x] **P1-004** Add sync mechanism between storage and UI state

### Security
- [x] **P1-005** Fix XSS vulnerabilities in renderPantry() template literals
- [x] **P1-006** Fix XSS vulnerabilities in renderMealPlan() template literals
- [x] **P1-007** Add input sanitization for all user-generated content
- [x] **P1-008** Implement CSP headers

### Core UX
- [x] **P1-009** Add loading states for dataset fetch (spinner/skeleton)
- [x] **P1-010** Add error toast notifications (replace console.error)
- [x] **P1-011** Add success confirmations for user actions
- [x] **P1-012** Make shopping list items checkable (mark as purchased)
- [x] **P1-013** Add remove button for meal plan items
- [x] **P1-014** Add validation for malformed localStorage data

---

## ⚡ PRIORITY 2 - UX Polish & Performance

### Code Organization
- [x] **P2-001** Extract inline JS from index.html into modules
  - ✅ Extracted AppState, PantryManager, MealPlanner, RecipeEngine, DietFilters, DataManager, UIManager, PreferencesManager
  - ✅ Removed wrapper functions, directly bound module methods to window
- [x] **P2-002** Create AppState.js for centralized state management
  - ✅ `js/appState.js` now loads/persists pantry, meal plan, preferences, and ratings
- [x] **P2-003** Create PantryManager.js module
  - ✅ `js/pantryManager.js` now encapsulates pantry CRUD, autocomplete, and camera simulation logic
- [x] **P2-004** Create MealPlanner.js module
  - ✅ `js/mealPlanner.js` handles ranked meals, virtualization, plan rendering, and shopping list helpers
- [x] **P2-005** Create RecipeEngine.js module
  - ✅ `js/recipeEngine.js` encapsulates recipe modal, rating handlers, and detail rendering
- [x] **P2-008** Create DietFilters.js module
  - ✅ `js/dietFilters.js` extracts diet/allergy/cuisine filtering utilities
- [x] **P2-009** Create DataManager.js module
  - ✅ `js/dataManager.js` handles recipe/ingredient loading with validation
- [x] **P2-010** Create UIManager.js module
  - ✅ `js/uiManager.js` extracts tab navigation and screen reader announcements
- [x] **P2-011** Create PreferencesManager.js module
  - ✅ `js/preferencesManager.js` handles user preference updates and persistence
- [x] **P2-006** Add JSDoc types to all functions
- [x] **P2-007** Consider TypeScript migration

### Performance
- [x] **P2-008** Add debouncing to autocomplete search (150ms)
- [x] **P2-009** Virtualize meal list rendering (1000+ recipes)
- [x] **P2-010** Lazy load enhanced dataset (stream/chunk loading)
- [x] **P2-011** Implement recipe image lazy loading
- [x] **P2-012** Memoize meal scoring calculations
- [x] **P2-013** Add service worker asset caching

### Mobile Responsive
- [x] **P2-014** Add hamburger menu for tab navigation on mobile (implemented as compact two-row layout)
- [x] **P2-015** Fix font-size: 16px on inputs to prevent iOS zoom
- [x] **P2-016** Add pull-to-refresh gesture
- [x] **P2-017** Add swipe-to-delete for pantry items
- [x] **P2-018** Fix autocomplete dropdown keyboard overlap
- [x] **P2-019** Add haptic feedback on actions (Capacitor Haptics)

### Recipe Features
- [x] **P2-020** Create recipe detail modal (instructions, nutrition, reviews)
- [x] **P2-021** Add servings adjustment slider (scale ingredients)
- [x] **P2-022** Add recipe images from dataset
- [x] **P2-023** Add recipe favorites/bookmarking
- [x] **P2-024** Add recipe rating system

### Pantry Improvements
- [x] **P2-025** Add search/filter to pantry list
- [x] **P2-026** Add bulk import (paste shopping list text)
- [x] **P2-027** Add ingredient categories/tags
- [x] **P2-028** Add smart unit normalization (1 cup = 236ml matching)
- [x] **P2-029** Implement fuzzy ingredient matching (substitution-aware matching added)
- [x] **P2-030** Add expiry date auto-suggestions by ingredient type

### Keyboard & Accessibility
- [x] **P2-031** Add Enter to submit ingredient form
- [x] **P2-032** Add Esc to cancel/close modals
- [x] **P2-033** Add keyboard navigation to autocomplete dropdown
- [x] **P2-034** Add ARIA labels to all interactive elements (settings + pantry form)
- [x] **P2-035** Add screen reader announcements for dynamic updates
- [x] **P2-036** Fix color contrast issues (WCAG AA compliance)
- [x] **P2-037** Add focus trap in modals
- [x] **P2-038** Add icons to color-coded indicators (freshness, alerts)

---

## 🚀 PRIORITY 3 - Pro Features

### Nutrition Dashboard
- [x] **P3-001** Wire nutrition dashboard to real IndexedDB data
- [x] **P3-002** Add auto-refresh when meals logged
- [x] **P3-003** Implement CSV export for nutrition logs
- [x] **P3-004** Implement JSON export for nutrition logs
- [x] **P3-005** Add nutrition goal progress notifications
- [x] **P3-006** Add meal history calendar view
- [x] **P3-007** Add macro/micro nutrient trends charts

### Smart Recommendations
- [x] **P3-008** Use ingredient vectors for similarity matching
  - ✅ Created IngredientVectors.js module with TF-IDF vectorization
  - ✅ Integrated vector-based similarity into RecipeEngine
  - ✅ Cosine similarity for improved recipe matching
- [x] **P3-009** Wire up search index for fast recipe queries
  - ✅ Created SearchIndex.js module with term extraction and indexing
  - ✅ Integrated search index into DataManager
  - ✅ Index built automatically when recipes are loaded
- [x] **P3-010** Implement personalized recommendations (based on history)
  - ✅ Created PersonalizedRecommendations.js module
  - ✅ Uses recipe ratings and meal plan history for suggestions
  - ✅ Filters by diet preferences
- [x] **P3-011** Add "similar recipes" suggestions
  - ✅ Added ingredient-based similarity matching in RecipeEngine
  - ✅ Display similar recipes in recipe modal
- [x] **P3-012** Add seasonal ingredient suggestions
  - ✅ Created seasonalIngredients.js module with monthly ingredient data
  - ✅ Added seasonal suggestions UI to pantry tab
  - ✅ Auto-updates when pantry changes

### Advanced Meal Planning
- [x] **P3-013** Add drag-and-drop meal reordering
  - ✅ Added drag-and-drop event handlers to MealPlanner
  - ✅ Users can swap meals by dragging between day cards
  - ✅ Visual feedback with opacity on drag
- [x] **P3-014** Add meal prep mode (batch cooking)
  - ✅ Created MealPrep.js module with batch cooking suggestions
  - ✅ Added meal prep tips UI to meal plan section
  - ✅ Calculates prep opportunities and suggests prep day
- [x] **P3-015** Add leftover tracking
  - ✅ Created LeftoverTracker.js module
  - ✅ Added leftovers UI section to pantry tab
  - ✅ Supports marking items as leftovers and viewing tracked leftovers
- [x] **P3-016** Add calendar export (iCal format)
  - ✅ Added iCal export functionality to MealPlanSharing
  - ✅ Export button downloads .ics file compatible with calendar apps
  - ✅ Events scheduled based on day of week
- [x] **P3-017** Add weekly meal plan templates
  - ✅ Created MealPlanTemplates.js module with default and custom templates
  - ✅ Added template selection UI to meal plan section
  - ✅ Supports Quick Week, Healthy Balanced, and Budget Friendly templates
- [x] **P3-018** Add meal plan sharing (export/import)
  - ✅ Created MealPlanSharing.js module with export/import functionality
  - ✅ Added export/import buttons to meal plan UI
  - ✅ Supports JSON file export and import

### Native Integration (Capacitor)
- [x] **P3-019** Implement native camera for barcode scanning
- [x] **P3-020** Add photo receipt scanning (OCR)
- [x] **P3-021** Add native share sheet for shopping lists
- [x] **P3-022** Add deep linking support
- [x] **P3-023** Handle Android back button properly
- [x] **P3-024** Add custom splash screen
- [x] **P3-025** Declare app permissions in AndroidManifest.xml
- [x] **P3-026** Add iOS-specific optimizations

### Offline & PWA
- [x] **P3-027** Implement offline-first architecture
- [x] **P3-028** Add background sync for meal plans
- [x] **P3-029** Add push notifications for low stock alerts
- [x] **P3-030** Add push notifications for meal prep reminders
- [x] **P3-031** Handle IndexedDB quota exceeded gracefully
- [x] **P3-032** Add network retry logic with exponential backoff

### Dietary & Filtering
- [x] **P3-033** Use enhanced dataset dietary flags in UI
- [x] **P3-034** Add allergen filtering with warnings
- [x] **P3-035** Add cuisine standardization
- [x] **P3-036** Add multi-select dietary preferences
- [x] **P3-037** Add recipe difficulty filter
- [x] **P3-038** Add cooking time range filter

---

## 🏗️ PRIORITY 4 - Infrastructure & Quality

### Recipe Link Verification (COMPLETED)
- [x] **P4-101** Generate canonical recipe URLs from dataset
- [x] **P4-102** Add fallback search URLs for all recipes
- [x] **P4-103** Verify canonical URLs with HTTP 200 checks
- [x] **P4-104** Write verified-link datasets with status fields
- [x] **P4-105** Prefer verified_url in app link resolution
- [x] **P4-106** Remove Nutrition tab from navigation and content
- [x] **P4-107** Fix scroll-to-top on tab switch
- [x] **P4-108** Implement Google Shopping integration
- [x] **P4-109** Add seasoning suggestions in shopping list

### Build & Deploy
- [x] **P4-001** Set up CI/CD pipeline (GitHub Actions)
- [x] **P4-002** Add automated unit tests (Jest)
- [x] **P4-003** Add integration tests (Playwright)
- [x] **P4-004** Add dataset validation in build script
- [x] **P4-005** Create staging environment
- [x] **P4-006** Add Sentry error tracking
- [x] **P4-007** Add analytics (PostHog/Plausible)
- [x] **P4-008** Set up A/B testing framework
- [x] **P4-009** Minify/optimize build output (Vite/esbuild)
- [x] **P4-010** Add bundle size monitoring

### Data Quality
- [x] **P4-011** Implement gzip decompression client-side
- [x] **P4-012** Validate recipe schema on load
- [x] **P4-013** Add fallback for missing recipe data (verified_url + fallback_url)
- [x] **P4-014** Standardize cuisine/category values
- [x] **P4-015** Add recipe image CDN URLs
- [x] **P4-016** Add nutrition data validation

### Documentation
- [x] **P4-017** Update README with complete workflow
- [x] **P4-018** Document db.js API with JSDoc
- [x] **P4-019** Create architecture diagram
- [x] **P4-020** Add CONTRIBUTING.md guidelines
- [x] **P4-021** Create CHANGELOG.md
- [x] **P4-022** Document dataset schema
- [x] **P4-023** Add inline code comments for complex logic

### Advanced Features
- [x] **P4-024** Add user authentication (Firebase/Supabase)
- [x] **P4-025** Add cross-device sync
- [x] **P4-026** Add recipe submission/community features
- [x] **P4-027** Add waste reduction suggestions
- [x] **P4-028** Integrate grocery delivery APIs
- [x] **P4-029** Add cost tracking and budget optimization
- [x] **P4-030** Add meal history analytics

---

## 📊 Progress Tracking

**Total Tasks:** 140+  
**Completed:** 120  
**In Progress:** 0  
**Blocked:** 0  

### Current Sprint Focus
_To be defined - see active plan below_

---

## 🎯 Quick Wins (Low Effort, High Impact)

1. ~~Add loading spinner to dataset fetch~~ ✓
2. ~~Add error toasts instead of console.error~~ ✓
3. ~~Fix Enter key to submit ingredient form~~ ✓
4. ~~Add checkboxes to shopping list~~ ✓
5. ~~Fix XSS in template literals~~ ✓
6. ~~Add font-size: 16px to mobile inputs~~ ✓
7. ~~Add Esc to close modals~~ ✓
8. ~~Add success confirmation messages~~ ✓

---

## 🐛 Known Bugs

- ~~Ingredient autocomplete doesn't work on first page load~~ ✓
- ~~Liters unit not recognized in conversions~~ ✓
- ~~Macro progress bars never show red over-goal state~~ ✓
- ~~Meals badge doesn't update when pantry changes~~ ✓ (verified working)
- ~~Budget tips section never populates~~ ✓ (substring matching + expanded tips)
- ~~Calendar modal needs implementation~~ ✓ (stale — no reference in code)
- ~~Meal plan stats calculation incorrect with missing recipe data~~ ✓

---

## 💡 Ideas for Future Consideration

- ~~AI meal suggestions based on preferences~~ ✓ (Gemini AI integration implemented)
- ~~Voice input for adding ingredients~~ ✓ (speech-to-text implemented)
- Smart grocery store routing
- Recipe video tutorials integration
- Social features (share meal plans with family)
- Smart kitchen appliance integration
- Nutrition coaching/insights
- Meal photo journal
- Carbon footprint tracking
- Local farmer's market integration
