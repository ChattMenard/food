# Development Setup & Architecture

## Quick Start

```bash
# Install dependencies
npm install

# Build CSS and TypeScript
npm run build:css:once
npm run build:ts

# Start development server
npm start
```

Then open http://localhost:8080 in your browser.

## Project Configuration

This project is designed to work across machines without hardcoded paths. All development tools auto-detect standard installation locations.

### Standard Locations (Auto-Detected)

**Linux/macOS:**
- Android SDK: `~/Android/Sdk`
- Android Studio JDK: `~/Android/Studio/jdk` or `~/Downloads/android-studio/jbr`

**Windows:**
- Android SDK: `%LOCALAPPDATA%\Android\Sdk`
- Android Studio: Typically in `Program Files`

### Custom Locations

If your setup differs from standard locations, set environment variables:

```bash
# Copy the example and fill in your local paths
cp .env.example .env.local

# Add your custom paths (optional)
export ANDROID_HOME=/custom/path/to/Android/Sdk
export JAVA_HOME=/custom/path/to/jdk
```

The deploy script (`scripts/deploy-android.sh`) uses these variables with fallback defaults.

## AI Features & Secure API Integration

All AI features (suggestions, meal planning, chat) communicate through a **secure backend proxy** that you deploy. The Gemini API key is **never exposed to the client**.

**Quick Start:**

```bash
# 1. Deploy the proxy to Google Cloud
gcloud functions deploy aiProxy \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=$YOUR_ACTUAL_KEY \
  --source=backend/ \
  --entry-point=aiProxy

# 2. Copy the function URL and add to .env.local
VITE_AI_PROXY_URL=https://us-central1-your-project.cloudfunctions.net/aiProxy

# 3. Restart the dev server - AI features are now available
npm start
```

**Without AI Proxy:** The app still works fully with offline recipe matching. AI features gracefully degrade.

**Security Details:** See [SECURITY.md](SECURITY.md) for architecture, best practices, and testing.

## Testing Strategy

This project uses **Jest for unit/integration testing** and **Playwright for end-to-end testing**.

### Unit & Integration Tests (Jest)

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm test:watch

# Coverage report
npm test:coverage

# CI mode (no watch, single run)
npm test:ci
```

**Primary focus:** Unit tests for business logic, utilities, and component behavior.
**Location:** Tests colocate with source files or in `__tests__` directories.

### End-to-End Tests (Playwright)

```bash
# Run e2e tests (all browsers)
npm run test:e2e

# CI mode (chromium only)
npm run test:e2e:ci

# Debug mode
npx playwright test --debug
```

**Primary focus:** User journeys, critical workflows, cross-platform testing.
**Location:** `e2e/` directory.

## Build Commands

```bash
# Build CSS with Tailwind
npm run build:css:once        # One-time build
npm run build:css             # Watch mode

# Compile TypeScript
npm run build:ts              # One-time build
npm run build:ts:watch        # Watch mode

# Build ML dataset
npm run build:data            # Generate recipe dataset
npm run validate-dataset      # Validate dataset integrity
```

## Code Quality

```bash
# Lint JavaScript/TypeScript
npm run lint                  # Check for errors
npm run lint:fix             # Auto-fix linting issues

# Format code
npm run format               # Format with Prettier
npm run format:check         # Check formatting without changes
```

## Android Development

### Prerequisites

- Android SDK installed at `~/Android/Sdk` (or set `ANDROID_HOME`)
- Android Studio installed with a compatible JDK
- An Android device or emulator running

### Commands

```bash
# Open Android Studio
npm run android

# Build debug APK
npm run android:build

# Deploy to device/emulator
npm deploy

# Sync Capacitor plugins
npm run sync
```

### Cross-Device Deployment

Deploy to a specific device:

```bash
# Set the device serial
export ADB_SERIAL=emulator-5554
npm deploy

# Or for multiple devices, check which ones are available
npm run deploy  # Will prompt if multiple devices detected
```

## iOS Development

```bash
# Add iOS platform
npm run ios
```

## Architecture Notes

- **PWA-first approach:** App runs in browser with Capacitor for native features
- **State management:** See `www/js/features/` for domain-specific stores
- **ML recipes:** Uses pre-processed meal data in `scripts/`
- **Cross-platform:** All scripts test on Linux, macOS, and Windows

## Troubleshooting

**Port 8080 already in use:**
```bash
# The start script automatically kills any process on port 8080
npm start
```

**adb not found:**
```bash
# Ensure ANDROID_HOME is set correctly
export ANDROID_HOME=$HOME/Android/Sdk
npm deploy
```

**Capacitor sync fails:**
```bash
# Clear Capacitor cache and re-sync
rm -rf android/capacitor-cordova-android-plugins
npm run sync
```

## Package Name Change

This project was renamed from "main" to "pantry-ai" to better reflect its purpose. All npm scripts have been updated to remove hardcoded local paths, making the repository portable across different machines and operating systems.
