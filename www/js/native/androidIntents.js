// @ts-check
import { registerPlugin } from '@capacitor/core';

/**
 * Android Intents Manager - Handles Google Assistant voice commands and quick actions
 */
const AndroidIntents = registerPlugin('AndroidIntents');

/**
 * Send an intent to add an ingredient (for testing/debugging)
 * In production, Google Assistant would trigger this via actions.xml
 */
export async function sendAddIngredientIntent(ingredient) {
  try {
    if (
      typeof Capacitor !== 'undefined' &&
      Capacitor.getPlatform() === 'android'
    ) {
      await AndroidIntents.sendAddIngredientIntent({ ingredient });
      log('[AndroidIntents] Sent add ingredient intent:', ingredient);
    }
  } catch (error) {
    console.error('[AndroidIntents] Failed to send intent:', error);
  }
}

/**
 * Send an intent to add a meal (for testing/debugging)
 * In production, Google Assistant would trigger this via actions.xml
 */
export async function sendAddMealIntent(meal) {
  try {
    if (
      typeof Capacitor !== 'undefined' &&
      Capacitor.getPlatform() === 'android'
    ) {
      await AndroidIntents.sendAddMealIntent({ meal });
      log('[AndroidIntents] Sent add meal intent:', meal);
    }
  } catch (error) {
    console.error('[AndroidIntents] Failed to send intent:', error);
  }
}

/**
 * Register listener for intent events from Google Assistant
 */
export async function registerIntentListener() {
  try {
    if (
      typeof Capacitor !== 'undefined' &&
      Capacitor.getPlatform() === 'android'
    ) {
      await AndroidIntents.registerIntentListener();
      log('[AndroidIntents] Intent listener registered');
    }
  } catch (error) {
    console.error('[AndroidIntents] Failed to register listener:', error);
  }
}

/**
 * Note: For Google Assistant integration, you need to:
 * 1. Create an actions.xml file in app/src/main/res/xml/
 * 2. Configure Google Actions Console project
 * 3. Define voice intent mappings
 *
 * This is a simplified implementation - full Google Assistant integration
 * requires additional setup in the Google Actions Console.
 */
