# Fridge to Fork - Development TODO

## CURRENT STATUS (April 28, 2026 — Post-Audit Updated)

**Status**: Dependencies clean; Google Auth migrated; TypeScript build errors remain
**TypeScript Files**: 84 (core, data, utils, auth, analytics, ui, tests)
**JavaScript Files**: 18 (feature modules intentionally left in JS)
**Build Status**: ❌ FAILS (429 TypeScript errors across 45 files - pre-existing, unrelated to Google Auth)
**Lint Status**: ⚠️ Minor warnings in openFoodFactsDemo.js
**Tests Status**: ✅ Google Auth tests passing (4/4); other tests blocked by TypeScript errors
**npm install**: ✅ CLEAN (no peer dependency conflicts)

### 🎯 Recent Major Changes

- ✅ **Google Auth Migration**: Migrated from @codetrix-studio/capacitor-google-auth to @capgo/capacitor-social-login@8.3.20
  - Compatible with Capacitor 8
  - Updated all source files, tests, and type declarations
  - Google Auth tests passing (4/4)
  - npm install now clean without --legacy-peer-deps
- ✅ **Syntax Fixes**: Fixed 3 syntax errors in openFoodFactsDemo.js (missing parentheses)
- ✅ **CostTracker Removal**: Completely removed from codebase, replaced with simple cost estimation
- ✅ **Recipe Cost Classification**: New C/N/F tier system for 225k recipes
- ✅ **Ingredient Dictionary**: 110+ ingredients classified by cost tier
- ✅ **Fancy Technique Detection**: 17 restaurant-style cooking techniques identified
- ✅ **Batch Processing**: Scalable system for large recipe datasets

### ⚠️ Current Critical Issues (April 28 Post-Audit)

#### 1. TypeScript Build Errors (Blocks build)

- **429 TypeScript errors across 45 files** - pre-existing, unrelated to Google Auth migration
- Concentrated in test files, feature modules, and utility files
- Examples: missing properties, type mismatches, implicit any parameters
- **Action**: Systematic type fixing across affected files (estimated 4-8 hours)

### 📌 Immediate Priorities (April 28, 2026 - Updated)

**✅ COMPLETED (Today):**

- ✅ **Google Auth Migration**: Migrated to @capgo/capacitor-social-login@8.3.20
  - Updated package.json, googleAuthProvider.ts, global.d.ts, and test file
  - Successfully ran npm install (no peer dependency conflicts)
  - Successfully ran npx cap sync (Android/iOS configs regenerated)
  - Google Auth tests passing (4/4)
- ✅ **Syntax Fixes**: Fixed 3 syntax errors in openFoodFactsDemo.js
- ✅ **Dependency Resolution**: npm install now works without --legacy-peer-deps

**🎯 CURRENT PRIORITIES:**

1. **Fix 429 TypeScript build errors across 45 files** (BLOCKING BUILD)
   - Pre-existing type errors unrelated to Google Auth migration
   - Concentrated in test files, feature modules, and utility files
   - Estimated: 4-8 hours
   - Examples: missing properties, type mismatches, implicit any parameters

---

## PRIORITY: Fix Compilation Errors

### Phase 1: Fix Type Definitions (Unblocks everything)

These fixes cascade — fixing shared types resolves errors across many files.

1. [ ] **Fix notification type definitions** — Add `MEAL_REMINDER`, `SHOPPING_REMINDER` and other missing notification schedule properties (~39 errors across multiple files)
2. [ ] **Fix OfflineManager types** — Add `offlineQueue`, `isOnline`, `queue` properties (~32 errors)
3. [ ] **Fix DeviceSyncManager types** — Add `deviceIdData`, missing methods (~68 errors across source + tests)
4. [ ] **Fix AnalyticsManager types** — Add `eventQueue`, missing methods (~93 errors)
5. [ ] **Fix CostTracker types** — Add `trackSpending`, missing methods (~38 errors in tests)
6. [ ] **Fix PushNotificationManager types** — Add `enableType`, missing properties (~28 errors)
7. [ ] **Fix AndroidBackButtonHandler types** — Add `history` property (~9 errors)
8. [ ] **Fix global type declarations** — `window.dataManager`, `globalShareSheet` (~13 errors)

### Phase 2: Fix Implicit Any Parameters (~234 errors)

9. [ ] **Type all callback parameters** — `callback`, `data`, `key`, `url` params
10. [ ] **Type catch block errors** — Add `error: unknown` typing with narrowing
11. [ ] **Type index signatures** — Fix string indexing on `{}` types

### Phase 3: Fix Module Resolution (~29 errors)

12. [ ] **Fix missing module imports** — Cannot find module errors
13. [ ] **Fix import paths** — Ensure .ts files resolve correctly

### Phase 4: Fix Test Files

14. [ ] **Fix Jest mock typing** — Standardize mock configurations
15. [ ] **Fix test data structures** — Type mismatches in test fixtures
16. [ ] **Verify tests actually run** — Get `npx jest` passing

---

## MIGRATION PROGRESS

### What's Done
- ✅ All 41 source files renamed from .js → .ts
- ✅ All 39 test files renamed from .js → .ts
- ✅ tsconfig.json configured
- ✅ Jest configured for TypeScript (ts-jest)
- ✅ Babel configured for test transformation
- ✅ Core architecture stable (IndexedDB, pub-sub, AI validation)
- ✅ Features implemented (nutrition, budget, meal prep, grocery delivery, etc.)
- ✅ CI/CD pipeline exists (GitHub Actions)
- ✅ E2E test infrastructure (Playwright)
- ✅ Original JS preserved in `old_food_stuff` for reference

### What's NOT Done
- ❌ Type annotations are broken (1,074 errors)
- ❌ Tests cannot run (depend on broken types)
- ❌ Cannot audit codebase without working tests
- ❌ Not production-ready until compilation succeeds

---

## NEXT STEPS (After Compilation Fixed)

1. Get tests running (`npx jest` green)
2. Audit codebase against original `old_food_stuff` JS
3. Enable strict TypeScript mode
4. Performance optimization pass

---

## COMPLETED WORK (Pre-TypeScript)

- Security: CSP headers, DOMPurify sanitization, XSS protection, security audit
- Performance: Terser + esbuild minification, bundle optimization, caching
- PWA: Service worker, offline support, manifest, background sync, push notifications
- Accessibility: ARIA labels, keyboard navigation, screen reader support
- DevOps: CI/CD pipeline (GitHub Actions), staging environment, backup/recovery
- Features: Nutrition goals, budget meals, meal prep, grocery delivery, personalized recs, waste reduction, seasonal ingredients, leftover tracking, meal plan sharing/templates
- Recipe intelligence: 190+ substitution rules, ingredient normalization, 3x better matching
- Native: iOS widgets + Siri shortcuts, Android widgets + intents, native push
- Auth: authManager, Google auth, QR pairing, recovery codes

---

## Architecture

```
UI → appState → db.ts → IndexedDB
        ↓
     pub-sub
```

```
www/js/
├── core/        # State layer (appState.ts)
├── data/        # Persistence + loading (db, dataManager, syncProcessor, etc.)
├── logic/       # Pure computation (recipeEngine, costTracker, ingredientVectors)
├── features/    # Domain modules (pantry, meals, plan, nutrition, grocery)
├── ai/          # External intelligence layer (geminiAI)
├── ui/          # Rendering + interaction (uiManager, errorBoundary)
├── utils/       # Shared helpers (ingredientParser, cacheManager, networkRetry, etc.)
├── native/      # Native platform integration (androidIntents, siriShortcuts)
├── auth/        # Authentication (authManager, googleAuthProvider)
├── analytics/   # Analytics tracking (analyticsManager)
├── security/    # Security (csp)
├── types/       # Type definitions (global.d.ts, index.ts)
└── __tests__/   # Test suites (39 files)
```

## System Principles

- IndexedDB is the only source of truth
- State is centralized and reactive (pub-sub)
- UI never directly accesses persistence
- Logic is pure and testable
- AI is assistive, not authoritative

---

*This is a living document. Update as the project evolves.*
