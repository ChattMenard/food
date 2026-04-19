import db from '../db.js';

class NutritionDashboard {
    constructor(container, appRef = null) {
        this.container = container;
        this.appRef = appRef;
    }

    async render() {
        const weeklyData = await db.getWeeklyNutrition();

        this.container.innerHTML = `
            <div class="nutrition-dashboard p-4 space-y-6">
                ${this.renderHeader()}
                ${this.renderMacroSummary(weeklyData)}
                ${this.renderInsights(weeklyData)}
                ${this.renderMicronutrients(weeklyData)}
                ${this.renderMealHistory(weeklyData)}
            </div>
        `;
    }

    renderHeader() {
        const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">Nutrition Dashboard</h2>
                    <p class="text-gray-600">${today}</p>
                </div>
                <div class="flex gap-2">
                    <button id="nutrition-export"
                            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        Export Report
                    </button>
                    <button id="nutrition-goals"
                            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Set Goals
                    </button>
                </div>
            </div>
        `;
    }

    renderMacroSummary(weeklyData) {
        const today = weeklyData[weeklyData.length - 1] || { totals: {} };
        const totals = today.totals || {};

        const goals = this.getGoals();

        return `
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                ${this.renderMacroCard('Calories', totals.calories || 0, goals.calories, 'kcal')}
                ${this.renderMacroCard('Protein', totals.protein || 0, goals.protein, 'g')}
                ${this.renderMacroCard('Fat', totals.fat || 0, goals.fat, 'g')}
                ${this.renderMacroCard('Carbs', totals.carbs || 0, goals.carbs, 'g')}
                ${this.renderMacroCard('Fiber', totals.fiber || 0, goals.fiber, 'g')}
            </div>
        `;
    }

    renderMacroCard(label, current, goal, unit) {
        const safeGoal = Math.max(1, Number(goal) || 1);
        const rawPercentage = (Number(current) / safeGoal) * 100;
        const color = rawPercentage > 100 ? 'bg-red-500' : rawPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500';
        const percentage = Math.min(100, rawPercentage);

        return `
            <div class="bg-white rounded-lg shadow p-4">
                <div class="text-sm text-gray-600 mb-1">${label}</div>
                <div class="text-2xl font-bold">${Math.round(current)}/${safeGoal}${unit}</div>
                <div class="mt-2 h-2 bg-gray-200 rounded-full">
                    <div class="h-2 ${color} rounded-full" style="width: ${percentage}%"></div>
                </div>
                <div class="text-xs text-gray-500 mt-1">${Math.round(percentage)}% of daily goal</div>
            </div>
        `;
    }

    renderInsights(weeklyData) {
        const insights = this.generateInsights(weeklyData);

        return `
            <div class="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-6">
                <h3 class="text-lg font-semibold mb-4">Personalized Insights</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${insights.map(insight => `
                        <div class="bg-white rounded-lg p-4 shadow-sm">
                            <div class="font-medium text-gray-800">${insight.title}</div>
                            <div class="text-sm text-gray-600">${insight.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateInsights(weeklyData) {
        const today = weeklyData[weeklyData.length - 1] || { totals: {} };
        const totals = today.totals || {};
        const goals = this.getGoals();

        const avgCalories = Math.round(
            weeklyData.reduce((sum, day) => sum + (day.totals?.calories || 0), 0) / Math.max(1, weeklyData.length)
        );

        const proteinPct = ((totals.protein || 0) / Math.max(1, goals.protein)) * 100;
        const fiberPct = ((totals.fiber || 0) / Math.max(1, goals.fiber)) * 100;

        const insights = [];

        insights.push({
            title: 'Weekly Calorie Average',
            description: `${avgCalories} kcal/day over the last 7 days.`
        });

        insights.push({
            title: 'Protein Progress',
            description: proteinPct >= 100
                ? 'Great job. You reached your protein goal today.'
                : `You are at ${Math.round(proteinPct)}% of your protein target.`
        });

        insights.push({
            title: 'Fiber Status',
            description: fiberPct >= 100
                ? 'Fiber goal met. Keep this pattern.'
                : `You are at ${Math.round(fiberPct)}% of your fiber target.`
        });

        if ((totals.sodium || 0) > 2300) {
            insights.push({
                title: 'Sodium Alert',
                description: 'Sodium intake is above 2300mg today. Consider lower-sodium meal options.'
            });
        } else {
            insights.push({
                title: 'Sodium Check',
                description: 'Sodium intake is within a common daily guideline range.'
            });
        }

        return insights.slice(0, 4);
    }

    renderMicronutrients(weeklyData) {
        const today = weeklyData[weeklyData.length - 1] || { totals: {} };
        const sodium = Math.round(today.totals?.sodium || 0);
        const sugar = Math.round(today.totals?.sugar || 0);

        return `
            <div class="bg-white rounded-lg shadow p-4">
                <h3 class="text-lg font-semibold mb-3">Additional Nutrition</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <div class="text-gray-500">Sodium</div>
                        <div class="text-xl font-semibold">${sodium} mg</div>
                    </div>
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <div class="text-gray-500">Sugar</div>
                        <div class="text-xl font-semibold">${sugar} g</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMealHistory(weeklyData) {
        const rows = weeklyData.flatMap(day => (day.meals || []).map(meal => ({
            date: day.date,
            recipeName: meal.recipeName,
            servings: meal.servings,
            calories: Math.round(meal.nutrition?.calories || 0)
        })));

        if (rows.length === 0) {
            return `
                <div class="bg-white rounded-lg shadow p-4">
                    <h3 class="text-lg font-semibold mb-3">Meal History</h3>
                    <p class="text-sm text-gray-500">No nutrition logs yet. Log meals from recipe actions to populate this dashboard.</p>
                </div>
            `;
        }

        return `
            <div class="bg-white rounded-lg shadow p-4">
                <h3 class="text-lg font-semibold mb-3">Meal History (7 days)</h3>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                    ${rows.map(row => `
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm">
                            <div>
                                <div class="font-medium">${row.recipeName}</div>
                                <div class="text-gray-500">${row.date} · ${row.servings} serving(s)</div>
                            </div>
                            <div class="font-semibold">${row.calories} kcal</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getGoals() {
        return JSON.parse(localStorage.getItem('nutritionGoals') || 'null') || {
            calories: 2000,
            protein: 50,
            fat: 70,
            carbs: 310,
            fiber: 30
        };
    }

    attachEvents() {
        const exportBtn = document.getElementById('nutrition-export');
        const goalsBtn = document.getElementById('nutrition-goals');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (this.appRef && typeof this.appRef.exportNutritionReport === 'function') {
                    this.appRef.exportNutritionReport();
                }
            });
        }

        if (goalsBtn) {
            goalsBtn.addEventListener('click', () => {
                if (this.appRef && typeof this.appRef.setNutritionGoals === 'function') {
                    this.appRef.setNutritionGoals();
                }
            });
        }
    }
}

export default NutritionDashboard;
