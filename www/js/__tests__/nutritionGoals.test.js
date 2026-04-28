// @ts-check
/**
 * Nutrition Goals Manager Tests
 * Tests for persistent nutrition goal setting and progress calculation
 */

import {
  NutritionGoalsManager,
  DEFAULT_GOALS,
} from '../features/nutrition/nutritionGoals.js';

describe('NutritionGoalsManager', () => {
  let manager;

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
      expect(manager.loaded).toBe(false);
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
  });

  describe('presets', () => {
    it('should apply preset goals', async () => {
      await manager.setPreset('keto');

      const goals = manager.getGoals();
      expect(goals.carbs).toBe(25);
      expect(goals.fat).toBe(165);
    });

    it('should throw for unknown preset', async () => {
      await expect(manager.setPreset('unknown')).rejects.toThrow(
        'Unknown preset'
      );
    });

    it('should list available presets', () => {
      const presets = manager.getPresets();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some((p) => p.id === 'balanced')).toBe(true);
      expect(presets.some((p) => p.id === 'keto')).toBe(true);
    });

    it('should format preset names', () => {
      expect(manager.formatPresetName('balanced')).toBe('Balanced Diet');
      expect(manager.formatPresetName('lowCarb')).toBe('Low Carb');
      expect(manager.formatPresetName('highProtein')).toBe('High Protein');
    });
  });

  describe('reset to defaults', () => {
    it('should reset all goals to defaults', async () => {
      await manager.updateGoals({ calories: 1500, protein: 100 });
      await manager.resetToDefaults();

      const goals = manager.getGoals();
      expect(goals.calories).toBe(DEFAULT_GOALS.calories);
      expect(goals.protein).toBe(DEFAULT_GOALS.protein);
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress percentages', () => {
      const actual = {
        calories: 1000,
        protein: 30,
        carbs: 150,
        fat: 50,
        fiber: 15,
        sugar: 30,
        sodium: 1500,
      };

      const progress = manager.calculateProgress(actual);

      // Target nutrients: 50% of goal
      expect(progress.calories.percent).toBe(50);
      expect(progress.protein.percent).toBe(60); // 30/50
      expect(progress.carbs.percent).toBe(60); // 150/250

      // Max limit nutrients
      expect(progress.sugar.percent).toBe(60); // 30/50
      expect(progress.sugar.status).toBe('good'); // 60% < 80% threshold
    });

    it('should cap progress at 100%', () => {
      const actual = { calories: 5000 };
      const progress = manager.calculateProgress(actual);
      expect(progress.calories.percent).toBe(100);
    });

    it('should handle zero goals', () => {
      manager.currentGoals.calories = 0;
      const progress = manager.calculateProgress({ calories: 500 });
      expect(progress.calories.percent).toBe(0);
    });

    it('should assign correct status', () => {
      const progress = manager.calculateProgress({
        calories: 1900, // 95% - good
        protein: 30, // 60% - warning
        sugar: 60, // 120% - over
      });

      expect(progress.calories.status).toBe('good');
      expect(progress.protein.status).toBe('under'); // 60% < 70%
      expect(progress.sugar.status).toBe('over');
    });
  });

  describe('pub-sub', () => {
    it('should notify subscribers on update', async () => {
      const callback = jest.fn();
      manager.subscribe(callback);

      await manager.updateGoals({ calories: 1500 });

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0].calories).toBe(1500);
    });

    it('should allow unsubscribing', async () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe(callback);

      unsubscribe();
      await manager.updateGoals({ calories: 1500 });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
