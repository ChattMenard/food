# iOS Widget Setup Instructions

## Prerequisites
- Xcode 14 or later
- macOS 12 Monterey or later
- Capacitor CLI installed
- iOS simulator or physical device

## Step 1: Add Widget Extension in Xcode

1. Open the iOS project in Xcode:
   ```bash
   npm run ios
   ```

2. In Xcode, go to **File → New → Target**

3. Select **Widget Extension** and click **Next**

4. Configure the widget:
   - **Product Name**: `MealWidget`
   - **Team**: Select your development team
   - **Bundle Identifier**: `com.main.app.MealWidget`
   - **Language**: Swift
   - **Include Configuration Intent**: Uncheck (not needed for simple widget)
   - **Include Live Activity**: Uncheck

5. Click **Finish** and when prompted to activate the scheme, click **Activate**

## Step 2: Configure App Group

1. Select the main app target (not the widget extension)

2. Go to **Signing & Capabilities** tab

3. Click **+ Capability** and select **App Groups**

4. Add a new App Group with identifier:
   ```
   group.com.main.app
   ```

5. Select the widget extension target

6. Go to **Signing & Capabilities** tab

7. Click **+ Capability** and select **App Groups**

8. Add the SAME App Group identifier:
   ```
   group.com.main.app
   ```

9. Both the app and widget must share the same App Group to share data

## Step 3: Replace Generated Widget Files

Xcode will generate default widget files. Replace them with the custom ones:

1. Delete the generated `MealWidget.swift` in the widget extension

2. Copy the custom files from the project:
   ```
   ios/Widgets/MealWidget/MealWidget.swift → MealWidget.swift
   ios/Widgets/MealWidget/Info.plist → Info.plist
   ```

3. Add the `WidgetDataManager.swift` to the main app target:
   ```
   ios/App/App/WidgetDataManager.swift
   ```

4. Add the `migrate-plugins.swift` to the main app target:
   ```
   ios/App/App/migrate-plugins.swift
   ```

## Step 4: Update Widget Bundle Identifier

1. Select the widget extension target

2. Go to **General** tab

3. Update **Bundle Identifier** to match:
   ```
   com.main.app.MealWidget
   ```

## Step 5: Build and Test

1. Build the project (⌘B)

2. Run on simulator or device (⌘R)

3. Long-press on home screen → Add Widget → Select "Meal Planner"

4. The widget should display pantry count and meal plan data

## Step 6: Update Web App to Sync Widget Data

In your web app (index.html), import and use the widget manager:

```javascript
import { syncWidgetWithState } from './js/native/widgetManager.js';

// Call this after updating pantry or meal plan
await syncWidgetWithState(pantry, mealPlan);
```

## Troubleshooting

**Widget not showing data:**
- Ensure App Group identifier matches exactly in both targets
- Check that `WidgetDataManager` plugin is registered
- Verify shared UserDefaults keys match between Swift and JS

**Widget not updating:**
- Call `WidgetCenter.shared.reloadAllTimelines()` after updating data
- Widget refreshes every 15 minutes by default
- Force refresh by removing and re-adding widget

**Build errors:**
- Ensure iOS deployment target is 14.0 or higher
- Check that Capacitor SDKs are properly linked
- Verify Swift version compatibility

## Files Created

- `ios/Widgets/MealWidget/MealWidget.swift` - Widget implementation
- `ios/Widgets/MealWidget/Info.plist` - Widget configuration
- `ios/App/App/WidgetDataManager.swift` - Capacitor plugin
- `ios/App/App/migrate-plugins.swift` - Plugin registration stub
- `www/js/native/widgetManager.js` - JavaScript wrapper
