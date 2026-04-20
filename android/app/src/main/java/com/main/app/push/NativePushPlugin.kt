package com.main.app.push

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Native Push Notification Plugin for Android
 * Schedules local notifications with native triggers (AlarmManager)
 */
@CapacitorPlugin(name = "NativePush")
class NativePushPlugin : Plugin() {

    private val CHANNEL_ID = "meal_planner_notifications"
    private val NOTIFICATION_ID_BASE = 1000

    override fun load() {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Meal Planner Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for meal prep, expirations, and reminders"
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    @PluginMethod
    fun scheduleNotification(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("Missing id parameter")
        val title = call.getString("title") ?: return call.reject("Missing title parameter")
        val body = call.getString("body") ?: return call.reject("Missing body parameter")
        val triggerType = call.getString("triggerType") ?: "immediate"
        val delaySeconds = call.getInt("delaySeconds") ?: 0

        val intent = Intent(context, NotificationReceiver::class.java).apply {
            putExtra("notification_id", id)
            putExtra("title", title)
            putExtra("body", body)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        when (triggerType) {
            "delayed" -> {
                val triggerTime = System.currentTimeMillis() + (delaySeconds * 1000L)
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
            "daily" -> {
                // Schedule for 9 AM daily
                val calendar = java.util.Calendar.getInstance().apply {
                    set(java.util.Calendar.HOUR_OF_DAY, 9)
                    set(java.util.Calendar.MINUTE, 0)
                    set(java.util.Calendar.SECOND, 0)
                    if (timeInMillis < System.currentTimeMillis()) {
                        add(java.util.Calendar.DAY_OF_MONTH, 1)
                    }
                }
                alarmManager.setRepeating(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    AlarmManager.INTERVAL_DAY,
                    pendingIntent
                )
            }
            "weekly" -> {
                // Schedule for Monday 9 AM weekly
                val calendar = java.util.Calendar.getInstance().apply {
                    set(java.util.Calendar.DAY_OF_WEEK, java.util.Calendar.MONDAY)
                    set(java.util.Calendar.HOUR_OF_DAY, 9)
                    set(java.util.Calendar.MINUTE, 0)
                    set(java.util.Calendar.SECOND, 0)
                    if (timeInMillis < System.currentTimeMillis()) {
                        add(java.util.Calendar.WEEK_OF_YEAR, 1)
                    }
                }
                alarmManager.setRepeating(
                    AlarmManager.RTC_WAKEUP,
                    calendar.timeInMillis,
                    AlarmManager.INTERVAL_DAY * 7,
                    pendingIntent
                )
            }
            else -> {
                // Immediate
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    System.currentTimeMillis() + 1000,
                    pendingIntent
                )
            }
        }

        call.resolve()
    }

    @PluginMethod
    fun cancelNotification(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("Missing id parameter")

        val intent = Intent(context, NotificationReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent)
        call.resolve()
    }

    @PluginMethod
    fun cancelAllNotifications(call: PluginCall) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancelAll()
        call.resolve()
    }

    @PluginMethod
    fun getPendingNotifications(call: PluginCall) {
        // Android doesn't provide a direct way to list scheduled alarms
        // Return empty array for compatibility
        call.resolve(org.json.JSONObject().put("notifications", org.json.JSONArray()))
    }
}
