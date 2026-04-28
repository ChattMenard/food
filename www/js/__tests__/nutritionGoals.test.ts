// @ts-check
/**
 * Nutrition Goals Manager Tests
 * Tests for persistent nutrition goal setting and progress calculation
 */

import {
  NutritionGoalsManager,
  DEFAULT_GOALS,
} from '../features/nutrition/nutritionGoals';

describe('NutritionGoalsManager', () => {
  let manager: NutritionGoalsManager;

  beforeEach(() => {
    manager = new NutritionGoalsManager();
  });

  describe('initialization', () => {
    it('should start with default goals', () => {
      const goals = manager.getGoals();
      expect(goals.calories).toBe(DEFAULT_GOALS.calories);
      expect(goals.protein).toBe(DEFAULT_GOALS.protein);
      expect(goals.carbs).toBe(DEFAULT_GOALS.carbs);
      expect(goals.fat).toBe(DEFAULT_GOALS.fat);
    });

    it('should not be loaded initially', () => {
      expect((manager as any).loaded).toBe(false);
    });
  });

  describe('goal updates', () => {
    it('should update specific goals', async () => {
      await manager.updateGoals({ calories: 1800, protein: 60 });

      const goals = manager.getGoals();
      expect(goals.calories).toBe(1800);
      expect(goals.protein).toBe(60);
      // Other goals unchanged
      expect(goals.carbs).toBe(DEFAULT_GOALS.carbs);
    });

    it('should merge partial updates', async () => {
      await manager.updateGoals({ calories: 1500 });

      const goals = manager.getGoals();
      expect(goals.calories).toBe(1500);
      expect(goals.protein).toBe(DEFAULT_GOALS.protein);
    });

    it('should validate goal values', async () => {
      await expect(manager.updateGoals({ calories: -100 })).rejects.toThrow('Invalid calorie goal');
      await expect(manager.updateGoals({ protein: -50 })).rejects.toThrow('Invalid protein goal');
      await expect(manager.updateGoals({ carbs: -30 })).rejects.toThrow('Invalid carb goal');
      await expect(manager.updateGoals({ fat: -20 })).rejects.toThrow('Invalid fat goal');
    });

    it('should persist goals to localStorage', async () => {
      await manager.updateGoals({ calories: 2000 });

      const saved = localStorage.getItem('nutrition-goals');
      const goals = JSON.parse(saved!);
      expect(goals.calories).toBe(2000);
    });

    it('should mark as loaded after update', async () => {
      await manager.updateGoals({ calories: 1800 });
      expect((manager as any).loaded).toBe(true);
    });
  });

  describe('progress calculation', () => {
    beforeEach(async () => {
      await manager.updateGoals({ calories: 2000, protein: 100, carbs: 250, fat: 65 });
    });

    it('should calculate daily progress', () => {
      const dailyIntake = {
        calories: 1500,
        protein: 80,
        carbs: 200,
        fat: 50
      };

      const progress = manager.calculateProgress(dailyIntake);

      expect(progress.calories).toBe(0.75); // 1500/2000
      expect(progress.protein).toBe(0.8); // 80/100
      expect(progress.carbs).toBe(0.8); // 200/250
      expect(progress.fat).toBe(0.77); // 50/65 ≈ 0.77
    });

    it('should handle zero goals', async () => {
      await manager.updateGoals({ calories: 0, protein: 50, carbs: 100, fat: 25 });

      const dailyIntake = { calories: 1000, protein: 25, carbs: 50, fat: 12 };
      const progress = manager.calculateProgress(dailyIntake);

      expect(progress.calories).toBe(0); // Division by zero handled
      expect(progress.protein).toBe(0.5);
    });

    it('should calculate weekly progress', () => {
      const weeklyIntake = [
        { calories: 1800, protein: 90, carbs: 220, fat: 60 },
        { calories: 2000, protein: 100, carbs: 250, fat: 65 },
        { calories: 1900, protein: 95, carbs: 235, fat: 62 },
        { calories: 2100, protein: 105, carbs: 260, fat: 68 },
        { calories: 1700, protein: 85, carbs: 210, fat: 57 },
        { calories: 1950, protein: 97, carbs: 242, fat: 63 },
        { calories: 1850, protein: 92, carbs: 228, fat: 61 }
      ];

      const progress = manager.calculateWeeklyProgress(weeklyIntake);

      expect(progress.calories).toBeCloseTo(0.95); // Average of daily progress
      expect(progress.protein).toBeCloseTo(0.95);
      expect(progress.carbs).toBeCloseTo(0.95);
      expect(progress.fat).toBeCloseTo(0.95);
    });

    it('should handle incomplete weekly data', () => {
      const weeklyIntake = [
        { calories: 1800, protein: 90, carbs: 220, fat: 60 },
        { calories: 2000, protein: 100, carbs: 250, fat: 65 },
        // Missing rest of week
      ];

      const progress = manager.calculateWeeklyProgress(weeklyIntake);

      expect(progress.calories).toBeCloseTo(0.95); // Based on available days
      expect(progress.protein).toBeCloseTo(0.95);
    });
  });

  describe('goal recommendations', () => {
    it('should recommend goals based on user profile', () => {
      const profile = {
        age: 30,
        gender: 'male',
        weight: 70, // kg
        height: 175, // cm
        activityLevel: 'moderate',
        goal: 'maintain'
      };

      const recommendations = manager.getRecommendations(profile);

      expect(recommendations).toHaveProperty('calories');
      expect(recommendations).toHaveProperty('protein');
      expect(recommendations).toHaveProperty('carbs');
      expect(recommendations).toHaveProperty('fat');
      expect(recommendations.calories).toBeGreaterThan(0);
    });

    it('should adjust for weight loss goals', () => {
      const profile = {
        age: 30,
        gender: 'female',
        weight: 65,
        height: 165,
        activityLevel: 'light',
        goal: 'lose'
      };

      const recommendations = manager.getRecommendations(profile);

      const maintainProfile = { ...profile, goal: 'maintain' };
      const maintainRecommendations = manager.getRecommendations(maintainProfile);

      expect(recommendations.calories).toBeLessThan(maintainRecommendations.calories);
    });

    it('should adjust for weight gain goals', () => {
      const profile = {
        age: 25,
        gender: 'male',
        weight: 60,
        height: 170,
        activityLevel: 'heavy',
        goal: 'gain'
      };

      const recommendations = manager.getRecommendations(profile);

      const maintainProfile = { ...profile, goal: 'maintain' };
      const maintainRecommendations = manager.getRecommendations(maintainProfile);

      expect(recommendations.calories).toBeGreaterThan(maintainRecommendations.calories);
    });

    it('should handle invalid profiles', () => {
      const invalidProfile = {
        age: -5,
        gender: 'unknown',
        weight: 0,
        height: 0,
        activityLevel: 'invalid',
        goal: 'invalid'
      };

      expect(() => manager.getRecommendations(invalidProfile as any)).not.toThrow();
    });
  });

  describe('goal tracking', () => {
    it('should track goal history', async () => {
      await manager.updateGoals({ calories: 1800 });
      await manager.updateGoals({ calories: 2000 });
      await manager.updateGoals({ calories: 2200 });

      const history = manager.getGoalHistory();

      expect(history).toHaveLength(3);
      expect(history[0].calories).toBe(1800);
      expect(history[1].calories).toBe(2000);
      expect(history[2].calories).toBe(2200);
    });

    it('should limit history size', async () => {
      // Add more than max history
      for (let i = 0; i < 15; i++) {
        await manager.updateGoals({ calories: 1500 + i * 10 });
      }

      const history = manager.getGoalHistory();

      expect(history.length).toBeLessThanOrEqual(10); // Max 10 entries
    });

    it('should include timestamps in history', async () => {
      const beforeUpdate = Date.now();
      await manager.updateGoals({ calories: 1800 });

      const history = manager.getGoalHistory();

      expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeUpdate);
      expect(history[0].timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('data persistence', () => {
    it('should load goals from localStorage', () => {
      const savedGoals = {
        calories: 1900,
        protein: 85,
        carbs: 240,
        fat: 62
      };

      localStorage.setItem('nutrition-goals', JSON.stringify(savedGoals));

      const newManager = new NutritionGoalsManager();
      const goals = newManager.getGoals();

      expect(goals.calories).toBe(1900);
      expect(goals.protein).toBe(85);
      expect(goals.carbs).toBe(240);
      expect(goals.fat).toBe(62);
    });

    it('should handle corrupted localStorage', () => {
      localStorage.setItem('nutrition-goals', 'invalid-json');

      const newManager = new NutritionGoalsManager();
      const goals = newManager.getGoals();

      // Should fall back to defaults
      expect(goals.calories).toBe(DEFAULT_GOALS.calories);
    });

    it('should clear localStorage on reset', async () => {
      await manager.updateGoals({ calories: 2000 });

      manager.reset();

      expect(localStorage.getItem('nutrition-goals')).toBeNull();
      
      const goals = manager.getGoals();
      expect(goals.calories).toBe(DEFAULT_GOALS.calories);
    });
  });

  describe('goal validation', () => {
    it('should validate calorie ranges', async () => {
      await expect(manager.updateGoals({ calories: 500 })).rejects.toThrow('Calories too low');
      await expect(manager.updateGoals({ calories: 10000 })).rejects.toThrow('Calories too high');
    });

    it('should validate macronutrient ratios', async () => {
      // Test extreme ratios
      await expect(manager.updateGoals({ calories: 2000, protein: 500 })).rejects.toThrow('Invalid macronutrient ratio');
      await expect(manager.updateGoals({ calories: 2000, fat: 200 })).rejects.toThrow('Invalid macronutrient ratio');
    });

    it('should ensure minimum protein requirements', async () => {
      await expect(manager.updateGoals({ calories: 2000, protein: 10 })).rejects.toThrow('Protein too low');
    });

    it('should validate total calories from macros', async () => {
      // Protein (4 cal/g) + Carbs (4 cal/g) + Fat (9 cal/g) should equal total calories
      await expect(manager.updateGoals({ 
        calories: 1000, 
        protein: 100, // 400 cal
        carbs: 100,  // 400 cal  
        fat: 100     // 900 cal
      })).rejects.toThrow('Macronutrient calories exceed total');
    });
  });

  describe('progress insights', () => {
    beforeEach(async () => {
      await manager.updateGoals({ calories: 2000, protein: 100, carbs: 250, fat: 65 });
    });

    it('should provide progress insights', () => {
      const dailyIntake = {
        calories: 1800,
        protein: 120,
        carbs: 200,
        fat: 70
      };

      const insights = manager.getProgressInsights(dailyIntake);

      expect(insights).toHaveProperty('summary');
      expect(insights).toHaveProperty('recommendations');
      expect(insights).toHaveProperty('achievements');
      expect(insights.summary.calories).toContain('under');
      expect(insights.summary.protein).toContain('over');
    });

    it('should identify achievements', () => {
      const dailyIntake = {
        calories: 2000, // Perfect
        protein: 100,   // Perfect
        carbs: 250,    // Perfect
        fat: 65        // Perfect
      };

      const insights = manager.getProgressInsights(dailyIntake);

      expect(insights.achievements).toContain('Perfect calorie intake');
      expect(insights.achievements).toContain('Perfect macronutrient balance');
    });

    it('should generate recommendations', () => {
      const dailyIntake = {
        calories: 1500, // Low
        protein: 60,   // Low
        carbs: 300,    // High
        fat: 40        // Low
      };

      const insights = manager.getProgressInsights(dailyIntake);

      expect(insights.recommendations).toContain('Increase calorie intake');
      expect(insights.recommendations).toContain('Increase protein intake');
      expect(insights.recommendations).toContain('Reduce carbohydrate intake');
    });
  });

  describe('edge cases', () => {
    it('should handle empty intake data', () => {
      const progress = manager.calculateProgress({});

      expect(progress.calories).toBe(0);
      expect(progress.protein).toBe(0);
      expect(progress.carbs).toBe(0);
      expect(progress.fat).toBe(0);
    });

    it('should handle negative intake values', () => {
      const progress = manager.calculateProgress({
        calories: -100,
        protein: -10,
        carbs: -20,
        fat: -5
      });

      expect(progress.calories).toBe(0);
      expect(progress.protein).toBe(0);
      expect(progress.carbs).toBe(0);
      expect(progress.fat).toBe(0);
    });

    it('should handle very large intake values', () => {
      const progress = manager.calculateProgress({
        calories: 10000,
        protein: 1000,
        carbs: 2000,
        fat: 500
      });

      expect(progress.calories).toBeGreaterThan(1);
      expect(progress.protein).toBeGreaterThan(1);
      expect(progress.carbs).toBeGreaterThan(1);
      expect(progress.fat).toBeGreaterThan(1);
    });
  });
});
