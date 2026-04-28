import { registerPlugin } from '@capacitor/core';

/**
 * Widget Manager - Updates iOS/Android widgets with current app data
 */
const WidgetManager = registerPlugin('WidgetDataManager');

/**
 * Update the iOS/Android widget with current pantry and meal plan data
 * Call this whenever data changes (after adding ingredients, updating meal plan, etc.)
 */
export async function updateWidget(data) {
  try {
    // Only update on native platforms
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() !== 'web') {
      await WidgetManager.updateWidgetData(data);
      log('[Widget] Widget data updated:', data);
    }
  } catch (error) {
    console.error('[Widget] Failed to update widget:', error);
  }
}

/**
 * Get current widget data (for debugging)
 */
export async function getWidgetData() {
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() !== 'web') {
      const data = await WidgetManager.getWidgetData();
      log('[Widget] Current widget data:', data);
      return data;
    }
  } catch (error) {
    console.error('[Widget] Failed to get widget data:', error);
  }
  return null;
}

/**
 * Helper to calculate upcoming meal from meal plan
 */
export function getUpcomingMeal(mealPlan) {
  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayIndex = days.indexOf(today);

  // Find next day with a meal plan
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (todayIndex + i) % 7;
    const nextDay = days[nextDayIndex];
    if (mealPlan[nextDay]) {
      return mealPlan[nextDay];
    }
  }
  return undefined;
}

/**
 * Helper to find next expiring ingredient from pantry
 */
export function getNextExpiration(pantry) {
  if (!pantry || pantry.length === 0) return undefined;

  // Find ingredient with addedAt timestamp that's closest to expiration
  const now = Date.now();
  const expiringItems = pantry
    .filter((item) => item.addedAt && item.addedAt > 0)
    .map((item) => ({
      name: item.name,
      daysOld: Math.floor((now - item.addedAt) / (1000 * 60 * 60 * 24)),
    }))
    .filter((item) => item.daysOld >= 3) // Items at least 3 days old
    .sort((a, b) => a.daysOld - b.daysOld);

  if (expiringItems.length > 0) {
    const oldest = expiringItems[0];
    return `${oldest.name} (${oldest.daysOld} days)`;
  }
  return undefined;
}

/**
 * Convenience function to update widget from current app state
 */
export async function syncWidgetWithState(pantry, mealPlan) {
  const data = {
    pantryCount: pantry.length,
    mealPlanCount: Object.keys(mealPlan).length,
    upcomingMeal: getUpcomingMeal(mealPlan),
    nextExpiration: getNextExpiration(pantry),
  };

  await updateWidget(data);
}
