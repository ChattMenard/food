# Native Push Notification Setup

## Overview
Native push notifications use platform-specific scheduling triggers for more reliable timing:
- **iOS**: UNCalendarNotificationTrigger and UNTimeIntervalNotificationTrigger
- **Android**: AlarmManager with precise timing

This provides better reliability than Service Worker-based notifications, especially when the app is in the background.

## Files Created

### iOS
- `ios/App/App/NativePushPlugin.swift` - iOS native push plugin using UserNotifications framework

### Android
- `android/app/src/main/java/com/main/app/push/NativePushPlugin.kt` - Android native push plugin
- `android/app/src/main/java/com/main/app/push/NotificationReceiver.kt` - BroadcastReceiver for notifications
- Updated `android/app/src/main/AndroidManifest.xml` - Registered NotificationReceiver

### JavaScript
- `www/js/native/nativePush.js` - JavaScript wrapper for native push plugin

## Trigger Types

- `immediate`: Show notification immediately (for testing)
- `delayed`: Show after specified delay (delaySeconds parameter)
- `daily`: Show every day at 9 AM
- `weekly`: Show every Monday at 9 AM

## Usage

### Import in your app

```javascript
import { scheduleNativeNotification, cancelNativeNotification } from './js/native/nativePush.js';
```

### Schedule a notification

```javascript
await scheduleNativeNotification({
    id: 'meal_prep_reminder',
    title: 'Meal Prep Time',
    body: 'Don\'t forget to prep your meals for the week!',
    triggerType: 'weekly'
});
```

### Cancel a notification

```javascript
await cancelNativeNotification('meal_prep_reminder');
```

### Convenience functions

```javascript
import { scheduleMealPrepReminder, scheduleExpirationCheck } from './js/native/nativePush.js';

// Schedule weekly meal prep reminder
await scheduleMealPrepReminder();

// Schedule daily expiration check
await scheduleExpirationCheck();
```

## Platform-Specific Notes

### iOS
- Requires iOS 10+ for UserNotifications framework
- Notifications are scheduled through UNUserNotificationCenter
- System handles exact timing even when app is suspended

### Android
- Uses AlarmManager with setExactAndAllowWhileIdle for precise timing
- NotificationChannel created automatically on app load
- Works even when device is in Doze mode

## Integration with Existing pushNotifications.js

The existing pushNotifications.js uses Service Worker for notifications. You can optionally integrate native scheduling for better reliability:

```javascript
// In pushNotifications.js, replace Service Worker scheduling with native
import { scheduleNativeNotification } from '../native/nativePush.js';

async scheduleNotification(type, data) {
    if (Capacitor.getPlatform() !== 'web') {
        // Use native scheduling on mobile
        await scheduleNativeNotification({
            id: type,
            title: data.title,
            body: data.body,
            triggerType: data.triggerType
        });
    } else {
        // Use Service Worker on web
        // ... existing SW code
    }
}
```

## Testing

1. Build and run on iOS device (simulator may have timing issues)
2. Build and run on Android device/emulator
3. Test each trigger type
4. Verify notifications appear at correct times

## Troubleshooting

**iOS notifications not appearing:**
- Ensure notification permission is granted
- Check that UNUserNotificationCenter is properly configured
- Verify the app is in background (notifications don't show when app is foreground)

**Android notifications not appearing:**
- Check POST_NOTIFICATIONS permission is granted
- Verify NotificationChannel is created
- Look for errors in logcat
- Ensure AlarmManager is not being restricted by battery optimization

## Benefits Over Service Worker

- More precise timing (native OS scheduling)
- Works reliably when app is in background
- No dependency on Service Worker lifecycle
- Platform-specific optimizations
