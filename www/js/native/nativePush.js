import { registerPlugin } from '@capacitor/core';

/**
 * Native Push Notification Manager
 * Uses native scheduling triggers (UNCalendarNotificationTrigger on iOS, AlarmManager on Android)
 * for more reliable and precise notification scheduling
 */
const NativePush = registerPlugin('NativePush');

/**
 * Schedule a native push notification
 * @param {Object} options - Notification options
 * @param {string} options.id - Unique identifier for the notification
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body text
 * @param {string} options.triggerType - Type of trigger: 'immediate', 'delayed', 'daily', 'weekly'
 * @param {number} options.delaySeconds - Delay in seconds (for 'delayed' trigger)
 */
export async function scheduleNativeNotification(options) {
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() !== 'web') {
      await NativePush.scheduleNotification(options);
      log('[NativePush] Scheduled notification:', options.id);
    }
  } catch (error) {
    console.error('[NativePush] Failed to schedule notification:', error);
  }
}

/**
 * Cancel a scheduled native notification
 * @param {string} id - Notification identifier to cancel
 */
export async function cancelNativeNotification(id) {
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() !== 'web') {
      await NativePush.cancelNotification({ id });
      log('[NativePush] Cancelled notification:', id);
    }
  } catch (error) {
    console.error('[NativePush] Failed to cancel notification:', error);
  }
}

/**
 * Cancel all scheduled native notifications
 */
export async function cancelAllNativeNotifications() {
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() !== 'web') {
      await NativePush.cancelAllNotifications();
      log('[NativePush] Cancelled all notifications');
    }
  } catch (error) {
    console.error('[NativePush] Failed to cancel all notifications:', error);
  }
}

/**
 * Get list of pending native notifications
 * @returns {Promise<Array>} List of pending notifications
 */
export async function getPendingNativeNotifications() {
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform() !== 'web') {
      const result = await NativePush.getPendingNotifications();
      log('[NativePush] Pending notifications:', result.notifications);
      return result.notifications;
    }
  } catch (error) {
    console.error('[NativePush] Failed to get pending notifications:', error);
  }
  return [];
}

/**
 * Convenience function to schedule meal prep reminder
 */
export async function scheduleMealPrepReminder() {
  await scheduleNativeNotification({
    id: 'meal_prep_reminder',
    title: 'Meal Prep Time',
    body: "Don't forget to prep your meals for the week!",
    triggerType: 'weekly',
  });
}

/**
 * Convenience function to schedule expiration check
 */
export async function scheduleExpirationCheck() {
  await scheduleNativeNotification({
    id: 'expiration_check',
    title: 'Check Expiring Items',
    body: 'Some items in your pantry may be expiring soon.',
    triggerType: 'daily',
  });
}
