export class MealPlanSharing {
    constructor({ getMealPlan, setMealPlan, persistMealPlan, announce }) {
        this.getMealPlan = getMealPlan;
        this.setMealPlan = setMealPlan;
        this.persistMealPlan = persistMealPlan;
        this.announce = announce;
    }

    exportMealPlan() {
        const mealPlan = this.getMealPlan();
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            mealPlan: mealPlan
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `meal-plan-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.announce('Meal plan exported successfully');
    }

    exportToICal() {
        const mealPlan = this.getMealPlan();
        const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const now = new Date();
        
        let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Main//Meal Plan Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Meal Plan
X-WR-TIMEZONE:America/New_York
X-WR-CALDESC:Weekly meal plan from Main
`;

        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Start from Monday

        Object.entries(mealPlan).forEach(([day, mealName]) => {
            if (!mealName) return;
            
            const dayIndex = DAYS.indexOf(day);
            const eventDate = new Date(startDate);
            eventDate.setDate(startDate.getDate() + dayIndex);
            
            const dateStr = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const endDate = new Date(eventDate);
            endDate.setHours(endDate.getHours() + 2);
            const endDateStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const uid = `${mealName.replace(/\s/g, '')}-${dateStr}@main`;

            icalContent += `BEGIN:VEVENT
DTSTART:${dateStr}
DTEND:${endDateStr}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
UID:${uid}
SUMMARY:${mealName}
DESCRIPTION:Meal from your Main meal plan
END:VEVENT
`;
        });

        icalContent += `END:VCALENDAR`;

        const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `meal-plan-calendar.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.announce('Calendar exported successfully');
    }

    importMealPlan(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.mealPlan || typeof data.mealPlan !== 'object') {
                        throw new Error('Invalid meal plan file format');
                    }

                    this.setMealPlan(data.mealPlan);
                    this.persistMealPlan();
                    this.announce('Meal plan imported successfully');
                    resolve(data.mealPlan);
                } catch (error) {
                    this.announce('Failed to import meal plan: Invalid file format');
                    reject(error);
                }
            };
            reader.onerror = () => {
                this.announce('Failed to import meal plan: Error reading file');
                reject(new Error('Error reading file'));
            };
            reader.readAsText(file);
        });
    }

    copyMealPlanToClipboard() {
        const mealPlan = this.getMealPlan();
        const text = JSON.stringify(mealPlan, null, 2);
        
        navigator.clipboard.writeText(text).then(() => {
            this.announce('Meal plan copied to clipboard');
        }).catch(() => {
            this.announce('Failed to copy meal plan to clipboard');
        });
    }
}
