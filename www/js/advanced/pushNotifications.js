/**
 * Push Notifications Module
 * Handles push notifications for low stock alerts and meal prep reminders
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

export class PushNotificationManager {
  constructor() {
    this.enabled = false;
    this.permissionGranted = false;
  }

  /**
   * Initialize push notifications
   */
  async init() {
    try {
      // Request permission
      const result = await PushNotifications.requestPermissions();

      if (result.receive === 'granted') {
        this.permissionGranted = true;
        this.enabled = true;

        // Register with push notification service
        await PushNotifications.register();

        // Set up listeners
        this.setupListeners();

        log('[PushNotifications] Initialized');
      } else {
        log('[PushNotifications] Permission denied');
      }
    } catch (error) {
      console.error('[PushNotifications] Initialization failed:', error);
      // Fall back to local notifications
      this.initLocalNotifications();
    }
  }

  /**
   * Initialize local notifications (fallback)
   */
  async initLocalNotifications() {
    try {
      await LocalNotifications.requestPermissions();
      this.enabled = true;
      log('[PushNotifications] Using local notifications');
    } catch (error) {
      console.error('[PushNotifications] Local notifications failed:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  setupListeners() {
    PushNotifications.addListener('registration', (token) => {
      log('[PushNotifications] Registration token:', token.value);
      // Send token to server for push notifications
      this.sendTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PushNotifications] Registration error:', error);
    });

    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        log('[PushNotifications] Push received:', notification);
      }
    );

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification) => {
        log('[PushNotifications] Push action performed:', notification);
        this.handleNotificationAction(notification);
      }
    );
  }

  /**
   * Send registration token to server
   * @param {string} token - Registration token
   */
  async sendTokenToServer(token) {
    try {
      // Store token locally for now
      localStorage.setItem('push_notification_token', token);
      
      // Send to server if available
      if (window.analyticsManager && window.analyticsManager.isEnabled) {
        await fetch('/api/push-notifications/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: token,
            platform: 'web',
            user_id: window.analyticsManager.userId
          })
        });
      }
      
      log('[PushNotifications] Token stored:', token);
    } catch (error) {
      console.error('[PushNotifications] Failed to store token:', error);
      // Fallback to local storage only
      localStorage.setItem('push_notification_token', token);
    }
  }

  /**
   * Handle notification action
   * @param {Object} notification - Notification object
   */
  handleNotificationAction(notification) {
    const data = notification.notification.data;

    if (data.type === 'low-stock') {
      // Navigate to pantry tab
      window.location.hash = 'pantry';
    } else if (data.type === 'meal-prep') {
      // Navigate to plan tab
      window.location.hash = 'plan';
    }
  }

  /**
   * Schedule low stock notification
   * @param {Array} items - Items with low stock
   */
  async scheduleLowStockAlert(items) {
    if (!this.enabled) return;

    const itemNames = items.map((i) => i.name).join(', ');

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: '⚠️ Low Stock Alert',
          body: `Running low on: ${itemNames}`,
          largeBody: `The following items are running low: ${itemNames}`,
          summaryText: 'Main - Low Stock',
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          attachments: null,
          actionTypeId: '',
          extra: null,
        },
      ],
    });
  }

  /**
   * Schedule meal prep reminder
   * @param {string} mealName - Meal name
   * @param {Date} prepTime - Time to start prep
   */
  async scheduleMealPrepReminder(mealName, prepTime) {
    if (!this.enabled) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: '🍳 Meal Prep Reminder',
          body: `Time to start prepping: ${mealName}`,
          largeBody: `Start preparing ${mealName} now to have it ready on time`,
          summaryText: 'Main - Meal Prep',
          schedule: { at: prepTime },
          sound: 'default',
          actionTypeId: '',
          extra: { type: 'meal-prep', mealName },
        },
      ],
    });
  }

  /**
   * Schedule expiry reminder
   * @param {Array} items - Items expiring soon
   */
  async scheduleExpiryReminder(items) {
    if (!this.enabled) return;

    const itemNames = items.map((i) => i.name).join(', ');

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: '📅 Items Expiring Soon',
          body: `Use these items before they expire: ${itemNames}`,
          largeBody: `The following items will expire soon: ${itemNames}`,
          summaryText: 'Main - Expiry Alert',
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          actionTypeId: '',
          extra: { type: 'expiry', items },
        },
      ],
    });
  }

  /**
   * Cancel all notifications
   */
  async cancelAll() {
    await LocalNotifications.cancel();
  }

  /**
   * Cancel specific notification
   * @param {number} notificationId - Notification ID
   */
  async cancel(notificationId) {
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }],
    });
  }

  /**
   * Get pending notifications
   * @returns {Promise<Array>} Pending notifications
   */
  async getPending() {
    const result = await LocalNotifications.getPending();
    return result.notifications;
  }

  /**
   * Check if notifications are enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Check if permission is granted
   * @returns {boolean}
   */
  hasPermission() {
    return this.permissionGranted;
  }
}

// Global push notification manager instance
let globalPushNotificationManager = null;

/**
 * Get or create the global push notification manager
 * @returns {PushNotificationManager}
 */
export function getPushNotificationManager() {
  if (!globalPushNotificationManager) {
    globalPushNotificationManager = new PushNotificationManager();
  }
  return globalPushNotificationManager;
}

/**
 * Initialize push notifications
 */
export async function initPushNotifications() {
  const manager = getPushNotificationManager();
  await manager.init();
}
