import WidgetKit
import SwiftUI
import Intents

// MARK: - Widget Entry
struct MealWidgetEntry: TimelineEntry {
    let date: Date
    let pantryCount: Int
    let mealPlanCount: Int
    let upcomingMeal: String?
    let nextExpiration: String?
}

// MARK: - Timeline Provider
struct MealWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> MealWidgetEntry {
        MealWidgetEntry(
            date: Date(),
            pantryCount: 5,
            mealPlanCount: 7,
            upcomingMeal: "Pasta Primavera",
            nextExpiration: "Chicken (2 days)"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (MealWidgetEntry) -> Void) {
        let entry = MealWidgetEntry(
            date: Date(),
            pantryCount: 5,
            mealPlanCount: 7,
            upcomingMeal: "Pasta Primavera",
            nextExpiration: "Chicken (2 days)"
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MealWidgetEntry>) -> Void) {
        // Fetch data from shared UserDefaults (App Group)
        let appGroupIdentifier = "group.com.main.app"
        guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
            // Fallback to placeholder data if app group fails
            let currentDate = Date()
            let entries = [MealWidgetEntry(date: currentDate, pantryCount: 0, mealPlanCount: 0, upcomingMeal: nil, nextExpiration: nil)]
            completion(Timeline(entries: entries, policy: .atEnd))
            return
        }
        
        let pantryCount = sharedDefaults.integer(forKey: "widgetPantryCount")
        let mealPlanCount = sharedDefaults.integer(forKey: "widgetMealPlanCount")
        let upcomingMeal = sharedDefaults.string(forKey: "widgetUpcomingMeal")
        let nextExpiration = sharedDefaults.string(forKey: "widgetNextExpiration")
        
        let currentDate = Date()
        let entries = [
            MealWidgetEntry(
                date: currentDate,
                pantryCount: pantryCount,
                mealPlanCount: mealPlanCount,
                upcomingMeal: upcomingMeal,
                nextExpiration: nextExpiration
            )
        ]

        // Update every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Widget View
struct MealWidgetEntryView: View {
    var entry: MealWidgetProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "fork.knife")
                    .foregroundColor(.orange)
                Text("Meal Planner")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
            }

            Divider()

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "cube.box.fill")
                        .foregroundColor(.green)
                        .font(.caption)
                    Text("\(entry.pantryCount) items in pantry")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.blue)
                        .font(.caption)
                    Text("\(entry.mealPlanCount) meals planned")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let meal = entry.upcomingMeal {
                    HStack {
                        Image(systemName: "clock")
                            .foregroundColor(.purple)
                            .font(.caption)
                        Text("Next: \(meal)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let expiration = entry.nextExpiration {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.red)
                            .font(.caption)
                        Text("Expires: \(expiration)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
    }
}

// MARK: - Widget Configuration
struct MealWidget: Widget {
    let kind: String = "MealWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MealWidgetProvider()) { entry in
            MealWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Meal Planner")
        .description("See your pantry count and upcoming meals")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget Bundle
@main
struct MealWidgets: WidgetBundle {
    var body: some Widget {
        MealWidget()
    }
}
