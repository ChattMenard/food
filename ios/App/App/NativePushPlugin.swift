import UserNotifications
import Capacitor

/**
 * Native Push Notification Plugin for iOS
 * Schedules local notifications with native triggers (UNCalendarNotificationTrigger)
 */
@objc(NativePushPlugin)
public class NativePushPlugin: CAPPlugin {
    
    @objc func scheduleNotification(_ call: CAPPluginCall) {
        guard let id = call.getString("id"),
              let title = call.getString("title"),
              let body = call.getString("body") else {
            call.reject("Missing required parameters: id, title, body")
            return
        }
        
        let triggerType = call.getString("triggerType") ?? "immediate"
        let delaySeconds = call.getInt("delaySeconds") ?? 0
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = UNNotificationSound.default
        
        let trigger: UNNotificationTrigger
        switch triggerType {
        case "delayed":
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(delaySeconds), repeats: false)
        case "daily":
            let dateComponents = DateComponents(hour: 9, minute: 0) // 9 AM daily
            trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        case "weekly":
            var dateComponents = DateComponents()
            dateComponents.weekday = 1 // Monday
            dateComponents.hour = 9
            dateComponents.minute = 0
            trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        default:
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        }
        
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                call.reject("Failed to schedule notification: \(error.localizedDescription)")
            } else {
                call.resolve()
            }
        }
    }
    
    @objc func cancelNotification(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Missing id parameter")
            return
        }
        
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
        call.resolve()
    }
    
    @objc func cancelAllNotifications(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        call.resolve()
    }
    
    @objc func getPendingNotifications(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            let notifications = requests.map { request -> [String: Any] in
                [
                    "id": request.identifier,
                    "title": request.content.title,
                    "body": request.content.body
                ]
            }
            call.resolve(["notifications": notifications])
        }
    }
}
