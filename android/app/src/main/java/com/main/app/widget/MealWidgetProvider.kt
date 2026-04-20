package com.main.app.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import android.content.SharedPreferences
import android.preference.PreferenceManager

/**
 * Meal Widget Provider for Android
 * Displays pantry count and meal plan summary on the home screen
 */
class MealWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Called when the first widget is created
    }

    override fun onDisabled(context: Context) {
        // Called when the last widget is removed
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = PreferenceManager.getDefaultSharedPreferences(context)
            
            // Get widget data from SharedPreferences
            val pantryCount = prefs.getInt("widget_pantry_count", 0)
            val mealPlanCount = prefs.getInt("widget_meal_plan_count", 0)
            val upcomingMeal = prefs.getString("widget_upcoming_meal", null) ?: "No meal planned"
            val nextExpiration = prefs.getString("widget_next_expiration", null) ?: "No expiring items"

            // Create RemoteViews for the widget
            val views = RemoteViews(context.packageName, R.layout.meal_widget)

            // Update UI
            views.setTextViewText(R.id.pantry_count, "$pantryCount items")
            views.setTextViewText(R.id.meal_plan_count, "$mealPlanCount meals")
            views.setTextViewText(R.id.upcoming_meal, upcomingMeal)
            views.setTextViewText(R.id.next_expiration, nextExpiration)

            // Update the widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
