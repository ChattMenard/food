package com.main.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }
    
    private void handleDeepLink(Intent intent) {
        Uri data = intent.getData();
        if (data != null && "food".equals(data.getScheme())) {
            String host = data.getHost();
            switch (host) {
                case "addIngredient":
                    String ingredient = data.getQueryParameter("ingredient");
                    if (ingredient != null) {
                        // Trigger broadcast to Capacitor
                        Intent broadcastIntent = new Intent("com.main.app.ADD_INGREDIENT");
                        broadcastIntent.putExtra("ingredient", ingredient);
                        sendBroadcast(broadcastIntent);
                    }
                    break;
                case "addMeal":
                    String meal = data.getQueryParameter("meal");
                    if (meal != null) {
                        // Trigger broadcast to Capacitor
                        Intent broadcastIntent = new Intent("com.main.app.ADD_MEAL");
                        broadcastIntent.putExtra("meal", meal);
                        sendBroadcast(broadcastIntent);
                    }
                    break;
                case "pantry":
                    // Navigate to pantry tab - handled by Capacitor
                    break;
                case "mealPlan":
                    // Navigate to meal plan tab - handled by Capacitor
                    break;
                case "recipe":
                    String recipe = data.getQueryParameter("recipe");
                    if (recipe != null) {
                        // Show recipe - handled by Capacitor
                    }
                    break;
            }
        }
    }
}
