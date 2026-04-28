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
  let notificationManager: PushNotificationManager;

  beforeEach(async () => {
    notificationManager = new PushNotificationManager();
    await db.delete('preferences', (notificationManager as any).storageKey);
  });

  describe('initialization', () => {
    it('should start with default permission', () => {
      expect((notificationManager as any).permission).toBe(PERMISSION.DEFAULT);
    });

    it('should have empty scheduled notifications', () => {
      expect((notificationManager as any).scheduledNotifications.size).toBe(0);
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
      (notificationManager as any).permission = PERMISSION.GRANTED;
      expect(notificationManager.getStatus().permission).toBe(PERMISSION.GRANTED);
    });

    it('should request permission', async () => {
      // Mock Notification.requestPermission
      const mockRequestPermission = jest.fn().mockResolvedValue(PERMISSION.GRANTED);
      (global as any).Notification.requestPermission = mockRequestPermission;

      const result = await notificationManager.requestPermission();
      
      expect(result).toBe(PERMISSION.GRANTED);
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(notificationManager.getStatus().permission).toBe(PERMISSION.GRANTED);
    });

    it('should handle permission denial', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue(PERMISSION.DENIED);
      (global as any).Notification.requestPermission = mockRequestPermission;

      const result = await notificationManager.requestPermission();
      
      expect(result).toBe(PERMISSION.DENIED);
      expect(notificationManager.getStatus().enabled).toBe(false);
    });

    it('should handle permission errors', async () => {
      const mockRequestPermission = jest.fn().mockRejectedValue(new Error('Permission error'));
      (global as any).Notification.requestPermission = mockRequestPermission;

      await expect(notificationManager.requestPermission()).rejects.toThrow('Permission error');
    });
  });

  describe('notification scheduling', () => {
    beforeEach(async () => {
      await notificationManager.init();
      (notificationManager as any).permission = PERMISSION.GRANTED;
    });

    it('should schedule notification', async () => {
      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Meal Reminder',
        body: 'Time to prepare dinner',
        scheduledTime: new Date(Date.now() + 60000), // 1 minute from now
      };

      const id = await notificationManager.schedule(notification);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect((notificationManager as any).scheduledNotifications.has(id)).toBe(true);
    });

    it('should validate notification data', async () => {
      const invalidNotification = {
        type: 'invalid-type' as any,
        title: '',
        body: 'Test',
        scheduledTime: new Date(),
      };

      await expect(notificationManager.schedule(invalidNotification)).rejects.toThrow('Invalid notification data');
    });

    it('should not schedule in the past', async () => {
      const pastNotification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Past Notification',
        body: 'This should fail',
        scheduledTime: new Date(Date.now() - 60000), // 1 minute ago
      };

      await expect(notificationManager.schedule(pastNotification)).rejects.toThrow('Scheduled time must be in the future');
    });

    it('should cancel scheduled notification', async () => {
      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'To be cancelled',
        body: 'Test',
        scheduledTime: new Date(Date.now() + 60000),
      };

      const id = await notificationManager.schedule(notification);
      expect((notificationManager as any).scheduledNotifications.has(id)).toBe(true);

      await notificationManager.cancel(id);
      expect((notificationManager as any).scheduledNotifications.has(id)).toBe(false);
    });

    it('should handle cancelling non-existent notification', async () => {
      await expect(notificationManager.cancel('non-existent-id')).rejects.toThrow('Notification not found');
    });
  });

  describe('notification types', () => {
    beforeEach(async () => {
      await notificationManager.init();
    });

    it('should enable notification types', async () => {
      await notificationManager.enableType(NOTIFICATION_TYPES.mealPrep);
      await notificationManager.enableType(NOTIFICATION_TYPES.groceryDelivery);

      const status = notificationManager.getStatus();
      expect(status.enabledTypes).toContain(NOTIFICATION_TYPES.mealPrep);
      expect(status.enabledTypes).toContain(NOTIFICATION_TYPES.groceryDelivery);
    });

    it('should disable notification types', async () => {
      await notificationManager.enableType(NOTIFICATION_TYPES.mealPrep);
      await notificationManager.disableType(NOTIFICATION_TYPES.mealPrep);

      const status = notificationManager.getStatus();
      expect(status.enabledTypes).not.toContain(NOTIFICATION_TYPES.mealPrep);
    });

    it('should check if type is enabled', async () => {
      await notificationManager.enableType(NOTIFICATION_TYPES.mealPrep);

      expect(notificationManager.isTypeEnabled(NOTIFICATION_TYPES.mealPrep)).toBe(true);
      expect(notificationManager.isTypeEnabled(NOTIFICATION_TYPES.groceryDelivery)).toBe(false);
    });

    it('should validate notification type', async () => {
      await expect(notificationManager.enableType('invalid-type' as any)).rejects.toThrow('Invalid notification type');
      await expect(notificationManager.disableType('invalid-type' as any)).rejects.toThrow('Invalid notification type');
    });
  });

  describe('immediate notifications', () => {
    beforeEach(async () => {
      await notificationManager.init();
      (notificationManager as any).permission = PERMISSION.GRANTED;
      await notificationManager.enableType(NOTIFICATION_TYPES.mealPrep);
    });

    it('should show immediate notification', async () => {
      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Immediate Test',
        body: 'This should appear now',
      };

      // Mock Notification constructor
      const mockNotification = {
        show: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
      };
      (global as any).Notification = jest.fn().mockImplementation((title, options) => {
        expect(title).toBe(notification.title);
        expect(options.body).toBe(notification.body);
        expect(options.icon).toBeDefined();
        return mockNotification;
      });

      await notificationManager.show(notification);
      
      expect(mockNotification.show).toHaveBeenCalled();
    });

    it('should not show if permission denied', async () => {
      (notificationManager as any).permission = PERMISSION.DENIED;

      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Should not show',
        body: 'Test',
      };

      await expect(notificationManager.show(notification)).rejects.toThrow('Permission not granted');
    });

    it('should not show if type disabled', async () => {
      await notificationManager.disableType(NOTIFICATION_TYPES.mealPrep);

      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Should not show',
        body: 'Test',
      };

      await expect(notificationManager.show(notification)).rejects.toThrow('Notification type not enabled');
    });
  });

  describe('persistence', () => {
    beforeEach(async () => {
      await notificationManager.init();
    });

    it('should save preferences to database', async () => {
      await notificationManager.enableType(NOTIFICATION_TYPES.mealPrep);
      await notificationManager.enableType(NOTIFICATION_TYPES.groceryDelivery);

      const saved = await db.get('preferences', (notificationManager as any).storageKey);
      expect(saved.enabledTypes).toContain(NOTIFICATION_TYPES.mealPrep);
      expect(saved.enabledTypes).toContain(NOTIFICATION_TYPES.groceryDelivery);
    });

    it('should load preferences from database', async () => {
      // Save preferences directly to database
      const preferences = {
        enabledTypes: [NOTIFICATION_TYPES.mealPrep],
        permission: PERMISSION.GRANTED,
      };
      await db.put('preferences', preferences, (notificationManager as any).storageKey);

      // Create new manager to test loading
      const newManager = new PushNotificationManager();
      await newManager.init();

      expect(newManager.isTypeEnabled(NOTIFICATION_TYPES.mealPrep)).toBe(true);
      expect(newManager.isTypeEnabled(NOTIFICATION_TYPES.groceryDelivery)).toBe(false);
    });

    it('should handle corrupted preferences', async () => {
      // Save corrupted data
      await db.put('preferences', 'invalid-data', (notificationManager as any).storageKey);

      // Should not throw and should use defaults
      await expect(notificationManager.init()).resolves.toBeUndefined();
      expect(notificationManager.getStatus().enabledTypes).toEqual([]);
    });
  });

  describe('scheduled notification execution', () => {
    beforeEach(async () => {
      await notificationManager.init();
      (notificationManager as any).permission = PERMISSION.GRANTED;
      await notificationManager.enableType(NOTIFICATION_TYPES.mealPrep);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute scheduled notification', async () => {
      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Scheduled Test',
        body: 'This should appear after delay',
        scheduledTime: new Date(Date.now() + 5000), // 5 seconds from now
      };

      const mockNotification = {
        show: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
      };
      (global as any).Notification = jest.fn().mockReturnValue(mockNotification);

      const id = await notificationManager.schedule(notification);
      
      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Wait for async execution
      await jest.runAllTimers();

      expect(mockNotification.show).toHaveBeenCalled();
      expect((notificationManager as any).scheduledNotifications.has(id)).toBe(false);
    });

    it('should handle multiple scheduled notifications', async () => {
      const notifications = [
        {
          type: NOTIFICATION_TYPES.mealPrep,
          title: 'First',
          body: 'First notification',
          scheduledTime: new Date(Date.now() + 3000),
        },
        {
          type: NOTIFICATION_TYPES.groceryDelivery,
          title: 'Second',
          body: 'Second notification',
          scheduledTime: new Date(Date.now() + 6000),
        },
      ];

      await notificationManager.enableType(NOTIFICATION_TYPES.groceryDelivery);

      const mockNotification = {
        show: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
      };
      (global as any).Notification = jest.fn().mockReturnValue(mockNotification);

      const ids = await Promise.all(notifications.map(n => notificationManager.schedule(n)));
      
      // Fast-forward time
      jest.advanceTimersByTime(6000);
      await jest.runAllTimers();

      expect(mockNotification.show).toHaveBeenCalledTimes(2);
      ids.forEach(id => {
        expect((notificationManager as any).scheduledNotifications.has(id)).toBe(false);
      });
    });

    it('should not execute if permission revoked', async () => {
      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Should not execute',
        body: 'Test',
        scheduledTime: new Date(Date.now() + 5000),
      };

      const id = await notificationManager.schedule(notification);
      
      // Revoke permission before execution
      (notificationManager as any).permission = PERMISSION.DENIED;

      jest.advanceTimersByTime(5000);
      await jest.runAllTimers();

      expect((notificationManager as any).scheduledNotifications.has(id)).toBe(false);
    });
  });

  describe('notification interactions', () => {
    beforeEach(async () => {
      await notificationManager.init();
      (notificationManager as any).permission = PERMISSION.GRANTED;
      await notificationManager.enableType(NOTIFICATION_TYPES.mealPrep);
    });

    it('should handle notification click', async () => {
      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Clickable',
        body: 'Click me',
        data: { recipeId: '123' },
      };

      const mockNotification = {
        show: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
      };
      (global as any).Notification = jest.fn().mockReturnValue(mockNotification);

      await notificationManager.show(notification);

      // Simulate click event
      const clickHandler = mockNotification.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'click'
      )?.[1];

      if (clickHandler) {
        clickHandler();
      }

      // Should handle click appropriately (e.g., navigate to recipe)
      expect(mockNotification.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should handle notification close', async () => {
      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Closable',
        body: 'Close me',
      };

      const mockNotification = {
        show: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
      };
      (global as any).Notification = jest.fn().mockReturnValue(mockNotification);

      await notificationManager.show(notification);

      // Simulate close event
      const closeHandler = mockNotification.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      )?.[1];

      if (closeHandler) {
        closeHandler();
      }

      expect(mockNotification.addEventListener).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('error handling', () => {
    it('should handle missing Notification API', () => {
      // Temporarily remove Notification API
      const originalNotification = (global as any).Notification;
      delete (global as any).Notification;

      const manager = new PushNotificationManager();
      expect(manager.isSupported()).toBe(false);

      // Restore Notification API
      (global as any).Notification = originalNotification;
    });

    it('should handle Notification constructor errors', async () => {
      await notificationManager.init();
      (notificationManager as any).permission = PERMISSION.GRANTED;
      await notificationManager.enableType(NOTIFICATION_TYPES.mealPrep);

      (global as any).Notification = jest.fn().mockImplementation(() => {
        throw new Error('Notification failed');
      });

      const notification = {
        type: NOTIFICATION_TYPES.mealPrep,
        title: 'Error Test',
        body: 'This should fail',
      };

      await expect(notificationManager.show(notification)).rejects.toThrow('Notification failed');
    });

    it('should handle database errors', async () => {
      // Mock database to throw error
      const originalGet = db.get;
      db.get = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(notificationManager.init()).rejects.toThrow('Database error');

      // Restore original method
      db.get = originalGet;
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      await notificationManager.init();
    });

    it('should get all notification types', () => {
      const allTypes = notificationManager.getAllTypes();
      
      expect(Array.isArray(allTypes)).toBe(true);
      expect(allTypes).toContain(NOTIFICATION_TYPES.mealPrep);
      expect(allTypes).toContain(NOTIFICATION_TYPES.groceryDelivery);
      expect(allTypes).toContain(NOTIFICATION_TYPES.expiration);
      expect(allTypes).toContain(NOTIFICATION_TYPES.nutritionGoal);
      expect(allTypes).toContain(NOTIFICATION_TYPES.syncComplete);
    });

    it('should format notification title', () => {
      const formatted = (notificationManager as any).formatTitle(NOTIFICATION_TYPES.mealPrep);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should generate notification ID', () => {
      const id1 = (notificationManager as any).generateId();
      const id2 = (notificationManager as any).generateId();
      
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
    });

    it('should validate notification time', () => {
      const validTime = new Date(Date.now() + 60000);
      const invalidTime = new Date(Date.now() - 60000);

      expect((notificationManager as any).isValidTime(validTime)).toBe(true);
      expect((notificationManager as any).isValidTime(invalidTime)).toBe(false);
    });
  });
});
