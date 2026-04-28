// @ts-check
/**
 * Push Notification Manager Tests
 * Tests for notification scheduling and permission handling
 */

import db from '../data/db';
import {
  PushNotificationManager,
  NOTIFICATION_TYPES,
  PERMISSION,
} from '../utils/pushNotifications';

describe('PushNotificationManager', () => {
  let notificationManager;

  beforeEach(async () => {
    notificationManager = new PushNotificationManager();
    await db.delete('preferences', notificationManager.storageKey);
  });

  describe('initialization', () => {
    it('should start with default permission', () => {
      expect(notificationManager.permission).toBe(PERMISSION.DEFAULT);
    });

    it('should have empty scheduled notifications', () => {
      expect(notificationManager.scheduledNotifications.size).toBe(0);
    });

    it('should check if notifications are supported', () => {
      const supported = notificationManager.isSupported();
      expect(typeof supported).toBe('boolean');
    });

    it('should get status with all fields', async () => {
      await notificationManager.init();
      const status = notificationManager.getStatus();

      expect(status).toHaveProperty('supported');
      expect(status).toHaveProperty('permission');
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('enabledTypes');
      expect(status).toHaveProperty('allTypes');
    });
  });

  describe('permission handling', () => {
    it('should track permission state', () => {
      notificationManager.permission = PERMISSION.GRANTED;
      expect(notificationManager.permission).toBe(PERMISSION.GRANTED);
    });

    it('should detect denied permission', () => {
      notificationManager.permission = PERMISSION.DENIED;
      expect(notificationManager.getStatus().enabled).toBe(false);
    });
  });

  describe('notification types', () => {
    it('should define meal prep type', () => {
      const type = NOTIFICATION_TYPES.mealPrep;
      expect(type.title).toBe('Meal Prep Reminder');
      expect(type.schedule).toBe('weekly');
      expect(type.defaultEnabled).toBe(true);
    });

    it('should define expiration type', () => {
      const type = NOTIFICATION_TYPES.expiration;
      expect(type.title).toBe('Food Expiration');
      expect(type.schedule).toBe('daily');
    });

    it('should define grocery delivery type', () => {
      const type = NOTIFICATION_TYPES.groceryDelivery;
      expect(type.title).toBe('Grocery Delivery');
      expect(type.defaultEnabled).toBe(false);
    });

    it('should define nutrition goal type', () => {
      const type = NOTIFICATION_TYPES.nutritionGoal;
      expect(type.title).toBe('Nutrition Goals');
      expect(type.schedule).toBe('daily');
    });

    it('should define sync complete type', () => {
      const type = NOTIFICATION_TYPES.syncComplete;
      expect(type.title).toBe('Sync Status');
      expect(type.schedule).toBe('immediate');
    });
  });

  describe('settings', () => {
    it('should get default settings', () => {
      const defaults = notificationManager.getDefaultSettings();

      expect(defaults.mealPrep.enabled).toBe(true);
      expect(defaults.expiration.enabled).toBe(true);
      expect(defaults.groceryDelivery.enabled).toBe(false);
    });

    it('should get all type settings', async () => {
      await notificationManager.init();
      const settings = notificationManager.getTypeSettings();

      expect(settings.length).toBe(Object.keys(NOTIFICATION_TYPES).length);
      expect(settings[0]).toHaveProperty('settings');
    });

    it('should enable notification type', async () => {
      await notificationManager.init();
      await notificationManager.setTypeEnabled('groceryDelivery', true);

      expect(notificationManager.typeSettings.groceryDelivery.enabled).toBe(
        true
      );
      expect(notificationManager.getEnabledTypes()).toContain(
        'groceryDelivery'
      );
    });

    it('should disable notification type', async () => {
      await notificationManager.init();
      await notificationManager.setTypeEnabled('mealPrep', false);

      expect(notificationManager.typeSettings.mealPrep.enabled).toBe(false);
      expect(notificationManager.getEnabledTypes()).not.toContain('mealPrep');
    });

    it('should throw for unknown type', async () => {
      await expect(
        notificationManager.setTypeEnabled('unknown', true)
      ).rejects.toThrow('Unknown notification type');
    });
  });

  describe('scheduling', () => {
    beforeEach(async () => {
      await notificationManager.init();
    });

    it('should schedule daily notification', () => {
      notificationManager.scheduleDaily('expiration');

      expect(notificationManager.scheduledNotifications.has('expiration')).toBe(
        true
      );
    });

    it('should schedule weekly notification', () => {
      notificationManager.scheduleWeekly('mealPrep');

      expect(notificationManager.scheduledNotifications.has('mealPrep')).toBe(
        true
      );
    });

    it('should cancel scheduled notification', () => {
      notificationManager.scheduleDaily('expiration');
      notificationManager.cancelScheduledType('expiration');

      expect(notificationManager.scheduledNotifications.has('expiration')).toBe(
        false
      );
    });

    it('should schedule all enabled types', () => {
      notificationManager.typeSettings.mealPrep.enabled = true;
      notificationManager.typeSettings.expiration.enabled = true;

      notificationManager.scheduleAllEnabled();

      expect(notificationManager.scheduledNotifications.size).toBe(2);
    });
  });

  describe('notification triggers', () => {
    beforeEach(async () => {
      await notificationManager.init();
      notificationManager.permission = PERMISSION.GRANTED; // Mock granted
    });

    it('should skip trigger if type disabled', async () => {
      notificationManager.typeSettings.mealPrep.enabled = false;

      const result = await notificationManager.triggerMealPrep({ recipes: [] });
      expect(result).toBeUndefined();
    });

    it('should skip trigger if permission not granted', async () => {
      notificationManager.permission = PERMISSION.DENIED;

      const result = await notificationManager.show('Test', {});
      expect(result.shown).toBe(false);
    });

    it('should trigger expiration notification', async () => {
      notificationManager.typeSettings.expiration.enabled = true;

      const items = [
        { name: 'Milk', daysLeft: 2 },
        { name: 'Eggs', daysLeft: 3 },
      ];

      // Mock notification
      global.Notification = jest.fn();

      const result = await notificationManager.triggerExpiration(items);
      expect(result).toBeDefined();
    });

    it('should skip empty expiration list', async () => {
      notificationManager.typeSettings.expiration.enabled = true;

      const result = await notificationManager.triggerExpiration([]);
      expect(result).toBeUndefined();
    });

    it('should trigger grocery reminder', async () => {
      notificationManager.typeSettings.groceryDelivery.enabled = true;
      global.Notification = jest.fn();

      const result = await notificationManager.triggerGroceryReminder([
        'item1',
        'item2',
      ]);
      expect(result).toBeDefined();
    });

    it('should trigger nutrition update', async () => {
      notificationManager.typeSettings.nutritionGoal.enabled = true;
      global.Notification = jest.fn();

      const result = await notificationManager.triggerNutritionUpdate({
        percentage: 75,
      });
      expect(result).toBeDefined();
    });

    it('should trigger sync complete', async () => {
      notificationManager.typeSettings.syncComplete.enabled = true;
      global.Notification = jest.fn();

      const result = await notificationManager.triggerSyncComplete({
        deviceName: 'Phone',
      });
      expect(result).toBeDefined();
    });
  });

  describe('pub-sub', () => {
    it('should notify on settings change', async () => {
      await notificationManager.init();
      const callback = jest.fn();
      notificationManager.subscribe(callback);

      await notificationManager.setTypeEnabled('mealPrep', false);

      expect(callback).toHaveBeenCalledWith(
        'settings-change',
        expect.any(Object)
      );
    });

    it('should allow unsubscribing', async () => {
      await notificationManager.init();
      const callback = jest.fn();
      const unsubscribe = notificationManager.subscribe(callback);

      unsubscribe();
      await notificationManager.setTypeEnabled('mealPrep', true);

      // Settings change events should still fire
      expect(notificationManager.typeSettings.mealPrep.enabled).toBe(true);
    });
  });

  describe('constants', () => {
    it('should have PERMISSION constants', () => {
      expect(PERMISSION.GRANTED).toBe('granted');
      expect(PERMISSION.DENIED).toBe('denied');
      expect(PERMISSION.DEFAULT).toBe('default');
    });

    it('should have NOTIFICATION_TYPES with all required fields', () => {
      Object.values(NOTIFICATION_TYPES).forEach((type) => {
        expect(type).toHaveProperty('id');
        expect(type).toHaveProperty('title');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('defaultEnabled');
        expect(type).toHaveProperty('schedule');
      });
    });
  });
});
