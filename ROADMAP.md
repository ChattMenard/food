# Main - Living Roadmap

> This document tracks the current state and future direction of the Main project.
> Last updated: April 20, 2026

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

```
www/js/
├── core/
│   └── appState.js          # In-memory state + pub-sub
├── data/
│   ├── db.js                # IndexedDB single source of truth
│   ├── dataManager.js       # Recipe/ingredient loading
│   ├── storageManager.js    # Storage utilities
│   ├── mutationQueue.js     # Durable mutation queue
│   ├── syncProcessor.js     # Background sync with retry
│   ├── migrationManager.js  # Schema evolution
│   ├── mutationHandlers.js  # Mutation type handlers
│   └── deviceSyncManager.js # Cross-device sync engine
├── logic/
│   ├── ingredientVectors.js # Recipe similarity (tested)
│   ├── recipeEngine.js      # Recipe operations
│   ├── costTracker.js       # Budget tracking (tested)
│   └── searchIndex.js       # Search functionality
├── features/
│   ├── pantry/              # Pantry management
│   │   ├── pantryManager.js
│   │   ├── leftoverTracker.js
│   │   ├── seasonalIngredients.js
│   │   └── wasteReduction.js
│   ├── meals/               # Meal planning
│   │   ├── mealPlanner.js
│   │   └── personalizedRecommendations.js
│   ├── plan/                # Meal plan templates
│   │   ├── budgetMealPlanner.js (tested)
│   │   ├── mealPrepPlanner.js (tested)
│   │   ├── mealPlanSharing.js
│   │   └── mealPlanTemplates.js
│   ├── nutrition/           # Nutrition tracking
│   │   ├── nutritionGoals.js (tested)
│   │   ├── nutritionDashboard.js
│   │   └── mealHistoryAnalytics.js
│   ├── grocery/             # Grocery delivery
│   │   └── groceryDelivery.js (tested)
│   └── preferencesManager.js
├── ai/
│   └── geminiAI.js          # AI with validation, caching, rate limiting
├── ui/
│   ├── uiManager.js         # UI coordination
│   └── components/          # Reusable UI components
│       └── NutritionDashboard.js
├── utils/
│   ├── ingredientParser.js  # Shared parsing logic (tested)
│   ├── networkRetry.js      # Network resilience
│   ├── cacheManager.js      # TTL + LRU caching
│   ├── backgroundSync.js    # Background sync utilities
│   ├── pushNotifications.js # Push notification utilities
│   ├── analytics.js         # Analytics tracking
│   ├── errorTracking.js     # Error monitoring
│   ├── abTesting.js         # A/B testing framework
│   ├── autoRefresh.js       # Auto-refresh functionality
│   ├── androidBackButton.js # Android back button handling
│   ├── deepLinking.js       # Deep link handling
│   ├── dietFilters.js       # Diet filtering utilities
│   ├── shareSheet.js        # Share sheet functionality
│   └── config.js            # Configuration
├── native/
│   ├── androidIntents.js    # Android intents integration
│   ├── nativePush.js        # Native push notifications
│   ├── siriShortcuts.js     # Siri shortcuts integration
│   └── widgetManager.js     # Widget management
├── auth/
│   ├── authManager.js       # Authentication management
│   └── googleAuthProvider.js # Google auth provider
├── advanced/
│   ├── authManager.js       # Advanced auth features
│   ├── barcodeScanner.js    # Barcode scanning
│   ├── communityRecipes.js # Community recipe features
│   ├── crossDeviceSync.js   # Cross-device sync
│   ├── groceryDelivery.js   # Grocery delivery integration
│   ├── pushNotifications.js # Advanced push notifications
│   ├── receiptScanner.js    # Receipt scanning
│   └── recipeImages.js     # Recipe image handling
└── __tests__/
    ├── budgetMealPlanner.test.js
    ├── costTracker.test.js
    ├── deviceSyncManager.test.js
    ├── groceryDelivery.test.js
    ├── ingredientParser.test.js
    ├── ingredientVectors.test.js
    ├── mealPrepPlanner.test.js
    ├── nutritionGoals.test.js
    └── pushNotifications.test.js
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

### Phase 6: Cross-Device Sync (Complete)
- [x] **Sync engine** with conflict resolution
  - `deviceSyncManager.js` with device registration and vector clocks
  - 5 strategies: last-write-wins, merge-arrays, max-value, min-value, manual
  - Data export/import for backup and migration
  - 35 unit tests
- [x] **Push notifications** for all major events
  - `pushNotifications.js` with 5 notification types
  - Meal prep, expiration, grocery, nutrition, sync complete
  - Service Worker integration for background delivery
  - 31 unit tests
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

### Phase 8: Community (Post-MVP)
- [ ] **Community recipes** (requires backend + auth)
- [ ] Recipe sharing and ratings
- [ ] Social features

---

## 📝 Notes

- All high-priority structural work is complete
- Codebase is now maintainable and extensible
- Project structure: 70 JS files across 12 directories (core, data, logic, features, ai, ui, utils, native, auth, advanced, __tests__)
- Test coverage: 9 comprehensive test suites covering core features (budgetMealPlanner, costTracker, deviceSyncManager, groceryDelivery, ingredientParser, ingredientVectors, mealPrepPlanner, nutritionGoals, pushNotifications)
- AI validation prevents malformed responses
- Phase 4 (resilience) complete - system handles stress
- Phase 5 (features) complete - comprehensive feature expansion with 11 major features
- Phase 6 (sync) complete - cross-device sync + push notifications + auth foundation
- Phase 7 (native platform) complete - iOS/Android widgets, Siri shortcuts, Google Assistant, native push
- Native platform integration with dedicated native/ and auth/ directories
- Advanced features directory with SaaS-ready modules (barcode scanning, receipt scanning, community recipes)

---

*This is a living document. Update as the project evolves.*
