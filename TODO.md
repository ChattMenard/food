# TODO

Last audited: 2026-04-26

## Audit scope

- Reviewed project docs, package scripts, CI workflows, app structure, tests, and obvious dependency/security risks.
- No product code was changed during this audit.
- Existing roadmap/todo claims were reconciled with the current repository state.

## Current state

- The app is a static PWA/Capacitor meal planner served from `www/`.
- Core app state is IndexedDB-backed via `www/js/data/db.js` and `www/js/core/appState.js`.
- The JavaScript app is organized into `core`, `data`, `logic`, `features`, `ai`, `ui`, `utils`, `native`, `auth`, and `advanced` modules.
- The repository currently has 75 tracked JavaScript files under `www/js`, including 14 unit/integration test files, plus 2 Playwright E2E specs.
- `.github/workflows/ci.yml` already exists, so older notes saying CI is blocked by missing `workflow` OAuth scope are stale.

## Highest-priority work

| Priority | Task | Why it matters | Acceptance criteria |
| --- | --- | --- | --- |
| P0 | Fix npm dependency resolution | `npm install` and `npm ci` fail unless `--legacy-peer-deps` is used because `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4` peers on Capacitor 6 while the app uses Capacitor 8. | A clean `npm ci` succeeds without workaround flags on a fresh checkout. |
| P0 | Make CI installable and current | The current GitHub Actions workflow uses `npm ci`, so it is likely blocked by the same peer conflict. It also uses older `checkout`, `setup-node`, and `upload-artifact` action versions. | CI installs dependencies, runs lint/tests/build/security jobs, and uses supported action versions. |
| P0 | Resolve dependency audit finding | `npm audit --production` reports 1 high-severity vulnerability in `@xmldom/xmldom`. | `npm audit --omit=dev` passes or the remaining finding is explicitly documented as accepted with a mitigation. |
| P0 | Remove committed dependency artifacts | `node_modules` is tracked in git, which makes reviews noisy and risks stale/broken installs. | `node_modules/` is removed from version control while `package-lock.json` remains the source of dependency truth. |
| P1 | Stabilize Playwright E2E tests | E2E selectors still rely on text/id selectors, and `offline.spec.js` navigates to `http://localhost:3000` while Playwright is configured for port 8080. | Add stable `data-testid` selectors, update specs to use them, use `page.goto('/')`, and pass `npm run test:e2e` three times consecutively. |
| P1 | Verify offline/PWA behavior | `manifest.json` is linked, but no service worker registration was found in `index.html` or app startup code. Offline E2E tests depend on cached app shell behavior. | Register `sw.js`, verify first-load caching, and pass offline E2E coverage. |
| P1 | Align documentation with actual repo layout | `README.md` still describes `/saas`, while the repo root and `www/` are the real app locations. | README setup, scripts, and project structure match the current repo. |
| P1 | Reconcile test and coverage claims | Existing docs claim 248 tests, while the repository currently contains 14 unit/integration test files and 376 tracked `describe`/`test`/`it` declarations. | Docs report verifiable counts or avoid exact counts unless generated. |
| P1 | Add missing IndexedDB stores/migrations for advanced modules | `advanced/communityRecipes.js` uses `communitySubmissions` and `savedRecipes`, but the current DB upgrade path does not create those object stores. | DB version/migrations include every store used by shipped modules, with tests. |
| P2 | Define backend contracts for sync/community/push | Background sync, community recipes, cross-device sync, and push token storage are still placeholders without server APIs. | API contracts exist for sync, community recipes, push token storage, and conflict handling. |
| P2 | Harden dynamic HTML rendering | Several modules render dynamic strings through `innerHTML`/`insertAdjacentHTML`, including recipe/AI/user-facing content paths. | User- or AI-sourced content is escaped or rendered with DOM APIs. |
| P2 | Make native scripts portable | Android scripts hard-code `/home/x99/...` paths. | Native scripts use environment variables, documented defaults, or local config files. |
| P2 | Consolidate persistence boundaries | IndexedDB is the intended source of truth, but auth/session/cache/analytics/sync helpers still use `localStorage` for several data paths. | Critical app data is IndexedDB-backed; localStorage usage is limited to non-critical cache/session metadata and documented. |
| P3 | Start gradual TypeScript adoption | The codebase is large enough that state/data/API contracts would benefit from type checks. | Add `// @ts-check` or TypeScript for core/data/logic modules first. |

## Recently completed / confirmed

- Code is already split into the intended architecture directories.
- IndexedDB stores exist for recipes, pantry, meal plans, preferences, nutrition logs, search index, and queued mutations.
- Jest, Playwright, ESLint, Prettier, and GitHub Actions configs exist.
- `npm ci --legacy-peer-deps` installs locally, but emits engine warnings for ESLint packages under Node 22.12.0.
- `npm audit --production` identifies one high-severity production dependency issue.

## Verification commands

Run these after dependency resolution is fixed:

```bash
npm ci
npm run lint
npm run format:check
npm run test -- --runInBand
npm run test:e2e
npm audit --omit=dev
```

Temporary local workaround used during this audit:

```bash
npm ci --legacy-peer-deps
```
