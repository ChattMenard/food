import Foundation
import Capacitor
import WidgetKit

// MARK: - Widget Data Manager
@objc(WidgetDataManager)
public class WidgetDataManager: CAPPlugin {
    
    // App Group identifier - must match Xcode configuration
    private let appGroupIdentifier = "group.com.main.app"
    
    // UserDefaults for sharing data with widget
    private lazy var sharedDefaults: UserDefaults = {
        guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
            fatalError("Unable to create UserDefaults with app group identifier")
        }
        return defaults
    }()
    
    // MARK: - Update Widget Data
    @objc func updateWidgetData(_ call: CAPPluginCall) {
        guard let pantryCount = call.getInt("pantryCount"),
              let mealPlanCount = call.getInt("mealPlanCount") else {
            call.reject("Missing required parameters")
            return
        }
        
        let upcomingMeal = call.getString("upcomingMeal") ?? ""
        let nextExpiration = call.getString("nextExpiration") ?? ""
        
        // Save to shared UserDefaults
        sharedDefaults.set(pantryCount, forKey: "widgetPantryCount")
        sharedDefaults.set(mealPlanCount, forKey: "widgetMealPlanCount")
        sharedDefaults.set(upcomingMeal, forKey: "widgetUpcomingMeal")
        sharedDefaults.set(nextExpiration, forKey: "widgetNextExpiration")
        sharedDefaults.set(Date(), forKey: "widgetLastUpdate")
        
        // Reload all widget timelines
        WidgetCenter.shared.reloadAllTimelines()
        
        call.resolve()
    }
    
    // MARK: - Get Widget Data (for debugging)
    @objc func getWidgetData(_ call: CAPPluginCall) {
        let data: [String: Any] = [
            "pantryCount": sharedDefaults.integer(forKey: "widgetPantryCount"),
            "mealPlanCount": sharedDefaults.integer(forKey: "widgetMealPlanCount"),
            "upcomingMeal": sharedDefaults.string(forKey: "widgetUpcomingMeal") ?? "",
            "nextExpiration": sharedDefaults.string(forKey: "widgetNextExpiration") ?? "",
            "lastUpdate": sharedDefaults.object(forKey: "widgetLastUpdate") ?? ""
        ]
        
        call.resolve(data)
    }
}
