# Siri Shortcuts Setup Instructions

## Overview
Siri shortcuts allow users to add ingredients and meals using voice commands like:
- "Hey Siri, add chicken to pantry"
- "Hey Siri, add pasta to meal plan"

## Step 1: Add Intents Extension in Xcode

1. Open the iOS project in Xcode:
   ```bash
   npm run ios
   ```

2. In Xcode, go to **File → New → Target**

3. Select **Intents Extension** and click **Next**

4. Configure the extension:
   - **Product Name**: `MealIntents`
   - **Team**: Select your development team
   - **Bundle Identifier**: `com.main.app.MealIntents`
   - **Language**: Swift
   - **Include UI Extension**: Uncheck (not needed)

5. Click **Finish**

## Step 2: Configure App Group

1. Select the intents extension target

2. Go to **Signing & Capabilities** tab

3. Click **+ Capability** and select **App Groups**

4. Add the SAME App Group as the main app and widget:
   ```
   group.com.main.app
   ```

## Step 3: Add Intent Files

1. Delete the generated `IntentHandler.swift` (or modify it)

2. Copy the custom intent handler:
   ```
   ios/App/App/Intents/IngredientIntentHandler.swift → MealIntents/IntentHandler.swift
   ```

3. Add the file to the intents extension target

## Step 4: Update Info.plist

1. Select the intents extension target

2. Open `Info.plist`

3. Add the following keys:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>IntentsSupported</key>
        <array>
            <string>INAddTasksIntent</string>
        </array>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.intents-service</string>
</dict>
```

## Step 5: Register Plugin in Main App

The `SiriShortcutsManager` plugin is already defined in:
```
ios/App/App/Intents/IngredientIntentHandler.swift
```

Add it to `migrate-plugins.swift` if needed.

## Step 6: Update Web App to Donate Shortcuts

In your web app (index.html), import and use the Siri shortcuts manager:

```javascript
import { donateAddIngredientShortcut, donateFrequentIngredients } from './js/native/siriShortcuts.js';

// Donate shortcut when user adds an ingredient
async function addIngredient() {
    const ingredient = document.getElementById('new-ingredient').value;
    // ... add ingredient logic ...
    
    // Donate Siri shortcut if on iOS
    await donateAddIngredientShortcut(ingredient);
}

// Donate shortcuts for frequently used items
await donateFrequentIngredients(pantry);
```

## Step 7: Test Siri Shortcuts

1. Build and run the app on a physical device (Siri shortcuts don't work on simulator)

2. Add an ingredient in the app

3. Go to **Settings → Siri & Search**

4. You should see "Add [ingredient] to Pantry" under suggested shortcuts

5. Tap it to add to Siri

6. Say "Hey Siri, add [ingredient] to pantry"

## Troubleshooting

**Shortcuts not appearing in Settings:**
- Ensure the app has been built and run at least once
- Check that the intent was successfully donated (check console logs)
- Verify the app group identifier matches across all targets

**Siri doesn't recognize the command:**
- Make sure the shortcut is added to Siri in Settings
- Try re-phrasing the command
- Check that the suggested invocation phrase is clear

**Build errors:**
- Ensure iOS deployment target is 14.0 or higher
- Verify that the intents extension is properly linked
- Check that all files are added to the correct targets

## Files Created

- `ios/App/App/Intents/IngredientIntentHandler.swift` - Intent handler implementation
- `www/js/native/siriShortcuts.js` - JavaScript wrapper for donating shortcuts
