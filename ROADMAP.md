# Main - Living Roadmap

Last updated: 2026-04-26

This roadmap is grounded in the current repository state after audit. Keep `TODO.md` as the execution queue and this file as the phase-level plan.

## Product direction

Main is a smart meal planning PWA with Capacitor-based native packaging. The durable product bet is:

1. reliable offline-first pantry and meal planning;
2. deterministic local recipe matching and shopping-list generation;
3. optional AI assistance that never replaces local data integrity;
4. native mobile polish after web/PWA reliability is proven.

## Audit baseline

### Confirmed architecture

```text
www/js/
├── core/        # State layer
├── data/        # IndexedDB, migrations, queues, sync processors
├── logic/       # Recipe scoring, parsing, search, cost logic
├── features/    # Pantry, meals, planning, nutrition, grocery, preferences
├── ai/          # Gemini-backed assistant layer
├── ui/          # UI coordination and components
├── utils/       # Shared platform/caching/network helpers
├── native/      # Capacitor native integrations
├── auth/        # Authentication
├── advanced/    # Incubating SaaS/native/community features
└── __tests__/   # Unit and integration tests
```

### Confirmed tooling

- `npm` scripts exist for data build, Jest, Playwright, ESLint, Prettier, Capacitor sync, and native builds.
- GitHub Actions and GitLab CI configs exist.
- Playwright is configured to serve `www/` on port 8080.
- Jest is configured for `jsdom` with module aliases and coverage thresholds.

### Key risks found

- Clean dependency installation is blocked by a Capacitor peer dependency conflict.
- CI currently depends on `npm ci`, so CI health is tied to the dependency conflict.
- `node_modules/` is tracked in git.
- `npm audit --production` reports one high-severity vulnerability in `@xmldom/xmldom`.
- Offline E2E tests use port 3000 while the app/test server uses port 8080.
- Service worker registration was not found in app startup code.
- Some advanced modules reference IndexedDB stores that are not created by the current DB upgrade path.
- Several dynamic rendering paths use `innerHTML` with data that may become user- or AI-sourced.
- Native Android scripts contain machine-specific absolute paths.

---

## Phase 1: Dependency and CI stabilization

Goal: every contributor and CI runner can install, lint, test, and audit the repo from a clean checkout.

### Work

- Resolve the `@codetrix-studio/capacitor-google-auth` and Capacitor 8 peer conflict.
- Remove tracked `node_modules/` from git.
- Pick and document a supported Node version for local development and CI.
- Update GitHub Actions to current action versions.
- Make `npm ci` the only install path in CI.
- Replace deprecated `npm audit --production` with `npm audit --omit=dev`.
- Resolve or document the `@xmldom/xmldom` high-severity audit finding.

### Exit criteria

- `npm ci` succeeds without `--legacy-peer-deps`.
- `npm run lint`, `npm run test -- --runInBand`, and `npm audit --omit=dev` pass locally.
- GitHub Actions passes on pull requests.

---

## Phase 2: Test reliability and offline correctness

Goal: core user journeys are stable in automated tests and offline mode is real, not aspirational.

### Work

- Add stable `data-testid` attributes for primary navigation, pantry add flow, meal cards, shopping list, and AI chat controls.
- Update Playwright specs to use `getByTestId()`.
- Fix `offline.spec.js` to use the Playwright `baseURL` instead of hard-coded port 3000.
- Register the service worker from app startup.
- Add test isolation for IndexedDB/cache state between E2E cases.
- Run E2E three consecutive times before marking the suite stable.

### Exit criteria

- `npm run test:e2e` passes three times consecutively.
- Offline cached app shell and persisted pantry data are covered by Playwright.
- README documents the verified local test workflow.

---

## Phase 3: Data model and backend contracts

Goal: advanced features have explicit data stores and API contracts before more product work is layered on them.

### Work

- Add missing IndexedDB stores/migrations for community recipe and saved recipe data.
- Define sync API contracts for pantry, preferences, meal plans, recipe ratings, and conflict resolution.
- Define push token registration/update/delete contracts.
- Define community recipe submission/moderation/reporting contracts.
- Decide which features remain local-first and which require authenticated backend state.

### Exit criteria

- Every shipped module references only stores that exist in the DB schema.
- Placeholder server methods are backed by documented contracts or hidden behind feature flags.
- Sync/community/push tests cover happy path and failure path behavior.

---

## Phase 4: Security, privacy, and rendering hardening

Goal: user, AI, and recipe data are safely rendered and sensitive config is not exposed accidentally.

### Work

- Replace unsafe dynamic HTML rendering with DOM construction or escaping helpers.
- Review AI responses before rendering and preserve validation boundaries.
- Move OAuth/client configuration to documented environment/build config.
- Review analytics/session identifiers stored in localStorage.
- Add a security checklist to release docs.

### Exit criteria

- User- and AI-sourced strings are escaped before rendering.
- No secrets or private tokens are committed.
- Auth/session/cache persistence choices are documented.

---

## Phase 5: Native release readiness

Goal: Android/iOS builds are reproducible outside one developer machine.

### Work

- Replace hard-coded Android Studio/JDK/SDK paths with environment variables or local config.
- Document Android and iOS build prerequisites.
- Add native smoke-test steps for Android and iOS.
- Validate Capacitor sync/build after dependency stabilization.
- Confirm native push, widgets, Siri shortcuts, Android intents, and Google Assistant features on device or emulator.

### Exit criteria

- Native scripts run on a fresh configured machine.
- Android debug build is reproducible.
- iOS build instructions are complete for macOS maintainers.

---

## Phase 6: Product expansion

Goal: add user-visible value only after install, CI, tests, and data contracts are stable.

### Candidate work

- Backend-backed cross-device sync.
- Community recipe discovery and moderation.
- Grocery provider integrations beyond export links.
- Barcode/receipt scanning refinement.
- Nutrition goals and meal-history insights.
- Cooking mode with voice/native assistant integrations.
- Gradual TypeScript adoption for core/data/logic modules.

### Exit criteria

- Each expansion feature has a design note, data contract, tests, and rollback path before implementation.
