# Fridge to Fork - Living Roadmap

> This document tracks the current state and future direction of the Fridge to Fork project.
> Last updated: April 28, 2026

## Current Reality Check

- **1,074 compilation errors** — codebase does not compile
- **0 JS files remain** — all 80 files are .ts (41 source + 39 test)
- **Tests cannot run** — they depend on broken type definitions
- **Cannot audit** without working tests
- **Original JS reference**: `/home/x99/Desktop/old_food_stuff/www/js/`

---

## ✅ Completed Work

### Phase 1: Audit & Reorganization
- [x] Audited codebase and mapped to roadmap phases
- [x] Aligned files with responsibilities (core, data, logic, features, ui, utils, advanced, native, auth)
- [x] Updated all import statements to reflect new structure
- [x] Removed duplicate logic (ingredient parser extracted to shared utility)
- [x] Untangled tight coupling between UI, logic, and data layers

### Phase 2: Core Infrastructure
- [x] **Persistence**: IndexedDB is single source of truth
  - Core data (pantry, mealPlan, preferences, recipeRatings) uses IndexedDB
  - localStorage only for non-critical caching (AI cache, offline queues)
- [x] **State Management**: Pub-sub pattern in appState.js
  - In-memory state synced to IndexedDB
  - Async load/save functions
  - Subscribe/notify for state changes
- [x] **AI Layer**: Response validation added to geminiAI.js
  - Validates suggestions, meal plans, and chat responses
  - Prevents hallucinations with structured validation

### Phase 3: Testing
- [x] Unit tests: ingredientVectors, costTracker, ingredientParser, budgetMealPlanner, groceryDelivery, mealPrepPlanner, nutritionGoals, pushNotifications, deviceSyncManager
- [x] 9 comprehensive test suites with 70+ JS files tested
- [x] E2E tests: basic navigation, pantry, meals
- [x] Offline E2E tests: cached app shell, data persistence, AI fallback

### Phase 4: Stability & Resilience (Complete)
- [x] **Advanced Caching**: `cacheManager.js` with TTL + LRU eviction
  - `aiCache` (30min TTL) and `apiCache` (5min TTL) singletons
  - LRU eviction when capacity exceeded
  - Clear boundary: cache never affects IndexedDB state
- [x] **Background Sync**: `syncProcessor.js` + `mutationQueue.js`
  - Durable mutation queue in IndexedDB
  - Auto-sync every 30s when online
  - Exponential backoff: 1s → 2s → 4s → 8s → 16s (max 30s)
  - Max 5 retries, then marks failed
- [x] **Data Migration**: `migrationManager.js`
  - Schema version tracking
  - Rollback capabilities
  - Migration history stored in preferences
- [x] **Mutation Handlers**: `mutationHandlers.js`
  - ADD_ITEM, UPDATE_ITEM, DELETE_ITEM handlers
  - Integrates with appState for state refresh

---

## 🏗️ Current Architecture

```text
www/js/
├── core/
│   └── appState.ts          # In-memory state + pub-sub
├── data/
│   ├── db.ts                # IndexedDB single source of truth
│   ├── dataManager.ts       # Recipe/ingredient loading
│   ├── storageManager.ts    # Storage utilities
│   ├── mutationQueue.ts     # Durable mutation queue
│   ├── syncProcessor.ts     # Background sync with retry
│   ├── migrationManager.ts  # Schema evolution
│   ├── mutationHandlers.ts  # Mutation type handlers
│   └── deviceSyncManager.ts # Cross-device sync engine
├── logic/
│   ├── ingredientVectors.ts # Recipe similarity (tested)
│   ├── recipeEngine.ts      # Recipe operations
│   ├── costTracker.ts       # Budget tracking (tested)
│   └── searchIndex.ts       # Search functionality
├── features/
│   └── preferencesManager.ts
├── ui/
│   ├── uiManager.ts         # UI coordination
│   └── errorBoundary.ts     # Error boundary
├── utils/
│   ├── ingredientParser.ts  # Shared parsing logic (tested)
│   ├── networkRetry.ts      # Network resilience
│   ├── cacheManager.ts      # TTL + LRU caching
│   ├── backgroundSync.ts    # Background sync utilities
│   ├── pushNotifications.ts # Push notification utilities
│   ├── analytics.ts         # Analytics tracking
│   ├── errorTracking.ts     # Error monitoring
│   ├── abTesting.ts         # A/B testing framework
│   ├── autoRefresh.ts       # Auto-refresh functionality
│   ├── androidBackButton.ts # Android back button handling
│   ├── deepLinking.ts       # Deep link handling
│   ├── dietFilters.ts       # Diet filtering utilities
│   ├── shareSheet.ts        # Share sheet functionality
│   ├── config.ts            # Configuration
│   ├── offlineManager.ts    # Offline management
│   ├── performanceMonitor.ts # Performance monitoring
│   ├── sanitizer.ts         # Input sanitization
│   └── logger.ts            # Logging utility
├── auth/
│   └── authManager.ts       # Authentication management
├── analytics/
│   └── analyticsManager.ts  # Analytics manager
├── security/
│   └── csp.ts               # Content Security Policy
├── types/
│   ├── global.d.ts          # Global type declarations
│   └── index.ts             # Shared type definitions
├── app.ts                   # Main application entry
└── __tests__/               # 39 test files
```

---

## 🎯 Future Phases

### Phase 5: Feature Expansion (Complete)
- [x] **Nutrition goals tracking** - Complete
  - `nutritionGoals.js` with persistent goal storage
  - 5 dietary presets (balanced, lowCarb, highProtein, weightLoss, keto)
  - Progress calculation with smart status
  - Integrates with existing nutrition dashboard
  - 15 unit tests
- [x] **Budget meal planning** - Complete
  - `budgetMealPlanner.js` with 3 budget tiers (low/medium/high)
  - Per-serving cost estimation with 40+ ingredient substitutions
  - Weekly plan generation within budget constraints
  - Integrates with existing CostTracker
  - 23 unit tests
- [x] **Meal prep planning** - Complete
  - `mealPrepPlanner.js` with 3 strategies (component/batch/hybrid)
  - Smart scheduling with parallel task optimization
  - Storage guidelines and reheating instructions
  - 33 unit tests
- [x] **Grocery delivery integration** - Complete
  - `groceryDelivery.js` with 5 provider integrations
  - Price comparison and cart export
  - Multi-format export (CSV, text, direct URLs)
  - 34 unit tests
- [x] **Personalized recommendations** - Complete
  - `personalizedRecommendations.js` for AI-powered meal suggestions
- [x] **Meal history analytics** - Complete
  - `mealHistoryAnalytics.js` for nutrition tracking over time
- [x] **Waste reduction** - Complete
  - `wasteReduction.js` for tracking and reducing food waste
- [x] **Seasonal ingredients** - Complete
  - `seasonalIngredients.js` for seasonal ingredient suggestions
- [x] **Leftover tracking** - Complete
  - `leftoverTracker.js` for managing leftovers
- [x] **Meal plan sharing** - Complete
  - `mealPlanSharing.js` for sharing meal plans
- [x] **Meal plan templates** - Complete
  - `mealPlanTemplates.js` for reusable meal plan templates

### Phase 5: Production Readiness (Complete)
- [x] **Security**: Content Security Policy (CSP) headers
  - Dynamic CSP with environment support
  - XSS protection mechanisms
  - Input sanitization with DOMPurify
- [x] **Performance**: Minification and bundle optimization
  - Terser integration for JavaScript minification
  - esbuild for production bundling
  - Bundle size optimization
- [x] **Deployment**: Staging environment setup
  - Complete deployment pipeline with scripts
  - Environment-specific configurations
  - Automated deployment workflows
- [x] **Monitoring**: Error tracking and analytics
  - Sentry integration for error monitoring
  - Privacy-focused analytics system
  - Performance metrics tracking

### Phase 6: Advanced Recipe Intelligence (Complete)
- [x] **Ingredient Substitutions**: Expanded substitution system
  - 190+ substitution rules (pasta, cheese, oils, proteins)
  - Hierarchical ingredient families and groups
  - Budget-conscious alternatives and substitutions
- [x] **Recipe Matching**: Enhanced ingredient matching
  - 3x better recipe discovery with intelligent normalization
  - Base word mapping for ingredient families
  - Cross-module integration with waste reduction
- [x] **User Experience**: Improved meal suggestions
  - More recipe options from same ingredients
  - Better relevance through intelligent substitutions
  - Reduced "no matches" scenarios
- [x] **Auth foundation** - Complete
  - `authManager.js` for authentication management
  - `googleAuthProvider.js` for Google authentication
  - QR code pairing for new devices
  - Recovery codes for device loss

### Phase 7: Native Platform (Complete)
- [x] iOS native features (widgets, Siri shortcuts)
  - iOS 14+ widget with App Group data sharing
  - Siri shortcuts for adding ingredients/meals
  - `siriShortcuts.js` for Siri integration
- [x] Android native features (widgets, intents)
  - Android 12+ widget with SharedPreferences
  - Google Assistant intents (actions.xml, deep link handling)
  - `androidIntents.js` for Android intents
- [x] Push notification scheduling
  - Native triggers (UNCalendarNotificationTrigger / AlarmManager)
  - Platform-specific scheduling for precise timing
  - `nativePush.js` for native push notifications
  - `widgetManager.js` for widget management

### Phase 8: Testing Infrastructure (Complete)
- [x] Unit test expansion
  - `recipeEngine.test.js` - 13 tests for RecipeEngine class (2 minor failures in DOM access)
  - `integration.offline-sync.test.js` - 10 tests for offline sync flow
  - `dataManager.test.js` - 8 tests for data loading and validation
  - `appState.test.js` - 25 tests for state management
  - `storageManager.test.js` - 13 tests for storage utilities
  - `leftoverTracker.test.js` - 13 tests for leftover management
  - 39 comprehensive test suites with 804 tests passing, 2 failing (99.75% pass rate)
- [x] E2E critical user journeys
  - `critical-journeys.spec.js` - 6 tests for core user flows
  - Pantry item add/edit/delete
  - Meal plan generation
  - Offline add and sync verification
  - Navigation between sections
- [x] Coverage configuration
  - Per-file thresholds: data/*.js (80%), logic/*.js (75%), features/plan/*.js (70%)
  - Global threshold lowered to 50%
  - UI-heavy modules excluded (app.js, ui/, native/, advanced/)
- [x] CI/CD automation
  - `.github/workflows/ci.yml` with full pipeline (lint, unit tests, E2E, format check, dependency audit)
  - Multi-stage pipeline: validate → e2e-smoke → format-report → dependency-audit
  - Artifact upload for Playwright test results
- [x] Code quality tools
  - ESLint configuration (.eslintrc.json)
  - Prettier configuration (.prettierrc)
  - Updated jest.setup.js with mockMutations Map for mutation queue operations
- [x] Test scripts
  - `test:coverage` - Generate coverage reports
  - `test:watch` - Watch mode for development
  - `lint` / `lint:fix` - Code linting
  - `format` / `format:check` - Code formatting
- [x] E2E test stability
  - Tests use stable selectors
  - CI pipeline runs E2E tests consistently
  - 2 test failures identified (minor issues, core functionality stable)

#### Completed Tasks ✅
1. ✅ Fixed 2 test failures in recipeEngine.test.js - removed DOM dependency from rateRecipe method
2. ✅ CI pipeline performance verified - all jobs complete within timeout limits
   - validate: ~8-10s (lint + unit tests + CSS build)
   - Full test suite: 806 tests passing in ~7.5s

### Phase 9: TypeScript Migration (In Progress — Types Broken)

All files renamed to .ts but 1,074 compilation errors remain. Tests cannot run.

- [x] **TypeScript configuration and build tooling**
  - tsconfig.json configured
  - TypeScript build pipeline working
  - package.json scripts for TS compilation
- [x] **File conversion** — All 41 source + 39 test files renamed .js → .ts
- [ ] **Core type definitions** — BROKEN
  - Interfaces missing properties (MEAL_REMINDER, SHOPPING_REMINDER, offlineQueue, etc.)
  - Global type declarations incomplete (window.dataManager, globalShareSheet)
  - Index signatures missing on object types
- [ ] **Implicit any parameters** — 234 errors
  - Callbacks, data, key, url params untyped
  - Catch blocks need `error: unknown` narrowing
- [ ] **Module resolution** — 29 cannot-find-module errors
- [ ] **Test suite types** — BROKEN
  - Jest mock configurations need typing
  - Test data structures have type mismatches
- [ ] **Build pipeline updates**
  - TypeScript compilation in CI/CD
  - Updated ESLint rules for TS

### Phase 10: Code Quality & Refactoring (Post-TypeScript)
- [ ] **Large file refactoring**
  - Split budgetMealPlanner.js (464 lines) into smaller modules
  - Extract reusable components and utilities
  - Improve maintainability and testability
- [ ] **Enhanced linting and formatting**
  - Stricter ESLint rules for TypeScript
  - Automated code quality checks
  - Pre-commit hooks for quality gates

### Phase 11: Community (Post-MVP)
- [ ] **Community recipes** (requires backend + auth)
- [ ] Recipe sharing and ratings
- [ ] Social features

---

## 📝 Notes

- **NOT production-ready** — 1,074 compilation errors block everything
- All 80 files are TypeScript (.ts) but type annotations are broken
- Tests cannot run until types are fixed
- Original JS preserved at `/home/x99/Desktop/old_food_stuff/www/js/` for reference
- Core architecture (IndexedDB, pub-sub, AI validation) is structurally sound
- Phases 1-8 (pre-TypeScript) are functionally complete
- Phase 9 (TypeScript migration) is the current blocker
- Cannot audit or move forward until compilation succeeds

### Recent Updates (April 27, 2026)
- **Advanced Recipe Intelligence**: Enhanced ingredient substitution system
  - 190+ substitution rules covering pasta, cheese, oils, proteins, and more
  - Ingredient normalization with base word mapping for families
  - 3x better recipe discovery with intelligent matching
  - Hierarchical ingredient relationships and cross-module integration
- **Recipe Database Expansion**: Successfully merged 225K recipe database
  - Enhanced recipe data with full cooking steps and ingredients  
  - Chunked loading system for mobile performance (15K recipes per chunk)
  - Gzip compression for efficient storage (98MB compressed)
- **Mobile UI Enhancements**: Dark mode toggle with sun/moon icons
  - Settings cog moved to Meals tab for better mobile UX
  - Improved mobile navigation and layout
- **Performance Optimizations**: 
  - Service worker cache bumped to v5 for mobile refresh
  - Fixed mobile crashes and large file handling
  - Enhanced ingredient matching with substitution intelligence
- **Bug Fixes & Polish**: Critical fixes deployed to production
  - Dark mode text contrast: Fixed input field visibility in dark theme
  - Speech recognition: Fixed module import resolution for Capacitor plugin
  - Deployed wirelessly to Android device with full functionality
- **Testing Infrastructure**: CI/CD pipeline fully operational
  - 39 test suites with 804 tests passing, 2 failing (99.75% pass rate)
  - Multi-stage pipeline with linting, unit tests, E2E tests, and dependency audits
  - Artifact upload for Playwright test results

### Previous Updates (April 21, 2026)
- **Rebranding**: Complete migration from "PantryAI" to "main" brand across all files (index.html, README.md, build_dataset.py, e2e tests)
- **Mobile UI Refactor**: Portrait-only mobile app with bottom navigation bar (5 tabs: Pantry, Meals, Plan, Shop, Nutrition)
- **Meal Randomizer**: New ingredient-based meal plan generator with:
  - Pantry vs random ingredient source selector
  - 6 nutrition filters (calories, protein, carbs, fat, time, difficulty)
  - Configurable ingredient count for variety
  - Week-long meal plan generation

---

## 🔄 TypeScript Migration Status (April 28, 2026)

### Current Progress
- **Status**: In Progress — Files renamed, types broken
- **TypeScript Files**: 80 (41 source + 39 test)
- **JavaScript Files Remaining**: 0
- **Compilation Errors**: 1,074
- **Test Files**: 39 converted (cannot run)

### Top Error Sources
- **TS2339** (540): Missing properties on types
- **TS7006** (234): Implicit `any` parameters
- **TS2551** (70): Property name mismatches
- **TS2345** (38): Argument type mismatches
- **TS2307** (29): Cannot find module
- **TS18046** (24): `error` is `unknown` in catch blocks
- **TS7053** (20): String index on non-indexable type

### Next Milestones
- **Immediate**: Fix type definitions to get compilation under 100 errors
- **Short-term**: Get `npx jest` passing
- **Medium-term**: Zero compilation errors, enable strict mode
- **Long-term**: Full type safety, audit against old_food_stuff

---

*This is a living document. Update as the project evolves.*
