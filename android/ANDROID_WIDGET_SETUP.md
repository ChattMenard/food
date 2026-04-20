# Android Widget Setup Instructions

## Overview
The Android widget displays pantry count, meal plan count, upcoming meal, and expiring items on the home screen.

## Files Created

1. `android/app/src/main/java/com/main/app/widget/MealWidgetProvider.kt` - Widget provider
2. `android/app/src/main/res/layout/meal_widget.xml` - Widget layout
3. `android/app/src/main/res/xml/meal_widget_info.xml` - Widget configuration
4. `android/app/src/main/java/com/main/app/widget/WidgetDataManagerPlugin.kt` - Capacitor plugin

## Manual Steps in Android Studio

1. Open the project in Android Studio:
   ```bash
   npm run android
   ```

2. Sync Gradle files (if prompted)

3. Build the project (Build → Make Project)

4. Run on device/emulator (Run → Run 'app')

5. Long-press on home screen → Widgets → Find "Meal Planner" → Add to home screen

## Update Web App to Sync Widget Data

The widget uses the same JavaScript wrapper as iOS (`www/js/native/widgetManager.js`):

```javascript
import { syncWidgetWithState } from './js/native/widgetManager.js';

// Call this after updating pantry or meal plan
await syncWidgetWithState(pantry, mealPlan);
```

## Widget Features

- **Auto-refresh**: Updates every 15 minutes (900000ms)
- **Size**: 4x2 grid cells (adapts to different launchers)
- **Data source**: SharedPreferences (shared with web app via plugin)
- **No app groups required**: Android uses SharedPreferences directly

## Troubleshooting

**Widget not appearing in widget picker:**
- Ensure the app is installed on the device
- Check that `MealWidgetProvider` is registered in AndroidManifest.xml
- Verify the widget info XML exists and is correctly referenced

**Widget shows "0 items" after adding data:**
- Check console logs for plugin errors
- Verify `WidgetDataManagerPlugin` is being called from web app
- Ensure the plugin is registered in Capacitor

**Build errors:**
- Check that all Kotlin files are added to the correct build target
- Verify Gradle dependencies are up to date
- Ensure Android SDK version is compatible (Android 12+ for modern widgets)

## Testing

1. Build and install the app
2. Add widget to home screen
3. Add ingredients in the app
4. Widget should update automatically or after 15 minutes
5. To force update: remove and re-add widget

## Notes

- The widget uses the same plugin interface as iOS (`WidgetDataManager`)
- No additional setup required beyond the files provided
- The widget layout is styled to match the iOS widget appearance
