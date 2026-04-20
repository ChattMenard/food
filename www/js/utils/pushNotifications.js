/**
 * Push Notification Manager
 * Handles push notifications, scheduling, and subscription management
 * Integrates with Service Worker for background notifications
 */

import db from '../data/db.js';

// Notification permission states
const PERMISSION = {
    GRANTED: 'granted',
    DENIED: 'denied',
    DEFAULT: 'default'
};

// Notification types with their settings
const NOTIFICATION_TYPES = {
    mealPrep: {
        id: 'mealPrep',
        title: 'Meal Prep Reminder',
        description: 'Reminds you to prep meals on your scheduled prep day',
        defaultEnabled: true,
        schedule: 'weekly'
    },
    expiration: {
        id: 'expiration',
        title: 'Food Expiration',
        description: 'Alerts when pantry items are expiring soon',
        defaultEnabled: true,
        schedule: 'daily'
    },
    groceryDelivery: {
        id: 'groceryDelivery',
        title: 'Grocery Delivery',
        description: 'Reminds to place grocery orders for meal plans',
        defaultEnabled: false,
        schedule: 'weekly'
    },
    nutritionGoal: {
        id: 'nutritionGoal',
        title: 'Nutrition Goals',
        description: 'Daily progress updates on nutrition goals',
        defaultEnabled: false,
        schedule: 'daily'
    },
    syncComplete: {
        id: 'syncComplete',
        title: 'Sync Status',
        description: 'Notifies when cross-device sync completes',
        defaultEnabled: false,
        schedule: 'immediate'
    }
};

class PushNotificationManager {
    constructor() {
        this.permission = PERMISSION.DEFAULT;
        this.subscriptions = new Map();
        this.scheduledNotifications = new Map();
        this.typeSettings = {};
        this.storageKey = 'notification-settings';
        this.listeners = [];
        this.swRegistration = null;
    }

    /**
     * Initialize notification manager
     */
    async init() {
        // Check current permission
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }

        // Load saved settings
        await this.loadSettings();

        // Try to get service worker registration (with timeout to avoid hanging)
        if ('serviceWorker' in navigator) {
            try {
                const swReady = Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 3000))
                ]);
                this.swRegistration = await swReady;
            } catch (e) {
                console.warn('[PushNotifications] Service worker not available:', e.message);
            }
        }

        console.log('[PushNotifications] Initialized:', {
            permission: this.permission,
            typesEnabled: this.getEnabledTypes()
        });

        return this.getStatus();
    }

    /**
     * Request notification permission
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            return { granted: false, error: 'Notifications not supported' };
        }

        try {
            const result = await Notification.requestPermission();
            this.permission = result;
            
            this.notifyListeners('permission-change', { permission: result });
            
            return { 
                granted: result === PERMISSION.GRANTED,
                permission: result 
            };
        } catch (err) {
            return { granted: false, error: err.message };
        }
    }

    /**
     * Load notification settings from IndexedDB
     */
    async loadSettings() {
        await db.ready;
        
        const stored = await db.get('preferences', this.storageKey);
        
        if (stored && stored.value) {
            this.typeSettings = stored.value.types || {};
        } else {
            // Initialize with defaults
            this.typeSettings = this.getDefaultSettings();
        }
    }

    /**
     * Save notification settings to IndexedDB
     */
    async saveSettings() {
        await db.ready;
        
        await db.put('preferences', {
            key: this.storageKey,
            value: {
                types: this.typeSettings,
                updatedAt: Date.now()
            },
            updatedAt: Date.now()
        });
        
        this.notifyListeners('settings-change', this.typeSettings);
    }

    /**
     * Get default settings for all types
     */
    getDefaultSettings() {
        const defaults = {};
        Object.values(NOTIFICATION_TYPES).forEach(type => {
            defaults[type.id] = {
                enabled: type.defaultEnabled,
                schedule: type.schedule
            };
        });
        return defaults;
    }

    /**
     * Enable/disable notification type
     */
    async setTypeEnabled(typeId, enabled) {
        if (!NOTIFICATION_TYPES[typeId]) {
            throw new Error(`Unknown notification type: ${typeId}`);
        }
        
        this.typeSettings[typeId] = {
            ...this.typeSettings[typeId],
            enabled
        };
        
        await this.saveSettings();
        
        // Reschedule if enabled
        if (enabled) {
            this.scheduleType(typeId);
        } else {
            this.cancelScheduledType(typeId);
        }
        
        return this.typeSettings[typeId];
    }

    /**
     * Get all notification type settings
     */
    getTypeSettings() {
        return Object.values(NOTIFICATION_TYPES).map(type => ({
            ...type,
            settings: this.typeSettings[type.id] || { enabled: type.defaultEnabled }
        }));
    }

    /**
     * Get enabled notification types
     */
    getEnabledTypes() {
        return Object.keys(this.typeSettings).filter(
            id => this.typeSettings[id]?.enabled
        );
    }

    /**
     * Show immediate notification
     */
    async show(title, options = {}) {
        if (this.permission !== PERMISSION.GRANTED) {
            return { shown: false, error: 'Permission not granted' };
        }

        const defaultOptions = {
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            tag: 'main-notification',
            requireInteraction: false,
            silent: false
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            // Use service worker if available (for background persistence)
            if (this.swRegistration && this.swRegistration.showNotification) {
                await this.swRegistration.showNotification(title, finalOptions);
            } else {
                // Fallback to regular notification
                new Notification(title, finalOptions);
            }
            
            return { shown: true };
        } catch (err) {
            return { shown: false, error: err.message };
        }
    }

    /**
     * Schedule notifications for enabled types
     */
    scheduleAllEnabled() {
        this.getEnabledTypes().forEach(typeId => {
            this.scheduleType(typeId);
        });
    }

    /**
     * Schedule specific notification type
     */
    scheduleType(typeId) {
        // Cancel existing schedule
        this.cancelScheduledType(typeId);
        
        const config = NOTIFICATION_TYPES[typeId];
        if (!config) return;

        switch (config.schedule) {
            case 'daily':
                this.scheduleDaily(typeId);
                break;
            case 'weekly':
                this.scheduleWeekly(typeId);
                break;
            case 'immediate':
                // No scheduling needed - triggered by events
                break;
        }
    }

    /**
     * Schedule daily notification
     */
    scheduleDaily(typeId) {
        // For now, just log the schedule
        // In production, this would use a service worker periodic sync
        console.log(`[PushNotifications] Daily schedule: ${typeId}`);
        
        // Store reference for cancellation
        this.scheduledNotifications.set(typeId, { type: 'daily' });
    }

    /**
     * Schedule weekly notification
     */
    scheduleWeekly(typeId) {
        console.log(`[PushNotifications] Weekly schedule: ${typeId}`);
        this.scheduledNotifications.set(typeId, { type: 'weekly' });
    }

    /**
     * Cancel scheduled notifications for a type
     */
    cancelScheduledType(typeId) {
        const existing = this.scheduledNotifications.get(typeId);
        if (existing) {
            console.log(`[PushNotifications] Cancelled: ${typeId}`);
            this.scheduledNotifications.delete(typeId);
        }
    }

    /**
     * Trigger meal prep notification
     */
    async triggerMealPrep(prepPlan) {
        if (!this.typeSettings.mealPrep?.enabled) return;
        
        return this.show('Time to Meal Prep!', {
            body: `Prep ${prepPlan.recipes.length} recipes for the week`,
            tag: 'meal-prep',
            actions: [
                { action: 'view', title: 'View Plan' },
                { action: 'snooze', title: 'Snooze 1h' }
            ],
            data: { type: 'mealPrep', plan: prepPlan }
        });
    }

    /**
     * Trigger expiration warning
     */
    async triggerExpiration(expiringItems) {
        if (!this.typeSettings.expiration?.enabled) return;
        if (expiringItems.length === 0) return;
        
        const itemNames = expiringItems.slice(0, 3).map(i => i.name).join(', ');
        const more = expiringItems.length > 3 ? ` and ${expiringItems.length - 3} more` : '';
        
        return this.show('Items Expiring Soon', {
            body: `${itemNames}${more} will expire soon`,
            tag: 'expiration',
            actions: [
                { action: 'view', title: 'View Pantry' }
            ],
            data: { type: 'expiration', items: expiringItems }
        });
    }

    /**
     * Trigger grocery delivery reminder
     */
    async triggerGroceryReminder(shoppingList) {
        if (!this.typeSettings.groceryDelivery?.enabled) return;
        
        return this.show('Grocery Order Reminder', {
            body: `You have ${shoppingList.length} items on your shopping list`,
            tag: 'grocery',
            actions: [
                { action: 'order', title: 'Order Now' },
                { action: 'snooze', title: 'Tomorrow' }
            ],
            data: { type: 'groceryDelivery', list: shoppingList }
        });
    }

    /**
     * Trigger nutrition goal update
     */
    async triggerNutritionUpdate(progress) {
        if (!this.typeSettings.nutritionGoal?.enabled) return;
        
        const percentage = Math.round(progress.percentage);
        
        return this.show('Daily Nutrition Progress', {
            body: `You've reached ${percentage}% of your daily goals`,
            tag: 'nutrition',
            data: { type: 'nutritionGoal', progress }
        });
    }

    /**
     * Trigger sync complete notification
     */
    async triggerSyncComplete(syncResult) {
        if (!this.typeSettings.syncComplete?.enabled) return;
        
        return this.show('Sync Complete', {
            body: `Data synced from ${syncResult.deviceName || 'another device'}`,
            tag: 'sync',
            silent: true, // Less intrusive
            data: { type: 'syncComplete', result: syncResult }
        });
    }

    /**
     * Subscribe to push notifications (for server-sent push)
     */
    async subscribeToPush() {
        if (!this.swRegistration) {
            return { subscribed: false, error: 'Service Worker not available' };
        }

        try {
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    'BEl62iTMg5A8F4pklCN9x9w0wS9z8z8z8z8z8z8z8z8z8z8z8z8z8z8z8' // Placeholder key
                )
            });

            this.subscriptions.set('push', subscription);
            
            // In production, send subscription to server
            console.log('[PushNotifications] Push subscription:', subscription.endpoint);
            
            return { subscribed: true, subscription };
        } catch (err) {
            return { subscribed: false, error: err.message };
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribeFromPush() {
        const subscription = this.subscriptions.get('push');
        if (!subscription) return { unsubscribed: false };

        try {
            await subscription.unsubscribe();
            this.subscriptions.delete('push');
            return { unsubscribed: true };
        } catch (err) {
            return { unsubscribed: false, error: err.message };
        }
    }

    /**
     * Helper: Convert base64 to Uint8Array for VAPID key
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Check if notifications are supported
     */
    isSupported() {
        return 'Notification' in window;
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            supported: this.isSupported(),
            permission: this.permission,
            enabled: this.permission === PERMISSION.GRANTED,
            enabledTypes: this.getEnabledTypes(),
            allTypes: this.getTypeSettings(),
            hasPushSubscription: this.subscriptions.has('push')
        };
    }

    /**
     * Subscribe to notification events
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    notifyListeners(event, data) {
        this.listeners.forEach(cb => {
            try {
                cb(event, data);
            } catch (err) {
                console.warn('[PushNotifications] Listener error:', err);
            }
        });
    }
}

const pushNotifications = new PushNotificationManager();
export default pushNotifications;
export { PushNotificationManager, NOTIFICATION_TYPES, PERMISSION };
