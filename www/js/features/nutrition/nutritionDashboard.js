// @ts-check
/**
 * Nutrition Dashboard Module
 * Provides visualization and analysis of meal history and nutrition data
 */

import { MealHistoryAnalytics } from './mealHistoryAnalytics.js';
import db from '../../data/db.js';

/**
 * @typedef {import('../../types/index').NutritionData} NutritionData
 */

/**
 * @typedef {NutritionData & {
 *   fiber?: number;
 *   sugar?: number;
 *   sodium?: number;
 * }} NutritionTotals
 */
/**
 * @typedef {{
 *   id?: number;
 *   date: string;
 *   recipeId: number;
 *   recipeName: string;
 *   servings: number;
 *   meals?: never;
 *   totals?: never;
 *   nutrition: NutritionTotals;
 * }} NutritionLogEntry
 */
/**
 * @typedef {{
 *   date: string;
 *   meals: NutritionLogEntry[];
 *   totals: NutritionTotals;
 * }} WeeklyNutritionDay
 */

export class NutritionDashboard {
    /** @param {{ getDailyNutrition(date: Date|string): Promise<unknown>; getWeeklyNutrition(): Promise<unknown[]>; logNutrition(date: Date|string, recipeId: number, servings: number): Promise<unknown>; getAll(store: string): Promise<unknown[]> }} db */
    constructor(db) {
        this.db = db;
        this.currentDate = new Date();
    }
    
    /**
     * Get daily nutrition data from IndexedDB
     * @param {Date|string} date - Date to query
     * @returns {Promise<Object>} Daily nutrition data
     */
    async getDailyNutrition(date) {
        return this.db.getDailyNutrition(date);
    }
    
    /**
     * Get weekly nutrition data
     * @returns {Promise<any[]>} Array of daily nutrition objects
     */
    async getWeeklyNutrition() {
        return this.db.getWeeklyNutrition();
    }
    
    /**
     * Log a meal with nutrition data
     * @param {number} recipeId - Recipe ID
     * @param {number} servings - Number of servings
     * @param {Date|string} date - Date of meal
     * @returns {Promise<Object>} Logged nutrition entry
     */
    async logMeal(recipeId, servings, date = new Date()) {
        return this.db.logNutrition(date, recipeId, servings);
    }
    
    /**
     * Calculate nutrition goals progress
     * @param {NutritionTotals} dailyTotals - Daily nutrition totals
     * @param {Partial<NutritionTotals>} goals - Nutrition goals
     * @returns {{ calories: number; protein: number; carbs: number; fat: number; fiber: number }} Progress percentages
     */
    calculateProgress(dailyTotals, goals = {}) {
        const defaultGoals = {
            calories: 2000,
            protein: 50,
            carbs: 250,
            fat: 70,
            fiber: 25
        };
        
        const mergedGoals = { ...defaultGoals, ...goals };
        
        return {
            calories: Math.min(100, (dailyTotals.calories / mergedGoals.calories) * 100),
            protein: Math.min(100, (dailyTotals.protein / mergedGoals.protein) * 100),
            carbs: Math.min(100, (dailyTotals.carbs / mergedGoals.carbs) * 100),
            fat: Math.min(100, (dailyTotals.fat / mergedGoals.fat) * 100),
            fiber: Math.min(100, ((dailyTotals.fiber ?? 0) / mergedGoals.fiber) * 100)
        };
    }
    
    /**
     * Export nutrition logs to CSV
     * @param {Array<Record<string, any>>} nutritionLogs - Array of nutrition log entries
     * @returns {string} CSV string
     */
    exportToCSV(nutritionLogs) {
        const headers = ['date', 'recipeId', 'recipeName', 'servings', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
        
        const rows = nutritionLogs.map((log /** @type {NutritionLogEntry} */) => [
            log.date,
            log.recipeId,
            log.recipeName,
            log.servings,
            log.nutrition.calories,
            log.nutrition.protein,
            log.nutrition.carbs,
            log.nutrition.fat,
            log.nutrition.fiber,
            log.nutrition.sugar,
            log.nutrition.sodium
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map((row /** @type {string[]} */) => row.join(','))
        ].join('\n');
        
        return csvContent;
    }
    
    /**
     * Export nutrition logs to JSON
     * @param {NutritionLogEntry[]} nutritionLogs - Array of nutrition log entries
     * @returns {string} JSON string
     */
    exportToJSON(nutritionLogs) {
        return JSON.stringify(nutritionLogs, null, 2);
    }
    
    /**
     * Download nutrition data as file
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Export weekly nutrition to CSV
     */
    async exportWeeklyToCSV() {
        const weeklyData = await this.getWeeklyNutrition();
        const allLogs = weeklyData.flatMap(day => day.meals);
        const csv = this.exportToCSV(allLogs);
        const filename = `nutrition_export_${new Date().toISOString().split('T')[0]}.csv`;
        this.downloadFile(csv, filename, 'text/csv');
    }
    
    /**
     * Export weekly nutrition to JSON
     */
    async exportWeeklyToJSON() {
        const weeklyData = await this.getWeeklyNutrition();
        const allLogs = weeklyData.flatMap(day => day.meals);
        const json = this.exportToJSON(allLogs);
        const filename = `nutrition_export_${new Date().toISOString().split('T')[0]}.json`;
        this.downloadFile(json, filename, 'application/json');
    }
    
    /**
     * Get nutrition trends for the past week
     * @returns {Promise<Object>} Trend data
     */
    async getWeeklyTrends() {
        const weeklyData = await this.getWeeklyNutrition();
        
        const trends = {
            labels: weeklyData.map((day /** @type {WeeklyNutritionDay} */) => day.date),
            calories: weeklyData.map((day /** @type {WeeklyNutritionDay} */) => day.totals.calories),
            protein: weeklyData.map((day /** @type {WeeklyNutritionDay} */) => day.totals.protein),
            carbs: weeklyData.map((day /** @type {WeeklyNutritionDay} */) => day.totals.carbs),
            fat: weeklyData.map((day /** @type {WeeklyNutritionDay} */) => day.totals.fat),
            fiber: weeklyData.map((day /** @type {WeeklyNutritionDay} */) => day.totals.fiber)
        };
        
        return trends;
    }
    
    /**
     * Get average nutrition for the week
     * @returns {Promise<Object>} Average values
     */
    async getWeeklyAverages() {
        const weeklyData = await this.getWeeklyNutrition();
        const daysWithData = weeklyData.filter((day /** @type {WeeklyNutritionDay} */) => day.meals.length > 0);
        
        if (daysWithData.length === 0) {
            return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
        }
        
        const totals = daysWithData.reduce((acc, day /** @type {WeeklyNutritionDay} */) => ({
            calories: acc.calories + day.totals.calories,
            protein: acc.protein + day.totals.protein,
            carbs: acc.carbs + day.totals.carbs,
            fat: acc.fat + day.totals.fat,
            fiber: acc.fiber + day.totals.fiber
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
        
        return {
            calories: Math.round(totals.calories / daysWithData.length),
            protein: Math.round(totals.protein / daysWithData.length),
            carbs: Math.round(totals.carbs / daysWithData.length),
            fat: Math.round(totals.fat / daysWithData.length),
            fiber: Math.round(totals.fiber / daysWithData.length)
        };
    }
    
    /**
     * Check if nutrition goals are met for the day
     * @param {NutritionTotals} dailyTotals - Daily nutrition totals
     * @param {Partial<Record<keyof NutritionTotals, { min: number; max: number }>>} goals - Nutrition goals
     * @returns {{ calories: { met: boolean; status: string; value: number }; protein: { met: boolean; status: string; value: number }; carbs: { met: boolean; status: string; value: number }; fat: { met: boolean; status: string; value: number }; fiber: { met: boolean; status: string; value: number }; sodium?: { met: boolean; status: string; value: number }; sugar?: { met: boolean; status: string; value: number } }} Goal status
     */
    checkGoals(dailyTotals, goals = {}) {
        const defaultGoals = {
            calories: { min: 1800, max: 2200 },
            protein: { min: 45, max: 65 },
            carbs: { min: 200, max: 300 },
            fat: { min: 50, max: 80 },
            fiber: { min: 20, max: 35 }
        };
        
        const mergedGoals = { ...defaultGoals, ...goals };
        
        return {
            calories: {
                met: dailyTotals.calories >= mergedGoals.calories.min && dailyTotals.calories <= mergedGoals.calories.max,
                status: this.getGoalStatus(dailyTotals.calories, mergedGoals.calories),
                value: dailyTotals.calories
            },
            protein: {
                met: dailyTotals.protein >= mergedGoals.protein.min && dailyTotals.protein <= mergedGoals.protein.max,
                status: this.getGoalStatus(dailyTotals.protein, mergedGoals.protein),
                value: dailyTotals.protein
            },
            carbs: {
                met: dailyTotals.carbs >= mergedGoals.carbs.min && dailyTotals.carbs <= mergedGoals.carbs.max,
                status: this.getGoalStatus(dailyTotals.carbs, mergedGoals.carbs),
                value: dailyTotals.carbs
            },
            fat: {
                met: dailyTotals.fat >= mergedGoals.fat.min && dailyTotals.fat <= mergedGoals.fat.max,
                status: this.getGoalStatus(dailyTotals.fat, mergedGoals.fat),
                value: dailyTotals.fat
            },
            fiber: {
                met: (dailyTotals.fiber ?? 0) >= mergedGoals.fiber.min && (dailyTotals.fiber ?? 0) <= mergedGoals.fiber.max,
                status: this.getGoalStatus(dailyTotals.fiber ?? 0, mergedGoals.fiber),
                value: dailyTotals.fiber ?? 0
            }
        };
    }
    
    /**
     * Get goal status (under, on-track, over)
     * @param {number} value - Current value
     * @param {{ min: number; max: number }} goal - Goal range
     * @returns {string} Status
     */
    getGoalStatus(value, goal) {
        if (value < goal.min) return 'under';
        if (value > goal.max) return 'over';
        return 'on-track';
    }
    
    /**
     * Get meal history for calendar view
     * @param {number} days - Number of days to look back
     * @returns {Promise<Record<string, { meals: NutritionLogEntry[]; totals: NutritionTotals }>>} Calendar data
     */
    async getMealHistory(days = 30) {
        const allLogs = /** @type {NutritionLogEntry[]} */ (await this.db.getAll('nutritionLog'));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const recentLogs = allLogs.filter((log /** @type {NutritionLogEntry} */) => {
            const logDate = new Date(log.date);
            return logDate >= cutoffDate;
        });
        
        // Group by date
        /** @type {Record<string, { meals: NutritionLogEntry[]; totals: NutritionTotals }>} */
        const calendarData = {};
        recentLogs.forEach((log /** @type {NutritionLogEntry} */) => {
            if (!calendarData[log.date]) {
                calendarData[log.date] = {
                    meals: [],
                    totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
                };
            }
            
            calendarData[log.date].meals.push(log);
            
            // Add to totals
            /** @type {Array<'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium'>} */
            const keys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
            keys.forEach((key) => {
                calendarData[log.date].totals[key] += (log.nutrition[key] ?? 0);
            });
        });
        
        return calendarData;
    }
}

export default NutritionDashboard;
