package com.main.app.intents

import android.content.Intent
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Android Intents Plugin - Registers and handles voice commands and quick actions
 */
@CapacitorPlugin(name = "AndroidIntents")
class AndroidIntentsPlugin : Plugin() {

    @PluginMethod
    fun registerIntentListener(call: PluginCall) {
        // This plugin listens for broadcast intents from the IntentReceiver
        // The web app will need to set up a listener for the events
        call.resolve()
    }

    @PluginMethod
    fun sendAddIngredientIntent(call: PluginCall) {
        val ingredient = call.getString("ingredient")
        if (ingredient == null) {
            call.reject("Missing ingredient parameter")
            return
        }

        val intent = Intent(MealIntentReceiver.ACTION_ADD_INGREDIENT).apply {
            putExtra(MealIntentReceiver.EXTRA_INGREDIENT, ingredient)
        }
        context.sendBroadcast(intent)
        call.resolve()
    }

    @PluginMethod
    fun sendAddMealIntent(call: PluginCall) {
        val meal = call.getString("meal")
        if (meal == null) {
            call.reject("Missing meal parameter")
            return
        }

        val intent = Intent(MealIntentReceiver.ACTION_ADD_MEAL).apply {
            putExtra(MealIntentReceiver.EXTRA_MEAL, meal)
        }
        context.sendBroadcast(intent)
        call.resolve()
    }
}
