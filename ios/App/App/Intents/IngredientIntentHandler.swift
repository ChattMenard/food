import Intents
import Capacitor

// MARK: - Add Ingredient Intent Handler
@objc(AddIngredientIntentHandler)
public class AddIngredientIntentHandler: NSObject, INAddTasksIntentHandling {
    
    public func handle(intent: INAddTasksIntent, completion: @escaping (INAddTasksIntentResponse) -> Void) {
        let response = INAddTasksIntentResponse(code: .success, userActivity: nil)
        completion(response)
    }
}

// MARK: - Intent Definition Helper
@objc(SiriShortcutsManager)
public class SiriShortcutsManager: CAPPlugin {
    
    @objc func donateAddIngredient(_ call: CAPPluginCall) {
        guard let ingredient = call.getString("ingredient") else {
            call.reject("Missing ingredient parameter")
            return
        }
        
        let intent = INAddTasksIntent()
        let activity = NSUserActivity(activityType: "com.main.app.addIngredient")
        activity.title = "Add \(ingredient) to Pantry"
        activity.userInfo = ["ingredient": ingredient]
        activity.isEligibleForPrediction = true
        activity.persistentIdentifier = "add_ingredient_\(ingredient)"
        
        intent.suggestedInvocationPhrase = "Add \(ingredient) to pantry"
        
        let interaction = INInteraction(intent: intent, response: nil)
        interaction.identifier = "add_ingredient_\(ingredient)"
        
        interaction.donate { error in
            if let error = error {
                call.reject("Failed to donate shortcut: \(error.localizedDescription)")
            } else {
                call.resolve()
            }
        }
    }
    
    @objc func donateAddMeal(_ call: CAPPluginCall) {
        guard let meal = call.getString("meal") else {
            call.reject("Missing meal parameter")
            return
        }
        
        let activity = NSUserActivity(activityType: "com.main.app.addMeal")
        activity.title = "Add \(meal) to Meal Plan"
        activity.userInfo = ["meal": meal]
        activity.isEligibleForPrediction = true
        activity.persistentIdentifier = "add_meal_\(meal)"
        
        activity.suggestedInvocationPhrase = "Add \(meal) to meal plan"
        
        let interaction = INInteraction(activity: activity, response: nil)
        interaction.identifier = "add_meal_\(meal)"
        
        interaction.donate { error in
            if let error = error {
                call.reject("Failed to donate shortcut: \(error.localizedDescription)")
            } else {
                call.resolve()
            }
        }
    }
}
