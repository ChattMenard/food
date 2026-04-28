// @ts-check
import { MealPlanTemplates } from '../../../features/plan/mealPlanTemplates.js';

jest.mock('../../../data/db.js', () => ({
  ready: Promise.resolve(),
  get: jest.fn(),
  put: jest.fn().mockResolvedValue()
}));

import db from '../../../data/db.js';

describe('MealPlanTemplates', () => {
  let templates;
  let mockGetMealPlan;
  let mockSetMealPlan;
  let mockPersistMealPlan;
  let mockGetRecipes;
  let mockAnnounce;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMealPlan = jest.fn();
    mockSetMealPlan = jest.fn();
    mockPersistMealPlan = jest.fn().mockResolvedValue();
    mockGetRecipes = jest.fn();
    mockAnnounce = jest.fn();

    templates = new MealPlanTemplates({
      getMealPlan: mockGetMealPlan,
      setMealPlan: mockSetMealPlan,
      persistMealPlan: mockPersistMealPlan,
      getRecipes: mockGetRecipes,
      announce: mockAnnounce
    });
  });

  describe('constructor', () => {
    it('stores dependencies', () => {
      expect(templates.getMealPlan).toBe(mockGetMealPlan);
      expect(templates.setMealPlan).toBe(mockSetMealPlan);
      expect(templates.persistMealPlan).toBe(mockPersistMealPlan);
      expect(templates.getRecipes).toBe(mockGetRecipes);
      expect(templates.announce).toBe(mockAnnounce);
    });

    it('initializes customTemplates as empty object', () => {
      expect(templates.customTemplates).toEqual({});
    });

    it('calls loadCustomTemplates on construction', async () => {
      db.get.mockResolvedValue({ 'My Template': { Monday: 'Pasta' } });
      new MealPlanTemplates({
        getMealPlan: mockGetMealPlan,
        setMealPlan: mockSetMealPlan,
        persistMealPlan: mockPersistMealPlan,
        getRecipes: mockGetRecipes,
        announce: mockAnnounce
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(db.get).toHaveBeenCalledWith('preferences', 'mealPlanTemplates');
    });
  });

  describe('loadCustomTemplates', () => {
    it('loads custom templates from IndexedDB', async () => {
      db.get.mockResolvedValue({ 'My Template': { Monday: 'Pasta' } });
      await templates.loadCustomTemplates();
      expect(templates.customTemplates).toEqual({ 'My Template': { Monday: 'Pasta' } });
    });

    it('sets empty object if no saved templates', async () => {
      db.get.mockResolvedValue(null);
      await templates.loadCustomTemplates();
      expect(templates.customTemplates).toEqual({});
    });

    it('handles errors gracefully', async () => {
      db.get.mockRejectedValue(new Error('DB error'));
      await templates.loadCustomTemplates();
      expect(templates.customTemplates).toEqual({});
    });
  });

  describe('saveCustomTemplates', () => {
    it('saves custom templates to IndexedDB', async () => {
      templates.customTemplates = { 'My Template': { Monday: 'Pasta' } };
      await templates.saveCustomTemplates();
      expect(db.put).toHaveBeenCalledWith('preferences', {
        'My Template': { Monday: 'Pasta' },
        key: 'mealPlanTemplates'
      });
    });

    it('handles errors gracefully', async () => {
      db.put.mockRejectedValue(new Error('Save error'));
      await expect(templates.saveCustomTemplates()).resolves.not.toThrow();
    });
  });

  describe('getAvailableTemplates', () => {
    it('returns default templates', () => {
      const available = templates.getAvailableTemplates();
      expect(available).toHaveProperty('Quick Week');
      expect(available).toHaveProperty('Healthy Balanced');
      expect(available).toHaveProperty('Budget Friendly');
    });

    it('includes custom templates', () => {
      templates.customTemplates = { 'My Template': { Monday: 'Pasta' } };
      const available = templates.getAvailableTemplates();
      expect(available).toHaveProperty('My Template');
      expect(available['My Template']).toEqual({ Monday: 'Pasta' });
    });

    it('merges default and custom templates', () => {
      templates.customTemplates = { 'My Template': { Monday: 'Pasta' } };
      const available = templates.getAvailableTemplates();
      expect(available).toHaveProperty('Quick Week');
      expect(available).toHaveProperty('My Template');
    });
  });

  describe('applyTemplate', () => {
    it('applies default template to meal plan', async () => {
      const result = await templates.applyTemplate('Quick Week');
      expect(mockSetMealPlan).toHaveBeenCalledWith(expect.objectContaining({
        Monday: 'Quick Pasta',
        Tuesday: 'Easy Stir Fry'
      }));
      expect(mockPersistMealPlan).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Applied Quick Week template');
      expect(result).toBe(true);
    });

    it('applies custom template to meal plan', async () => {
      templates.customTemplates = { 'My Template': { Monday: 'Pasta' } };
      const result = await templates.applyTemplate('My Template');
      expect(mockSetMealPlan).toHaveBeenCalledWith({ Monday: 'Pasta' });
      expect(mockPersistMealPlan).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Applied My Template template');
      expect(result).toBe(true);
    });

    it('returns false if template not found', async () => {
      const result = await templates.applyTemplate('Nonexistent Template');
      expect(mockSetMealPlan).not.toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Template not found');
      expect(result).toBe(false);
    });
  });

  describe('saveAsTemplate', () => {
    it('saves current meal plan as custom template', async () => {
      mockGetMealPlan.mockReturnValue({ Monday: 'Pasta', Tuesday: 'Tacos' });
      const result = await templates.saveAsTemplate('My Template');
      expect(templates.customTemplates['My Template']).toEqual({ Monday: 'Pasta', Tuesday: 'Tacos' });
      expect(db.put).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Saved meal plan as template: My Template');
      expect(result).toBe(true);
    });
  });

  describe('deleteTemplate', () => {
    it('deletes custom template', async () => {
      templates.customTemplates = { 'My Template': { Monday: 'Pasta' } };
      const result = await templates.deleteTemplate('My Template');
      expect(templates.customTemplates).not.toHaveProperty('My Template');
      expect(db.put).toHaveBeenCalled();
      expect(mockAnnounce).toHaveBeenCalledWith('Deleted template: My Template');
      expect(result).toBe(true);
    });

    it('returns false for default templates', async () => {
      const result = await templates.deleteTemplate('Quick Week');
      expect(mockAnnounce).toHaveBeenCalledWith('Cannot delete default template');
      expect(result).toBe(false);
    });

    it('does not delete default template from customTemplates', async () => {
      const result = await templates.deleteTemplate('Quick Week');
      expect(result).toBe(false);
      expect(db.put).not.toHaveBeenCalled();
    });
  });
});
