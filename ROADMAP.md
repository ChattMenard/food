# Main - Living Roadmap

> This document tracks the current state and future direction of the Main project.
> Last updated: April 2026

---

## ✅ Completed Work

### Phase 1: Audit & Reorganization
- [x] Audited codebase and mapped to roadmap phases
- [x] Aligned files with responsibilities (core, data, logic, features, ui, utils, advanced)
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
- [x] Unit tests: ingredientVectors, costTracker, ingredientParser
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
│   └── mutationHandlers.js  # Mutation type handlers
├── logic/
│   ├── ingredientVectors.js # Recipe similarity (tested)
│   ├── recipeEngine.js      # Recipe operations
│   ├── costTracker.js       # Budget tracking (tested)
│   └── searchIndex.js       # Search functionality
├── features/
│   ├── pantry/              # Pantry management
│   ├── meals/               # Meal planning
│   ├── plan/                # Meal plan templates
│   └── nutrition/           # Nutrition tracking
├── ai/
│   └── geminiAI.js          # AI with validation, caching, rate limiting
├── ui/
│   ├── uiManager.js         # UI coordination
│   └── components/          # Reusable UI components
├── utils/
│   ├── ingredientParser.js  # Shared parsing logic
│   ├── networkRetry.js      # Network resilience
│   ├── cacheManager.js      # TTL + LRU caching
│   └── ...                  # Other utilities
└── advanced/
    └── ...                  # SaaS features
```

---

## 🎯 Future Phases

### Phase 5: Feature Expansion (In Progress)
- [x] **Nutrition goals tracking** - Complete
  - `nutritionGoals.js` with persistent goal storage
  - 5 dietary presets (balanced, lowCarb, highProtein, weightLoss, keto)
  - Progress calculation with smart status
  - Integrates with existing nutrition dashboard
- [x] **Budget meal planning** - Complete
  - `budgetMealPlanner.js` with 3 budget tiers (low/medium/high)
  - Per-serving cost estimation with 40+ ingredient substitutions
  - Weekly plan generation within budget constraints
  - Integrates with existing CostTracker
- [x] **Meal prep planning** - Complete
  - `mealPrepPlanner.js` with 3 strategies (component/batch/hybrid)
  - Smart scheduling with parallel task optimization
  - Storage guidelines and reheating instructions
- [x] **Grocery delivery integration** - Complete
  - `groceryDelivery.js` with 5 provider integrations
  - Price comparison and cart export
  - Multi-format export (CSV, text, direct URLs)
### Phase 6: Cross-Device Sync (Complete)
- [x] **Sync engine** with conflict resolution
  - `deviceSyncManager.js` with device registration and vector clocks
  - 5 strategies: last-write-wins, merge-arrays, max-value, min-value, manual
  - Data export/import for backup and migration
- [x] **Push notifications** for all major events
  - `pushNotifications.js` with 5 notification types
  - Meal prep, expiration, grocery, nutrition, sync complete
  - Service Worker integration for background delivery
- [ ] **Auth foundation** (deferred to Phase 7)
  - QR code pairing for new devices
  - Recovery codes for device loss

### Phase 7: Native Platform
- [ ] iOS native features (widgets, Siri shortcuts)
- [ ] Android native features (widgets, intents)
- [ ] Push notification scheduling

### Phase 8: Community (Post-MVP)
- [ ] **Community recipes** (requires backend + auth)
- [ ] Recipe sharing and ratings
- [ ] Social features

---

## 📝 Notes

- All high-priority structural work is complete
- Codebase is now maintainable and extensible
- Test coverage: 279 unit tests + E2E (including offline)
- AI validation prevents malformed responses
- Phase 4 (resilience) complete - system handles stress
- Phase 5 (features) complete
- Phase 6 (sync) complete - cross-device sync + push notifications

---

*This is a living document. Update as the project evolves.*
