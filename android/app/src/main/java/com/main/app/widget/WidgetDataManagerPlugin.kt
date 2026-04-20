package com.main.app.widget

import android.content.SharedPreferences
import android.preference.PreferenceManager
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Widget Data Manager Plugin for Android
 * Updates Android widget with current app data
 */
@CapacitorPlugin(name = "WidgetDataManager")
class WidgetDataManagerPlugin : Plugin() {

    private lateinit var prefs: SharedPreferences

    override fun load() {
        prefs = PreferenceManager.getDefaultSharedPreferences(context)
    }

    @PluginMethod
    fun updateWidgetData(call: PluginCall) {
        val pantryCount = call.getInt("pantryCount", 0)
        val mealPlanCount = call.getInt("mealPlanCount", 0)
        val upcomingMeal = call.getString("upcomingMeal", "")
        val nextExpiration = call.getString("nextExpiration", "")

        // Save to SharedPreferences
        val editor = prefs.edit()
        editor.putInt("widget_pantry_count", pantryCount)
        editor.putInt("widget_meal_plan_count", mealPlanCount)
        editor.putString("widget_upcoming_meal", upcomingMeal)
        editor.putString("widget_next_expiration", nextExpiration)
        editor.putLong("widget_last_update", System.currentTimeMillis())
        editor.apply()

        // Trigger widget update
        val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
        val componentName = android.content.ComponentName(context, MealWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        for (appWidgetId in appWidgetIds) {
            MealWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId)
        }

        call.resolve()
    }

    @PluginMethod
    fun getWidgetData(call: PluginCall) {
        val data = org.json.JSONObject()
        data.put("pantryCount", prefs.getInt("widget_pantry_count", 0))
        data.put("mealPlanCount", prefs.getInt("widget_meal_plan_count", 0))
        data.put("upcomingMeal", prefs.getString("widget_upcoming_meal", ""))
        data.put("nextExpiration", prefs.getString("widget_next_expiration", ""))
        data.put("lastUpdate", prefs.getLong("widget_last_update", 0))

        call.resolve(data)
    }
}
