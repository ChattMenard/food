# Copilot instructions for this repository

Purpose: Help AI assistants (Copilot) quickly find build/test/lint commands, understand high-level architecture, and follow repo-specific conventions.

---

## 1) Build, test, and lint (commands)

Main entry: package.json scripts.

- Install deps: npm install

Build
- One-time CSS build: npm run build:css:once
- Watch CSS: npm run build:css
- Compile TypeScript: npm run build:ts
- Watch TS: npm run build:ts:watch
- Full build: npm run build
- Production build: npm run build:prod
- Analyze build: npm run build:analyze

Data & dataset
- Build dataset: npm run build:data
- Validate dataset: npm run validate-dataset

Serve / run
- Serve web assets (kills port 8080 first): npm start
- Start Android studio / sync: npm run android

Lint & format
- Lint: npm run lint
- Fix lint issues: npm run lint:fix
- Format: npm run format
- Check formatting: npm run format:check

Testing
- Unit & integration (Jest): npm test
- Single Jest file: npx jest <path/to/file.test.js> (or .ts)
- Run a single test by name: npx jest -t "test name"
- CI single run: npm run test:ci
- Coverage: npm run test:coverage
- Watch tests: npm run test:watch

- End-to-end (Playwright): npm run test:e2e
- Single Playwright test file: npx playwright test e2e/my.spec.ts
- Run single Playwright test + project: npx playwright test e2e/my.spec.ts -p chromium
- Playwright debug: npx playwright test --debug

Notes:
- Playwright's webServer (playwright.config.js) will start a simple static server (python http.server by default) unless PLAYWRIGHT_WEB_SERVER_CMD is provided.
- Start script kills processes on port 8080 before serving.

---

## 2) High-level architecture (short)

- PWA-first single-page app in /www (source under www/js). The web assets are what Capacitor syncs into native projects (android/ ios).
- Capacitor enables native features; Android/iOS native projects live under android/ and ios/ after capacitor add.
- AI features are implemented behind a secure backend proxy living in backend/ — API keys are not exposed to the client. See README and DEPLOYMENT.md for proxy deployment steps.
- Build & data preprocessing scripts live in scripts/ (e.g., scripts/build_dataset.py, scripts/build-production.js).
- Tests:
  - Unit/integration: Jest (configured in jest.config.js). Tests colocate with source or live in __tests__ directories.
  - E2E: Playwright with config in playwright.config.js and tests in e2e/.
- TypeScript support: tsconfig.json targets www/js as rootDir and emits declarations to dist. The repo uses ES modules (package.json: "type": "module").

---

## 3) Key repo-specific conventions

- Source directory: www/js is the canonical source root for app logic. module resolution and jest map aliases expect this layout.
- Imports use explicit .js extensions for compatibility with ESM (use relative imports like `./utils.js`). When migrating to TS, prefer `import type` for type-only imports.
- Module aliases exist (see jest.config.js moduleNameMapper): @/, @core/, @data/, @logic/, @features/, @ai/, @ui/, @utils/, @native/, @auth/, @advanced/ — mirror these in IDE settings for quick navigation.
- Tests: prefer small, deterministic unit tests for logic and data modules (www/js/data, www/js/logic). UI-heavy modules often have relaxed coverage rules.
- AllowJS + strict TypeScript: the TS build accepts JS files (tsconfig.json: allowJs=true). Follow the TypeScript guidelines in TYPESCRIPT_DEVELOPMENT_GUIDELINES.md when adding .ts files.
- Playwright web server: playwright.config.js may reuse an existing server; when running in CI ensure the server is reachable at http://localhost:8080.
- Port handling: start script attempts to kill processes on port 8080 before serving; local dev expects port 8080 by default.

---

## 4) Where to look (source of truth)

- package.json — scripts and deps (primary commands)
- README.md, DEVELOPMENT.md — developer workflows and environment setup
- DEPLOYMENT.md — staging/production steps, env file examples
- jest.config.js, playwright.config.js — test runners and how to run single tests
- TYPESCRIPT_DEVELOPMENT_GUIDELINES.md — conventions for TS migration and typing

---

## 5) Existing AI/assistant configs

- No CLAUDE.md, .cursorrules, AGENTS.md, .windsurfrules, CONVENTIONS.md, or similar assistant config files were detected. If adding tools that rely on these, copy relevant sections from README/DEVELOPMENT.

---

If you want adjustments (more detail for a section, extra examples, or adding IDE/VSCode launch configs), say which area to expand.
