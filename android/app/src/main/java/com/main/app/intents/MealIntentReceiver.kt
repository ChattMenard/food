package com.main.app.intents

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.getcapacitor.Plugin
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Android Intent Receiver for voice commands and quick actions
 * Handles "add ingredient" and "add meal" intents from Google Assistant
 */
class MealIntentReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_ADD_INGREDIENT -> {
                val ingredient = intent.getStringExtra(EXTRA_INGREDIENT)
                if (ingredient != null) {
                    // Emit event to Capacitor
                    val pluginIntent = Intent("com.main.app.ADD_INGREDIENT")
                    pluginIntent.putExtra("ingredient", ingredient)
                    context.sendBroadcast(pluginIntent)
                }
            }
            ACTION_ADD_MEAL -> {
                val meal = intent.getStringExtra(EXTRA_MEAL)
                if (meal != null) {
                    // Emit event to Capacitor
                    val pluginIntent = Intent("com.main.app.ADD_MEAL")
                    pluginIntent.putExtra("meal", meal)
                    context.sendBroadcast(pluginIntent)
                }
            }
        }
    }

    companion object {
        const val ACTION_ADD_INGREDIENT = "com.main.app.ADD_INGREDIENT"
        const val ACTION_ADD_MEAL = "com.main.app.ADD_MEAL"
        const val EXTRA_INGREDIENT = "ingredient"
        const val EXTRA_MEAL = "meal"
    }
}
