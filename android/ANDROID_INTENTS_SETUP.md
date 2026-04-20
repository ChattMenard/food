# Android Intents Setup Instructions

## Overview
Android intents allow Google Assistant to trigger actions in your app using voice commands like:
- "Hey Google, add chicken to pantry"
- "Hey Google, add pasta to meal plan"

## Files Created

1. `android/app/src/main/java/com/main/app/intents/MealIntentReceiver.kt` - Intent receiver
2. `android/app/src/main/java/com/main/app/intents/AndroidIntentsPlugin.kt` - Capacitor plugin
3. `www/js/native/androidIntents.js` - JavaScript wrapper

## Current Implementation

The current implementation provides a foundation for intent handling:
- Broadcast receiver for custom intents
- Capacitor plugin to send intents from the web app
- JavaScript wrapper for easy integration

## Full Google Assistant Integration (Additional Work)

For full voice command support with Google Assistant, you need to:

### 1. Create actions.xml

Create `android/app/src/main/res/xml/actions.xml`:

```xml
<actions>
  <action intentName="actions.intent.ADD_INGREDIENT">
    <parameter name="ingredient" type="Ingredient"/>
  </action>
  <action intentName="actions.intent.ADD_MEAL">
    <parameter name="meal" type="Meal"/>
  </action>
</actions>
```

### 2. Configure Google Actions Console

1. Go to [actions.google.com](https://actions.google.com)
2. Create a new project
3. Configure app actions for your app
4. Link to your Android app in the Play Console
5. Define custom intents and voice phrases

### 3. Update AndroidManifest.xml

Add the actions.xml reference:

```xml
<meta-data
    android:name="android.app.actions"
    android:resource="@xml/actions" />
```

## Testing Current Implementation

1. Build and install the app
2. Open Chrome DevTools on the device
3. In the console, test the intent:

```javascript
import { sendAddIngredientIntent } from './js/native/androidIntents.js';
await sendAddIngredientIntent('chicken');
```

## Web App Integration

Use the JavaScript wrapper in your app:

```javascript
import { registerIntentListener, sendAddIngredientIntent } from './js/native/androidIntents.js';

// Register listener when app loads
await registerIntentListener();

// Send intent (for testing or programmatic triggers)
await sendAddIngredientIntent('chicken');
```

## Notes

- Full Google Assistant integration requires additional setup in the Google Actions Console
- The current implementation provides the foundation for intent handling
- Without actions.xml and Google Console setup, voice commands won't work
- You can still use the intents programmatically from within the app

## Troubleshooting

**Intents not firing:**
- Verify the receiver is registered in AndroidManifest.xml
- Check that the plugin is being called from the web app
- Look for errors in logcat

**Google Assistant not recognizing commands:**
- Ensure actions.xml is properly configured
- Verify the Google Actions Console project is linked
- Check that the app is published or in internal testing

## Next Steps

To enable full voice commands:
1. Create actions.xml
2. Set up Google Actions Console project
3. Define custom intents
4. Test with Google Assistant on a physical device
