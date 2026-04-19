# PantryAI - Smart Meal Planner

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Install dependencies
```bash
npm install
```

### 3. Add native platforms
```bash
# For Android
npx cap add android

# For iOS (macOS only)
npx cap add ios
```

### 4. Open in IDE
```bash
# Open Android Studio
npx cap open android

# Open Xcode (macOS only)
npx cap open ios
```

### 5. Build
- **Android**: Run in Android Studio or `./gradlew assembleDebug`
- **iOS**: Click Play in Xcode

## Android Studio (Dialed Workflow)

```bash
# 1) Build enhanced datasets
npm run build:data

# 2) Sync web assets + open Android Studio (configured for this machine)
npm run android

# 3) Optional CLI debug build
npm run android:build
```

## Alternative: PWA Only
The app works as a PWA directly in any browser. To install:
1. Serve the files (e.g., `npx serve`)
2. Open on mobile browser
3. Add to Home Screen

## Project Structure
```
/saas
  index.html          # Main app
  manifest.json       # PWA manifest
  sw.js              # Service worker
  capacitor.config.json
  android/           # Android native project (after cap add)
  ios/               # iOS native project (after cap add)
```
