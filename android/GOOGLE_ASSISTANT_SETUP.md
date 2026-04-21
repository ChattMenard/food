# Google Assistant Integration Setup

## Overview
This guide explains how to set up Google Assistant integration for voice commands in the Meal Planner app.

## Files Created

1. `android/app/src/main/res/xml/actions.xml` - Google Assistant action definitions
2. Updated `android/app/src/main/AndroidManifest.xml` - Actions meta-data reference

## Supported Voice Commands

After setup, users can use these voice commands:

- "Hey Google, add chicken to pantry"
- "Hey Google, add pasta to meal plan"
- "Hey Google, check my pantry"
- "Hey Google, show my meal plan"
- "Hey Google, get recipe for pasta primavera"

## Step 1: Create Google Actions Project

1. Go to [actions.google.com](https://actions.google.com)
2. Click "New Project"
3. Enter project name: "Meal Planner"
4. Click "Create Project"
5. Select category: "Food & Drink" → "Recipes & Cooking"
6. Click "Continue"

## Step 2: Configure App Actions

1. In the Actions Console, go to "Develop" → "App Actions"
2. Click "Add your first Action"
3. Select "Built-in intents"
4. Add the following intents:

### Add Ingredient Intent
- **Intent**: `actions.intent.ADD_INGREDIENT`
- **Parameter**: `ingredient` (type: Ingredient)
- **Fulfillment**: Deep link to `food://addIngredient`

### Add Meal Intent
- **Intent**: `actions.intent.ADD_MEAL`
- **Parameter**: `meal` (type: Meal)
- **Fulfillment**: Deep link to `food://addMeal`

### Check Pantry Intent
- **Intent**: `actions.intent.CHECK_PANTRY`
- **Fulfillment**: Deep link to `food://pantry`

### View Meal Plan Intent
- **Intent**: `actions.intent.VIEW_MEAL_PLAN`
- **Fulfillment**: Deep link to `food://mealPlan`

### Get Recipe Intent
- **Intent**: `actions.intent.GET_RECIPE`
- **Parameter**: `recipe` (type: Recipe)
- **Fulfillment**: Deep link to `food://recipe`

## Step 3: Link to Android App

1. In the Actions Console, go to "Develop" → "Release" → "Setup"
2. Under "Android package name", enter: `com.main.app`
3. Under "SHA-256 signing certificate", add your app's signing certificate:
   - Get from Play Console or use: `keytool -list -v -keystore your-keystore.jks`
4. Click "Save"

## Step 4: Define Entity Sets (Optional)

For better voice recognition, define entity sets in the Actions Console:

### Ingredients Entity Set
- Add common ingredients: chicken, beef, pasta, rice, tomatoes, etc.
- This helps Google Assistant recognize ingredient names

### Meals Entity Set
- Add common meals: pasta primavera, chicken stir fry, etc.
- This helps Google Assistant recognize meal names

### Recipes Entity Set
- Add recipe names from your database
- This helps Google Assistant recognize recipe requests

## Step 5: Test with Preview

1. In the Actions Console, click "Test" in the top right
2. Use the Actions Simulator to test voice commands
3. Type or say: "Add chicken to pantry"
4. Verify the deep link is triggered correctly

## Step 6: Publish to Production

1. In the Actions Console, go to "Release" → "Deploy"
2. Review the deployment checklist
3. Click "Deploy to Production"
4. Wait for approval (usually instant for personal apps)

## Step 7: Update Android App to Handle Deep Links

Update `MainActivity.kt` to handle deep links from Google Assistant:

```kotlin
override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    handleDeepLink(intent)
}

private fun handleDeepLink(intent: Intent) {
    val data = intent.data
    when (data?.scheme) {
        "food" -> {
            when (data.host) {
                "addIngredient" -> {
                    val ingredient = data.getQueryParameter("ingredient")
                    // Add ingredient logic
                }
                "addMeal" -> {
                    val meal = data.getQueryParameter("meal")
                    // Add meal logic
                }
                "pantry" -> {
                    // Navigate to pantry tab
                }
                "mealPlan" -> {
                    // Navigate to meal plan tab
                }
                "recipe" -> {
                    val recipe = data.getQueryParameter("recipe")
                    // Show recipe
                }
            }
        }
    }
}
```

## Step 8: Update Intent Handler

Update `MealIntentReceiver.kt` to handle Google Assistant actions:

```kotlin
class MealIntentReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            MealIntentReceiver.ACTION_ADD_INGREDIENT -> {
                val ingredient = intent.getStringExtra(MealIntentReceiver.EXTRA_INGREDIENT)
                // Handle add ingredient
            }
            MealIntentReceiver.ACTION_ADD_MEAL -> {
                val meal = intent.getStringExtra(MealIntentReceiver.EXTRA_MEAL)
                // Handle add meal
            }
        }
    }
}
```

## Troubleshooting

**Voice commands not recognized:**
- Ensure the app is installed on the device
- Check that the Actions project is linked to the correct package name
- Verify the signing certificate matches the published app
- Test with the Actions Simulator first

**Deep links not opening the app:**
- Verify the intent filter is configured in AndroidManifest.xml
- Check that the deep link scheme matches the actions.xml
- Ensure the activity is exported

**Intents not triggering:**
- Check that the intent action matches in the receiver
- Verify the receiver is registered in AndroidManifest.xml
- Look for errors in logcat

## Notes

- Google Assistant integration requires the app to be published to the Play Store (or internal testing)
- Voice commands work on Android devices with Google Assistant
- The actions.xml file defines the available intents
- Deep links are used to navigate to specific screens
- Entity sets improve recognition but are optional

## Next Steps

After completing the setup:
1. Test with physical devices (not simulator)
2. Collect user feedback on voice command accuracy
3. Add more intents as needed
4. Optimize entity sets for better recognition
